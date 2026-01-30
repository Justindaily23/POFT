// src/fund-requests/fund-requests.service.ts
import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFundRequestDto } from './dto/create-fund-request.dto';
import { ApproveFundRequestDto } from './dto/approve-fund-request.dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { NotificationType, FundRequestStatus, Role, Prisma } from '@prisma/client';
import { logger } from 'src/common/logger/logger';
import { FundRequestResponseDto } from './dto/fund-request-response.dto';

export enum ApprovalAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

// Reusable include
const fundRequestWithRelations = Prisma.validator<Prisma.FundRequestDefaultArgs>()({
  include: {
    purchaseOrderLine: {
      include: {
        purchaseOrder: true,
      },
    },
  },
});

export type FundRequestWithRelations = Prisma.FundRequestGetPayload<typeof fundRequestWithRelations>;

@Injectable()
export class FundRequestsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('notifications') private notificationQueue: Queue,
  ) {}

  /** Create a fund request */
  async createFundRequest(dto: CreateFundRequestDto, pmId: string): Promise<FundRequestResponseDto> {
    const {
      duid,
      poNumber,
      poLineNumber,
      itemDescription,
      projectCode,
      prNumber,
      itemCode,
      projectName,
      pm,
      unitPrice,
      requestedQuantity,
      poLineAmount,
      poIssuedDate,
      contractAmount,
      requestPurpose,
      requestedAmount,
    } = dto;

    const notificationIds: string[] = [];

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Find or create PO
      let po = await tx.purchaseOrder.findFirst({
        where: { duid, poNumber },
      });

      if (!po) {
        po = await tx.purchaseOrder.create({
          data: {
            duid,
            projectName: projectName ?? null,
            projectCode: projectCode ?? null,
            poNumber: poNumber ?? null,
            prNumber: prNumber ?? null,
            poIssuedDate: poIssuedDate ?? null,
            pm: pm ?? null,
          },
        });
      }

      // 2. Find or create PO line
      let poLine = await tx.purchaseOrderLine.findFirst({
        where: {
          purchaseOrderId: po.id,
          poLineNumber: poLineNumber ?? null,
        },
      });

      if (!poLine) {
        let resolvedPoTypeId: string | null = null;

        if (dto.poTypeId) {
          const poType = await tx.poType.findUnique({
            where: { id: dto.poTypeId },
          });

          if (!poType) {
            throw new BadRequestException('Invalid PO Type');
          }

          resolvedPoTypeId = poType.id;
        }

        poLine = await tx.purchaseOrderLine.create({
          data: {
            purchaseOrderId: po.id,
            poLineNumber: poLineNumber ?? null,
            itemCode: itemCode ?? null,
            itemDescription: itemDescription ?? null,
            poTypeId: resolvedPoTypeId,
            unitPrice: unitPrice ?? null,
            requestedQuantity: requestedQuantity ?? null,
            poLineAmount: poLineAmount ?? null,
            contractAmount: contractAmount ?? null,
            totalApprovedAmount: 0,
            remainingBalance: contractAmount ?? 0,
          },
        });
      }

      // 3. Contract pre-check
      if (poLine.contractAmount && poLine.totalApprovedAmount.plus(requestedAmount ?? 0).gt(poLine.contractAmount)) {
        throw new BadRequestException('Requested amount exceeds contract amount.');
      }

      // 4. Create fund request
      const fundRequest = await tx.fundRequest.create({
        data: {
          purchaseOrderLineId: poLine.id,
          requestedAmount: requestedAmount ?? 0,
          requestPurpose,
          requestedBy: pmId,
          status: FundRequestStatus.PENDING,
        },
        include: {
          purchaseOrderLine: { include: { purchaseOrder: true } },
        },
      });

      // 5. Notify admins
      const admins = await tx.user.findMany({
        where: { role: { in: [Role.SUPER_ADMIN, Role.ADMIN] } },
      });

      for (const admin of admins) {
        const notification = await tx.notification.create({
          data: {
            userId: admin.id,
            fundRequestId: fundRequest.id,
            type: NotificationType.FUND_REQUEST_CREATED,
            payload: {
              duid: fundRequest.purchaseOrderLine.purchaseOrder.duid,
              poLineNumber: fundRequest.purchaseOrderLine.poLineNumber,
              poLineAmount: fundRequest.purchaseOrderLine.poLineAmount,
              pm: fundRequest.purchaseOrderLine.purchaseOrder.pm,
              itemDescription: fundRequest.purchaseOrderLine.itemDescription,
              requestedAmount: fundRequest.requestedAmount,
              requestPurpose: fundRequest.requestPurpose,
            },
          },
        });

        notificationIds.push(notification.id);
      }

      return fundRequest as FundRequestWithRelations;
    });

    // enqueue AFTER transaction commit
    for (const id of notificationIds) {
      await this.notificationQueue.add({ notificationId: id });
    }

    return this.mapToResponseDto(result);
  }

  /** Approve or reject a fund request */
  async approveOrRejectFundRequest(
    fundRequestId: string,
    dto: ApproveFundRequestDto,
    adminId: string,
  ): Promise<FundRequestResponseDto> {
    const { action, rejectionReason } = dto;
    const notificationIds: string[] = [];

    const result = await this.prisma.$transaction(async (tx) => {
      const fundRequest = await tx.fundRequest.findUnique({
        where: { id: fundRequestId },
        include: {
          purchaseOrderLine: { include: { purchaseOrder: true } },
        },
      });

      if (!fundRequest) {
        throw new NotFoundException('No fund request');
      }

      // ✅ Idempotency guard
      if (fundRequest.status !== FundRequestStatus.PENDING) {
        throw new BadRequestException('Fund request has already been processed');
      }

      const poLine = fundRequest.purchaseOrderLine;

      // ===== REJECTION FLOW =====
      if (action === ApprovalAction.REJECT) {
        if (!rejectionReason) {
          throw new BadRequestException('Rejection reason required');
        }

        const rejected = await tx.fundRequest.update({
          where: { id: fundRequestId },
          data: {
            status: FundRequestStatus.REJECTED,
            rejectionReason,
            approvedBy: adminId,
            approvedAt: new Date(),
          },
          include: {
            purchaseOrderLine: { include: { purchaseOrder: true } },
          },
        });

        const notif = await tx.notification.create({
          data: {
            userId: fundRequest.requestedBy,
            fundRequestId: rejected.id,
            type: NotificationType.FUND_REQUEST_REJECTED,
            payload: {
              fundRequestId: rejected.id,
              reason: rejectionReason,
              status: FundRequestStatus.REJECTED,
            },
          },
        });

        notificationIds.push(notif.id);
        return rejected as FundRequestWithRelations;
      }

      // ===== APPROVAL FLOW =====
      if (!poLine.contractAmount) {
        throw new BadRequestException('Cannot approve: PO line contract amount not set');
      }

      const newTotalApproved = poLine.totalApprovedAmount.plus(fundRequest.requestedAmount);

      if (newTotalApproved.gt(poLine.contractAmount)) {
        logger.info(`Contract exceeded for DUID ${poLine.purchaseOrder.duid}`);
        throw new BadRequestException('Contract limit exceeded');
      }

      const approved = await tx.fundRequest.update({
        where: { id: fundRequestId },
        data: {
          status: FundRequestStatus.APPROVED,
          approvedBy: adminId,
          approvedAt: new Date(),
        },
        include: {
          purchaseOrderLine: { include: { purchaseOrder: true } },
        },
      });

      // ✅ Concurrency-safe update
      const update = await tx.purchaseOrderLine.updateMany({
        where: {
          id: poLine.id,
          totalApprovedAmount: poLine.totalApprovedAmount,
        },
        data: {
          totalApprovedAmount: newTotalApproved,
          remainingBalance: poLine.contractAmount.minus(newTotalApproved),
        },
      });

      if (update.count !== 1) {
        throw new ConflictException('Concurrent approval detected. Please retry.');
      }

      const notif = await tx.notification.create({
        data: {
          userId: fundRequest.requestedBy,
          fundRequestId: approved.id,
          type: NotificationType.FUND_REQUEST_APPROVED,
          payload: {
            fundRequestId: approved.id,
            approvedAmount: approved.requestedAmount,
            status: FundRequestStatus.APPROVED,
          },
        },
      });

      notificationIds.push(notif.id);
      return approved as FundRequestWithRelations;
    });

    for (const id of notificationIds) {
      await this.notificationQueue.add({ notificationId: id });
    }

    return this.mapToResponseDto(result);
  }

  async findAll(): Promise<FundRequestResponseDto[]> {
    const requests = await this.prisma.fundRequest.findMany({
      include: {
        purchaseOrderLine: { include: { purchaseOrder: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((req) => this.mapToResponseDto(req as FundRequestWithRelations));
  }

  // ===== Mapper =====
  private mapToResponseDto(item: FundRequestWithRelations): FundRequestResponseDto {
    const poLine = item.purchaseOrderLine;
    const po = poLine.purchaseOrder;

    return {
      id: item.id,
      status: item.status,
      requestedAmount: item.requestedAmount.toNumber(),
      contractAmount: poLine.contractAmount?.toNumber() ?? null,
      requestPurpose: item.requestPurpose,
      duid: po.duid,
      projectCode: po.projectCode,
      poTypeId: poLine.poTypeId,
      projectName: po.projectName,
      prNumber: po.prNumber,
      poNumber: po.poNumber,
      poLineNumber: poLine.poLineNumber,
      poIssuedDate: po.poIssuedDate ?? null,
      poLineAmount: poLine.poLineAmount?.toNumber() ?? null,
      pm: po.pm,
      itemCode: poLine.itemCode,
      itemDescription: poLine.itemDescription,
      unitPrice: poLine.unitPrice?.toNumber() ?? null,
      requestedQuantity: poLine.requestedQuantity ?? null,
    };
  }
}
