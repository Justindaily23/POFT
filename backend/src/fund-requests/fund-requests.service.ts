import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
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
import { FullFundRequestPayload } from '@/notifications/types/notification-payload.interface';
import { logger } from '@/common/logger/logger';

/** Extended type to include nested relations */
type FundRequestWithRelations = FundRequest & {
  purchaseOrderLine: PurchaseOrderLine & {
    purchaseOrder: PurchaseOrder;
  };
};

/** Payload for the notifications queue */
interface NotificationJobPayload {
  notificationId: string;
}

interface FundRequestFilters {
  query?: string;
  status?: string;
  poNumber?: string;
  poLineNumber?: string;
  duid?: string;
  pm?: string;
  fromDate?: string;
  toDate?: string;
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

        // Fix: Use optional chaining + fallback for ALL decimal fields
        contractAmount: line.contractAmount?.toNumber() ?? null,
        cumulativeApprovedAmount: line.totalApprovedAmount?.toNumber() ?? 0,
        totalRequestedAmount: line.totalRequestedAmount?.toNumber() ?? 0, // Added ?
        totalRejectedAmount: line.totalRejectedAmount?.toNumber() ?? 0, // Added ?
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
      // 1. Upsert PO
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

      // 2. Upsert PO Line
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
          totalRequestedAmount: new Prisma.Decimal(0),
          totalRejectedAmount: new Prisma.Decimal(0),
          totalApprovedAmount: new Prisma.Decimal(0),
          remainingBalance: new Prisma.Decimal(0),
        },
        update: {},
      });

      // 3. Validate against contract
      const aggregate = await tx.fundRequest.aggregate({
        where: {
          purchaseOrderLineId: poLine.id,
          status: { in: [FundRequestStatus.PENDING, FundRequestStatus.APPROVED] },
        },
        _sum: { requestedAmount: true },
      });

      const cumulativeRequested = (aggregate._sum.requestedAmount ?? new Prisma.Decimal(0)).plus(dto.requestedAmount);

      // ✅ Safe Error Message: Check if contractAmount exists before calling .toFixed()
      if (poLine.contractAmount && cumulativeRequested.gt(poLine.contractAmount)) {
        const maxStr = poLine.contractAmount ? poLine.contractAmount.toFixed(2) : '0.00';
        throw new BadRequestException(
          `Request exceeds contract. Total: ${cumulativeRequested.toFixed(2)}, Max: ${maxStr}`,
        );
      }

      // 4. Create Fund Request
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

    // 5. Notify Admins
    const admins = await this.prisma.user.findMany({
      where: { role: AuthRole.SUPER_ADMIN },
      select: { id: true },
    });

    if (admins.length > 0) {
      // ✅ Explicitly type the payload to catch missing fields early
      const payload: FullFundRequestPayload = {
        // 1. ADD THE DISCRIMINATOR TAG
        type: NotificationType.FUND_REQUEST_CREATED,

        duid: dto.duid,
        projectCode: dto.projectCode,
        projectName: dto.projectName,
        prNumber: dto.prNumber,
        poNumber: dto.poNumber,
        poLineAmount: Number(dto.poLineAmount) || 0,
        poLineNumber: dto.poLineNumber,
        itemDescription: dto.itemDescription,
        requestPurpose: dto.requestPurpose,
        pm: dto.pm,
        requestedAmount: Number(dto.requestedAmount),
        poIssuedDate: dto.poIssuedDate,
        contractAmount: fundRequest.purchaseOrderLine.contractAmount?.toNumber() ?? null,
        isNegotiation: fundRequest.purchaseOrderLine.contractAmount === null,
        requestedAt: fundRequest.createdAt,
        requestedBy: fundRequest.requestedBy,
      };

      void Promise.all(
        admins.map((admin) =>
          this.notificationsService.notify(admin.id, NotificationType.FUND_REQUEST_CREATED, payload, fundRequest.id),
        ),
      ).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unknown notification error';
        logger.error(`[Admin Notification Failed] Request ${fundRequest.id}: ${message}`);
      });
    }

    // ✅ Ensure mapToResponseDto also uses safeNumber helpers internally
    return this.mapToResponseDto(fundRequest);
  }

  /**
   * APPROVE / REJECT FUND REQUEST
   * Step 1: Rejection -> Immediate stop.
   * Step 2: Contract Setup -> Saves amount, remains PENDING, returns early.
   * Step 3: Final Approval -> Only reached if contract exists and no new amount is passed.
   */
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

      // 1️⃣ REJECTION: Handle and return immediately
      if (action === ApprovalAction.REJECT) {
        return this.handleRejection(tx, request, rejectionReason, adminId);
      }

      // 2️⃣ CONTRACT SETUP: If admin provides an amount for a line without a contract
      if (setContractAmount != null) {
        return this.handleContractSetup(tx, request, setContractAmount);
      }

      // 3️⃣ FINAL APPROVAL: Reached only if no contract amount was passed in this request
      return this.handleApproval(tx, request, adminId);
    });

    // 🛡️ Safety check to satisfy TypeScript and prevent runtime crashes
    if (!fundRequest) {
      throw new InternalServerErrorException('Failed to process fund request transaction.');
    }

    const freshRequest = await this.prisma.fundRequest.findUnique({
      where: { id: fundRequest.id },
      include: { purchaseOrderLine: { include: { purchaseOrder: true } } },
    });

    if (fundRequest.status !== FundRequestStatus.PENDING) {
      const isApproved = fundRequest.status === FundRequestStatus.APPROVED;

      // 💡 Create shortcuts for cleaner code
      const poLine = fundRequest.purchaseOrderLine;
      const po = poLine.purchaseOrder;
      try {
        await this.notificationsService.notify(
          fundRequest.requestedBy,
          isApproved ? NotificationType.FUND_REQUEST_APPROVED : NotificationType.FUND_REQUEST_REJECTED,
          isApproved
            ? {
                type: NotificationType.FUND_REQUEST_APPROVED,
                duid: po.duid,
                poNumber: po.poNumber ?? undefined,
                projectName: po.projectName ?? undefined,
                projectCode: po.projectCode ?? undefined,
                pm: poLine.pm ?? undefined,
                itemDescription: poLine.itemDescription ?? undefined,
                status: fundRequest.status,
                requestedAmount: (fundRequest.requestedAmount ?? new Prisma.Decimal(0)).toNumber(),
                contractAmount: (poLine.contractAmount ?? new Prisma.Decimal(0)).toNumber(),
                remainingBalance: (poLine.remainingBalance ?? new Prisma.Decimal(0)).toNumber(),
                poLineNumber: poLine.poLineNumber ?? undefined,
              }
            : {
                type: NotificationType.FUND_REQUEST_REJECTED,
                duid: po.duid,
                poNumber: po.poNumber ?? undefined,
                projectName: po.projectName ?? undefined,
                pm: poLine.pm ?? undefined,
                itemDescription: poLine.itemDescription ?? undefined,
                status: fundRequest.status,
                requestedAmount: (fundRequest.requestedAmount ?? new Prisma.Decimal(0)).toNumber(),
                rejectionReason: fundRequest.rejectionReason ?? 'No reason provided',
                poLineNumber: poLine.poLineNumber ?? undefined,
              },
          fundRequest.id,
        );
      } catch (err: unknown) {
        // Log background failures without interrupting the main user response
        const message = err instanceof Error ? err.message : 'Unknown notification error';
        logger.error(`[Notification Error] Request ${fundRequest.id}: ${message}`);
      }
    }

    // 3. Map to DTO for the frontend
    return this.mapToResponseDto(fundRequest);
  }

  private async handleContractSetup(
    tx: Prisma.TransactionClient,
    request: FundRequestWithRelations,
    setContractAmount: number,
  ) {
    const poLine = request.purchaseOrderLine;

    if (poLine.contractAmount) {
      throw new BadRequestException('Contract already exists');
    }

    if (setContractAmount <= 0) {
      throw new BadRequestException('Contract amount must be greater than zero');
    }

    const contract = new Prisma.Decimal(setContractAmount);

    await tx.purchaseOrderLine.update({
      where: { id: poLine.id },
      data: {
        contractAmount: contract,
        remainingBalance: contract,
      },
    });

    // ⛔ IMPORTANT: DO NOT TOUCH FUND REQUEST STATUS
    return await tx.fundRequest.findUnique({
      where: { id: request.id },
      include: { purchaseOrderLine: { include: { purchaseOrder: true } } },
    });
  }

  private async handleApproval(tx: Prisma.TransactionClient, request: FundRequestWithRelations, adminId: string) {
    const poLine = request.purchaseOrderLine;

    if (!poLine.contractAmount) {
      throw new BadRequestException({
        message: 'Contract amount required',
        requiresContract: true,
        poLineId: poLine.id,
      });
    }

    const activeContract = poLine.contractAmount;

    // 1. Calculate current usage
    const aggregate = await tx.fundRequest.aggregate({
      where: {
        purchaseOrderLineId: poLine.id,
        id: { not: request.id },
        status: FundRequestStatus.APPROVED,
      },
      _sum: { requestedAmount: true },
    });

    const used = aggregate._sum.requestedAmount ?? new Prisma.Decimal(0);
    const totalWithCurrent = used.plus(request.requestedAmount);

    // 2. Limit Check
    if (totalWithCurrent.gt(activeContract)) {
      throw new BadRequestException('Approval exceeds contract limit.');
    }

    // 3. Update Request Status
    const approved = await tx.fundRequest.update({
      where: { id: request.id },
      data: {
        status: FundRequestStatus.APPROVED,
        approvedBy: adminId,
        approvedAt: new Date(),
      },
      include: { purchaseOrderLine: { include: { purchaseOrder: true } } },
    });

    // 4. Update PO Line Balances
    const currentApproved = poLine.totalApprovedAmount ?? new Prisma.Decimal(0);
    const currentRequested = poLine.totalRequestedAmount ?? new Prisma.Decimal(0);

    const nextApprovedTotal = currentApproved.plus(request.requestedAmount);

    // Use updateMany for a concurrency safe-guard
    const updateResult = await tx.purchaseOrderLine.updateMany({
      where: {
        id: poLine.id,
        totalApprovedAmount: poLine.totalApprovedAmount, // Concurrency check
      },
      data: {
        totalApprovedAmount: nextApprovedTotal,
        totalRequestedAmount: currentRequested.plus(request.requestedAmount),
        remainingBalance: activeContract.minus(nextApprovedTotal),
      },
    });

    if (updateResult.count !== 1) {
      throw new ConflictException('The record was updated by another user. Please try again.');
    }

    return approved;
  }

  private async handleRejection(
    tx: Prisma.TransactionClient,
    request: FundRequestWithRelations,
    rejectionReason: string | undefined,
    adminId: string,
  ) {
    const poLine = request.purchaseOrderLine;

    // 1. Update the individual fund request status
    const rejected = await tx.fundRequest.update({
      where: { id: request.id },
      data: {
        status: FundRequestStatus.REJECTED,
        rejectionReason: rejectionReason?.trim() || 'N/A',
        rejectedBy: adminId,
        rejectedAt: new Date(),
      },
      include: { purchaseOrderLine: { include: { purchaseOrder: true } } },
    });

    // 2. Increment the totalRejectedAmount on the associated PO line
    // Use fallback to 0 to prevent "plus" crashes on null database values
    const currentRejected = poLine.totalRejectedAmount ?? new Prisma.Decimal(0);

    await tx.purchaseOrderLine.update({
      where: { id: poLine.id },
      data: {
        totalRejectedAmount: currentRejected.plus(request.requestedAmount),
      },
    });

    return rejected;
  }

  // for admins
  async getAllFundRequests(
    filters: FundRequestFilters, // Use your FundRequestFilters type here
    take: number = 20,
    cursorId?: string,
  ): Promise<{ data: FundRequestResponseDto[]; nextCursor: string | null }> {
    const { query, status, fromDate, toDate } = filters;
    const andConditions: Prisma.FundRequestWhereInput[] = [];

    // 1. Status Filter (Fixed for multi-status like "APPROVED,REJECTED")
    if (status && status !== 'ALL') {
      const statuses = status.split(',') as FundRequestStatus[];
      andConditions.push({ status: { in: statuses } });
    }

    // 2. Date Range & 3. Global Search (Keep your existing logic here...)
    if (fromDate || toDate) {
      /* ... existing date logic ... */
    }
    if (query && query.trim()) {
      /* ... existing query logic ... */
    }

    // 4. Build Query Args
    const queryArgs: Prisma.FundRequestFindManyArgs = {
      where: { AND: andConditions },
      include: {
        purchaseOrderLine: { include: { purchaseOrder: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
    };

    if (cursorId) {
      queryArgs.cursor = { id: cursorId };
      queryArgs.skip = 1;
    }

    const fundRequests = await this.prisma.fundRequest.findMany(queryArgs);

    // 5. Pagination Handshake
    const hasNextPage = fundRequests.length > take;
    const results = hasNextPage ? fundRequests.slice(0, take) : fundRequests;
    const lastItem = results[results.length - 1];
    const nextCursor = hasNextPage && lastItem ? lastItem.id : null;

    return {
      data: results.map((fr) => this.mapToResponseDto(fr as FundRequestWithRelations)),
      nextCursor,
    };
  }

  // for pms
  async getFundRequestHistory(
    userId: string,
    take: number = 20,
    cursorId?: string, // Accepts the ID of the last record fetched
  ): Promise<{ data: FundRequestResponseDto[]; nextCursor: string | null }> {
    const queryArgs: Prisma.FundRequestFindManyArgs = {
      where: { requestedBy: userId },
      include: {
        purchaseOrderLine: {
          include: { purchaseOrder: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1, // Fetch one extra to determine if there's a next page
    };

    // If cursor is provided, start exactly after that record
    if (cursorId) {
      queryArgs.cursor = { id: cursorId };
      queryArgs.skip = 1;
    }

    const history = (await this.prisma.fundRequest.findMany(queryArgs)) as FundRequestWithRelations[];

    const hasNextPage = history.length > take;
    const results = hasNextPage ? history.slice(0, take) : history;

    // Determine the next cursor based on the last record in the current batch
    const lastItem = results[results.length - 1];
    const nextCursor = hasNextPage && lastItem ? lastItem.id : null;

    return {
      data: results.map((req) => this.mapToResponseDto(req)),
      nextCursor,
    };
  }

  /** MAP: DB -> DTO */
  private mapToResponseDto(item: FundRequestWithRelations): FundRequestResponseDto {
    const poLine = item.purchaseOrderLine;
    const po = poLine.purchaseOrder;

    // SAFE HELPER: Handles null/undefined before calling .toFixed()
    const safeToNumber = (val: Prisma.Decimal | null | undefined, fallback = 0): number => {
      if (!val) return fallback;
      return Number(val.toFixed(2));
    };

    return {
      id: item.id,
      poLineId: poLine.id,
      status: item.status,

      // Use safeToNumber for EVERYTHING that could be null in the DB
      requestedAmount: safeToNumber(item.requestedAmount),
      requestPurpose: item.requestPurpose,

      totalRequestedAmount: safeToNumber(poLine.totalRequestedAmount),
      totalApprovedAmount: safeToNumber(poLine.totalApprovedAmount),

      // Explicitly allow null for contractAmount if that's your business logic
      contractAmount: poLine.contractAmount ? safeToNumber(poLine.contractAmount) : null,

      cumulativeApprovedAmount: safeToNumber(poLine.totalApprovedAmount),
      remainingBalance: safeToNumber(poLine.remainingBalance),

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

      unitPrice: safeToNumber(poLine.unitPrice, 0),
      requestedQuantity: poLine.requestedQuantity,
      poLineAmount: safeToNumber(poLine.poLineAmount, 0),

      poIssuedDate: poLine.poIssuedDate,
      pm: poLine.pm,
      pmId: poLine.pmId,

      createdAt: item.createdAt,
      rejectionReason: item.rejectionReason ?? null,
    };
  }
}
