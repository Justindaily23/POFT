import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma, FundRequestStatus } from '@prisma/client';

type FundRequestSums = Partial<Record<FundRequestStatus, Prisma.Decimal>>;

@Injectable()
export class PoLineFinancialService {
  constructor(private readonly prisma: PrismaService) {}

  // 🔧 Single source of truth for the reconciliation formula.
  // Both reconcilePoLineFinancials and reconcileManyPoLines call this,
  // so the definition can never drift between the single-line and
  // bulk-import code paths.
  private computeFinancials(sums: FundRequestSums, contractAmount: Prisma.Decimal) {
    const zero = new Prisma.Decimal(0);
    const totalApprovedAmount = sums[FundRequestStatus.APPROVED] ?? zero;
    const totalRejectedAmount = sums[FundRequestStatus.REJECTED] ?? zero;
    const totalRequestedAmount = (sums[FundRequestStatus.PENDING] ?? zero).plus(totalApprovedAmount);
    const remainingBalance = contractAmount.minus(totalApprovedAmount);

    return { totalApprovedAmount, totalRequestedAmount, totalRejectedAmount, remainingBalance };
  }

  async reconcilePoLineFinancials(tx: Prisma.TransactionClient | PrismaService, poLineId: string) {
    const poLine = await tx.purchaseOrderLine.findUnique({
      where: { id: poLineId },
      select: { id: true, contractAmount: true },
    });

    if (!poLine) return null;

    const grouped = await tx.fundRequest.groupBy({
      by: ['status'],
      where: { purchaseOrderLineId: poLineId },
      _sum: { requestedAmount: true },
    });

    const sums: FundRequestSums = Object.fromEntries(
      grouped.map((g) => [g.status, g._sum.requestedAmount ?? new Prisma.Decimal(0)]),
    );

    const contractAmount = poLine.contractAmount ?? new Prisma.Decimal(0);
    const result = this.computeFinancials(sums, contractAmount);

    await tx.purchaseOrderLine.update({
      where: { id: poLineId },
      data: result,
    });

    return result;
  }

  async reconcileManyPoLines(poLineIds: string[]): Promise<void> {
    if (poLineIds.length === 0) return;

    const lines = await this.prisma.purchaseOrderLine.findMany({
      where: { id: { in: poLineIds } },
      select: { id: true, contractAmount: true },
    });

    const grouped = await this.prisma.fundRequest.groupBy({
      by: ['purchaseOrderLineId', 'status'],
      where: { purchaseOrderLineId: { in: poLineIds } },
      _sum: { requestedAmount: true },
    });

    const sumsByLine = new Map<string, FundRequestSums>();
    for (const row of grouped) {
      const entry = sumsByLine.get(row.purchaseOrderLineId) ?? {};
      entry[row.status] = row._sum.requestedAmount ?? new Prisma.Decimal(0);
      sumsByLine.set(row.purchaseOrderLineId, entry);
    }

    await Promise.all(
      lines.map((line) => {
        const sums = sumsByLine.get(line.id) ?? {};
        const contractAmount = line.contractAmount ?? new Prisma.Decimal(0);
        const result = this.computeFinancials(sums, contractAmount);

        return this.prisma.purchaseOrderLine.update({
          where: { id: line.id },
          data: result,
        });
      }),
    );
  }
}