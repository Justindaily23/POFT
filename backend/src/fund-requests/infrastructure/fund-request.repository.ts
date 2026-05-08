import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { FundRequestStatus, Prisma } from '@prisma/client';
import { FundRequestRepoTx } from '../domain/fund-request.repo';
import { POLineBalances } from '../domain/types';

@Injectable()
export class FundRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  withTx(tx: Prisma.TransactionClient): FundRequestRepoTx {
    return {
      async getApprovedAggregate(poLineId: string, excludeRequestId: string) {
        const res = await tx.fundRequest.aggregate({
          where: {
            purchaseOrderLineId: poLineId,
            status: FundRequestStatus.APPROVED,
            id: { not: excludeRequestId },
          },
          _sum: { requestedAmount: true },
        });

        return {
          approvedSum: res._sum.requestedAmount ?? new Prisma.Decimal(0),
        };
      },

      async approveFundRequest(requestId: string, adminId: string) {
        return tx.fundRequest.update({
          where: { id: requestId },
          data: {
            status: FundRequestStatus.APPROVED,
            approvedBy: adminId,
            approvedAt: new Date(),
          },
          include: { purchaseOrderLine: { include: { purchaseOrder: true } } },
        });
      },

      // async getRejectedAggregate(poLineId: string): Promise<Prisma.Decimal> {
      //   const res = await tx.fundRequest.aggregate({
      //     where: {
      //       purchaseOrderLineId: poLineId,
      //       status: FundRequestStatus.REJECTED,
      //     },
      //     _sum: { requestedAmount: true },
      //   });

      //   return res._sum.requestedAmount ?? new Prisma.Decimal(0);
      // },

      async updatePOLineBalances(poLineId: string, expectedApprovedAmount: Prisma.Decimal, balances: POLineBalances) {
        const res = await tx.purchaseOrderLine.updateMany({
          where: {
            id: poLineId,
            totalApprovedAmount: expectedApprovedAmount,
          },
          data: balances,
        });

        return { updated: res.count === 1 };
      },

      async rejectFundRequest(requestId: string, rejectionReason: string, adminId: string) {
        return tx.fundRequest.update({
          where: { id: requestId },
          data: {
            status: FundRequestStatus.REJECTED,
            rejectionReason,
            rejectedBy: adminId,
            rejectedAt: new Date(),
          },
          include: { purchaseOrderLine: { include: { purchaseOrder: true } } },
        });
      },

      async updatePOLineRejectedAmount(poLineId: string, rejectedTotal: Prisma.Decimal) {
        await tx.purchaseOrderLine.update({
          where: { id: poLineId },
          data: {
            totalRejectedAmount: rejectedTotal,
          },
        });
      },

      async updatePOLineRejectedAmountIncrement(poLineId: string, amount: Prisma.Decimal) {
        await tx.purchaseOrderLine.update({
          where: { id: poLineId },
          data: {
            totalRejectedAmount: {
              increment: amount,
            },
          },
        });
      },
    };
  }
}
