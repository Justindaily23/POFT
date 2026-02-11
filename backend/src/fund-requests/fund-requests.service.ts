import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFundRequestDto } from './dto/create-fund-request.dto';
import { ApproveFundRequestDto, ApprovalAction } from './dto/approve-fund-request.dto';
import { FundRequestResponseDto } from './dto/fund-request-response.dto';
import {
  NotificationType,
  FundRequestStatus,
  AuthRole,
  Prisma,
  FundRequest,
  PurchaseOrderLine,
  PurchaseOrder,
} from '@prisma/client';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { POLineSearchResponseDto } from './dto/po-search-response.dto';
import { NotificationsService } from 'src/notifications/notifications.service';

/** Extended type to include nested relations */
type FundRequestWithRelations = FundRequest & {
  purchaseOrderLine: PurchaseOrderLine & {
    purchaseOrder: PurchaseOrder;
  };
};

/** Payload for the notifications queue */
interface NotificationJobPayload {
  // userId: string;
  // type: NotificationType;
  // payload: Record<string, unknown>;
  // fundRequestId: string;
  notificationId: string;
}

@Injectable()
export class FundRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue<NotificationJobPayload>,
  ) {}

  /** PREFILL: Fetch PO Lines for PM form */
  async fetchFundRequestData(query: string): Promise<POLineSearchResponseDto[]> {
    const pos = await this.prisma.purchaseOrder.findMany({
      where: {
        OR: [
          { duid: { contains: query, mode: 'insensitive' } },
          { poNumber: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: { poLines: true },
      orderBy: { createdAt: 'desc' },
    });

    return pos.flatMap((po) =>
      po.poLines.map((line) => ({
        poLineId: line.id,
        duid: po.duid,
        poNumber: po.poNumber ?? null,
        prNumber: po.prNumber ?? null,
        poLineNumber: line.poLineNumber ?? null,
        itemDescription: line.itemDescription ?? null,
        projectName: po.projectName ?? null,
        projectCode: po.projectCode ?? null,
        itemCode: line.itemCode ?? null,
        unitPrice: line.unitPrice?.toNumber() ?? null,
        requestedQuantity: line.requestedQuantity ?? null,
        poLineAmount: line.poLineAmount?.toNumber() ?? null,
        poTypeId: line.poTypeId ?? null,
        pm: line.pm ?? null,
        pmId: line.pmId ?? null,
        requestedAmount: 0,
        poIssuedDate: line.poIssuedDate ?? null,
        contractAmount: line.contractAmount?.toNumber() ?? null,
        cumulativeApprovedAmount: line.totalApprovedAmount?.toNumber() ?? 0,
        remainingBalance: line.remainingBalance?.toNumber() ?? 0,
        isNegotiationRequired: line.contractAmount === null,
      })),
    );
  }

  /** CREATE FUND REQUEST */
  async createFundRequest(dto: CreateFundRequestDto, userId: string): Promise<FundRequestResponseDto> {
    if (dto.requestedAmount <= 0) {
      throw new BadRequestException('Requested amount must be greater than 0');
    }

    const isManual =
      !dto.poNumber || !dto.poLineNumber || dto.poNumber === 'TEMP-PO' || dto.poLineNumber === 'TEMP-LINE';

    const fundRequest = await this.prisma.$transaction(async (tx) => {
      // Ensure PO exists
      const po = await tx.purchaseOrder.upsert({
        where: { duid_poNumber: { duid: dto.duid.trim(), poNumber: dto.poNumber?.trim() ?? 'TEMP-PO' } },
        create: {
          duid: dto.duid.trim(),
          poNumber: dto.poNumber?.trim(),
          projectName: dto.projectName,
          projectCode: dto.projectCode,
          prNumber: dto.prNumber,
        },
        update: {},
      });

      // Ensure PO Line exists
      const poLine = await tx.purchaseOrderLine.upsert({
        where: {
          purchaseOrderId_poLineNumber: {
            purchaseOrderId: po.id,
            poLineNumber: dto.poLineNumber?.trim() ?? 'TEMP-LINE',
          },
        },
        create: {
          purchaseOrderId: po.id,
          poLineNumber: dto.poLineNumber?.trim(),
          pm: dto.pm,
          pmId: dto.pmId,
          itemCode: dto.itemCode,
          itemDescription: dto.itemDescription,
          unitPrice: dto.unitPrice,
          requestedQuantity: dto.requestedQuantity,
          poLineAmount: dto.poLineAmount,
          poIssuedDate: dto.poIssuedDate,
          contractAmount: null,
          totalApprovedAmount: new Prisma.Decimal(0),
          remainingBalance: new Prisma.Decimal(0),
        },
        update: {},
      });

      // Validate against contract if exists
      const aggregate = await tx.fundRequest.aggregate({
        where: {
          purchaseOrderLineId: poLine.id,
          status: { in: [FundRequestStatus.PENDING, FundRequestStatus.APPROVED] },
        },
        _sum: { requestedAmount: true },
      });

      // Cumulative of funds requested
      const cumulativeRequested = (aggregate._sum.requestedAmount ?? new Prisma.Decimal(0)).plus(dto.requestedAmount);

      // Throw infor if contract amount is exceeded
      if (poLine.contractAmount && cumulativeRequested.gt(poLine.contractAmount)) {
        throw new BadRequestException(
          `Request exceeds contract. Total: ${cumulativeRequested.toFixed(2)}, Max: ${poLine.contractAmount.toFixed(2)}`,
        );
      }

      // Create Fund request whose source is either manual if no data exists in the database or structured if it exists in database.
      return tx.fundRequest.create({
        data: {
          purchaseOrderLineId: poLine.id,
          requestedAmount: dto.requestedAmount,
          requestPurpose: dto.requestPurpose,
          requestedBy: userId,
          source: isManual ? 'MANUAL' : 'STRUCTURED',
        },
        include: { purchaseOrderLine: { include: { purchaseOrder: true } } },
      }) as Promise<FundRequestWithRelations>;
    });

    // Notify Admins // Create Notification for all admins
    const admins = await this.prisma.user.findMany({
      where: { role: AuthRole.SUPER_ADMIN },
      select: { id: true },
    });

    if (admins.length === 0) {
      return this.mapToResponseDto(fundRequest);
    }

    const payload = {
      duid: dto.duid,
      projectCode: dto.projectCode,
      projectName: dto.projectName,
      prNumber: dto.prNumber,
      poLineAmount: dto.poLineAmount,
      itemDescription: dto.itemDescription,
      requestPurpose: dto.requestPurpose,
      pm: dto.pm,
      requestedAmount: dto.requestedAmount,
      poIssuedDate: dto.poIssuedDate,
      contractAmount: dto.contractAmount,
      isNegotiation: fundRequest.purchaseOrderLine.contractAmount === null,
      requestedAt: fundRequest.createdAt,
      requestedBy: fundRequest.requestedBy,
    };

    await Promise.all(
      admins.map((admin) =>
        this.notificationsService.notify(admin.id, NotificationType.FUND_REQUEST_CREATED, payload, fundRequest.id),
      ),
    );

    return this.mapToResponseDto(fundRequest);
  }

  /** APPROVE / REJECT FUND REQUEST */
  async approveOrRejectFundRequest(
    fundRequestId: string,
    dto: ApproveFundRequestDto & { setContractAmount?: number },
    adminId: string,
  ): Promise<FundRequestResponseDto> {
    const { action, rejectionReason, setContractAmount } = dto;

    const fundRequest = await this.prisma.$transaction(async (tx) => {
      const request = await tx.fundRequest.findUnique({
        where: { id: fundRequestId },
        include: { purchaseOrderLine: { include: { purchaseOrder: true } } },
      });

      if (!request) throw new NotFoundException('Fund request not found');
      if (request.status !== FundRequestStatus.PENDING) {
        throw new BadRequestException('Request already processed');
      }

      const poLine = request.purchaseOrderLine;

      // Handle rejection
      if (action === ApprovalAction.REJECT) {
        return tx.fundRequest.update({
          where: { id: fundRequestId },
          data: {
            status: FundRequestStatus.REJECTED,
            rejectionReason,
            approvedBy: adminId,
            approvedAt: new Date(),
          },
          include: { purchaseOrderLine: { include: { purchaseOrder: true } } },
        }) as Promise<FundRequestWithRelations>;
      }

      // Handle approval
      // let activeContract = poLine.contractAmount ?? new Prisma.Decimal(setContractAmount ?? 0);
      if (!poLine.contractAmount && setContractAmount == null) {
        throw new BadRequestException('Contract amount must be provided before approving the first fund request');
      }

      const activeContract = poLine.contractAmount ?? new Prisma.Decimal(setContractAmount!);

      // If no contract exists, create a contract amendment
      if (!poLine.contractAmount) {
        await tx.contractAmendment.create({
          data: {
            purchaseOrderLineId: poLine.id,
            oldAmount: new Prisma.Decimal(0),
            newAmount: activeContract,
            reason: 'Initial contract establishment',
            approvedBy: adminId,
          },
        });

        await tx.purchaseOrderLine.update({
          where: { id: poLine.id },
          data: { contractAmount: activeContract, remainingBalance: activeContract },
        });
      }

      // Validate against contract
      const aggregate = await tx.fundRequest.aggregate({
        where: {
          purchaseOrderLineId: poLine.id,
          id: { not: fundRequestId },
          status: FundRequestStatus.APPROVED,
        },
        _sum: { requestedAmount: true },
      });

      const totalWithCurrent = (aggregate._sum.requestedAmount ?? new Prisma.Decimal(0)).plus(request.requestedAmount);

      if (totalWithCurrent.gt(activeContract)) {
        throw new BadRequestException('Approval exceeds contract limit.');
      }

      // Approve request
      const approved = await tx.fundRequest.update({
        where: { id: fundRequestId },
        data: { status: FundRequestStatus.APPROVED, approvedBy: adminId, approvedAt: new Date() },
        include: { purchaseOrderLine: { include: { purchaseOrder: true } } },
      });

      // Optimistic concurrency update on PO Line balances
      const newTotalApproved = poLine.totalApprovedAmount.plus(request.requestedAmount);
      const updateResult = await tx.purchaseOrderLine.updateMany({
        where: { id: poLine.id, totalApprovedAmount: poLine.totalApprovedAmount },
        data: { totalApprovedAmount: newTotalApproved, remainingBalance: activeContract.minus(newTotalApproved) },
      });

      if (updateResult.count !== 1) {
        throw new ConflictException('The record was updated by another user. Please try again.');
      }

      approved.purchaseOrderLine.totalApprovedAmount = newTotalApproved;
      approved.purchaseOrderLine.contractAmount = activeContract;
      approved.purchaseOrderLine.remainingBalance = activeContract.minus(newTotalApproved);

      return approved as FundRequestWithRelations;
    });

    const payload: Prisma.JsonObject =
      fundRequest.status === FundRequestStatus.APPROVED
        ? {
            duid: fundRequest.purchaseOrderLine.purchaseOrder.duid,
            poNumber: fundRequest.purchaseOrderLine.purchaseOrder.poNumber,
            poLineNumber: fundRequest.purchaseOrderLine.poLineNumber,
            status: fundRequest.status,
            requestedAmount: fundRequest.requestedAmount.toNumber(),
            remainingBalance: fundRequest.purchaseOrderLine.remainingBalance.toNumber(),
            contractAmount: fundRequest.purchaseOrderLine.contractAmount?.toNumber() ?? null,
            requestPurpose: fundRequest.requestPurpose,
          }
        : {
            duid: fundRequest.purchaseOrderLine.purchaseOrder.duid,
            poNumber: fundRequest.purchaseOrderLine.purchaseOrder.poNumber,
            poLineNumber: fundRequest.purchaseOrderLine.poLineNumber,
            status: fundRequest.status,
            requestedAmount: fundRequest.requestedAmount.toNumber(),
            requestPurpose: fundRequest.requestPurpose,
            rejectionReason: fundRequest.rejectionReason ?? 'N/A',
          };

    //Save Notification in the database
    await this.notificationsService.notify(
      fundRequest.requestedBy,
      fundRequest.status === FundRequestStatus.APPROVED
        ? NotificationType.FUND_REQUEST_APPROVED
        : NotificationType.FUND_REQUEST_REJECTED,
      payload,
      fundRequest.id,
    );

    return this.mapToResponseDto(fundRequest);
  }

  // src/fund-requests/fund-requests.service.ts

  async getFundRequestHistory(userId: string): Promise<FundRequestResponseDto[]> {
    const history = await this.prisma.fundRequest.findMany({
      where: { requestedBy: userId },
      include: {
        purchaseOrderLine: {
          include: {
            purchaseOrder: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Reuse your existing mapToResponseDto helper
    return history.map((req) => this.mapToResponseDto(req as FundRequestWithRelations));
  }

  /** MAP: DB -> DTO */
  private mapToResponseDto(item: FundRequestWithRelations): FundRequestResponseDto {
    const poLine = item.purchaseOrderLine;
    const po = poLine.purchaseOrder;

    const toNumber = (val: Prisma.Decimal) => Number(val.toFixed(2));

    const toNumberOrZero = (val: Prisma.Decimal | null) => (val ? Number(val.toFixed(2)) : 0);
    return {
      // ✅ Correct identity
      poLineId: poLine.id,

      status: item.status,
      requestedAmount: toNumber(item.requestedAmount),
      requestPurpose: item.requestPurpose,

      contractAmount: poLine.contractAmount ? toNumber(poLine.contractAmount) : null,

      cumulativeApprovedAmount: toNumberOrZero(poLine.totalApprovedAmount),

      remainingBalance: toNumberOrZero(poLine.remainingBalance),

      isNegotiationRequired: poLine.contractAmount === null,

      duid: po.duid,
      poNumber: po.poNumber,
      prNumber: po.prNumber,
      projectName: po.projectName,
      projectCode: po.projectCode,

      poLineNumber: poLine.poLineNumber,
      poTypeId: poLine.poTypeId,
      itemCode: poLine.itemCode,
      itemDescription: poLine.itemDescription,

      unitPrice: poLine.unitPrice ? toNumber(poLine.unitPrice) : null,

      requestedQuantity: poLine.requestedQuantity,

      poLineAmount: poLine.poLineAmount ? toNumber(poLine.poLineAmount) : null,

      poIssuedDate: poLine.poIssuedDate,
      pm: poLine.pm,
      pmId: poLine.pmId,

      createdAt: item.createdAt,
    };
  }
}
