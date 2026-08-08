import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma, FundRequestStatus } from '@prisma/client';

@Injectable()
export class PoLineFinancialService {
  constructor(private readonly prisma: PrismaService) {}

  async reconcilePoLineFinancials(tx: Prisma.TransactionClient | PrismaService, poLineId: string) {
    const poLine = await tx.purchaseOrderLine.findUnique({
      where: { id: poLineId },
      select: {
        id: true,
        contractAmount: true,
        remainingBalance: true,
      },
    });

    if (!poLine) {
      return null;
    }

    const [approvedAggregate, requestedAggregate, rejectedAggregate] = await Promise.all([
      tx.fundRequest.aggregate({
        where: {
          purchaseOrderLineId: poLineId,
          status: FundRequestStatus.APPROVED,
        },
        _sum: { requestedAmount: true },
      }),
      tx.fundRequest.aggregate({
        where: {
          purchaseOrderLineId: poLineId,
          status: { in: [FundRequestStatus.PENDING, FundRequestStatus.APPROVED] },
        },
        _sum: { requestedAmount: true },
      }),
      tx.fundRequest.aggregate({
        where: {
          purchaseOrderLineId: poLineId,
          status: FundRequestStatus.REJECTED,
        },
        _sum: { requestedAmount: true },
      }),
    ]);

    const totalApprovedAmount = approvedAggregate._sum.requestedAmount ?? new Prisma.Decimal(0);
    const totalRequestedAmount = requestedAggregate._sum.requestedAmount ?? new Prisma.Decimal(0);
    const totalRejectedAmount = rejectedAggregate._sum.requestedAmount ?? new Prisma.Decimal(0);

    const contractAmount = poLine.contractAmount ?? new Prisma.Decimal(0);
    const remainingBalance = contractAmount.minus(totalApprovedAmount);

    await tx.purchaseOrderLine.update({
      where: { id: poLineId },
      data: {
        totalApprovedAmount,
        totalRequestedAmount,
        totalRejectedAmount,
        remainingBalance,
      },
    });

    return {
      totalApprovedAmount,
      totalRequestedAmount,
      totalRejectedAmount,
      remainingBalance,
    };
  }
}
