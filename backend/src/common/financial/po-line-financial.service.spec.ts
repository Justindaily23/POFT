import { FundRequestStatus, Prisma } from '@prisma/client';
import { PoLineFinancialService } from './po-line-financial.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('PoLineFinancialService', () => {
  it('reconciles approved, requested and rejected totals from fund requests', async () => {
    const prisma = {
      purchaseOrderLine: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      fundRequest: {
        aggregate: jest.fn(),
      },
    } as unknown as PrismaService;

    const tx = prisma as any;
    const service = new PoLineFinancialService(prisma);

    tx.purchaseOrderLine.findUnique.mockResolvedValue({
      id: 'line-1',
      contractAmount: new Prisma.Decimal(500),
      remainingBalance: new Prisma.Decimal(500),
    });

    tx.fundRequest.aggregate
      .mockResolvedValueOnce({ _sum: { requestedAmount: new Prisma.Decimal(80) } })
      .mockResolvedValueOnce({ _sum: { requestedAmount: new Prisma.Decimal(120) } })
      .mockResolvedValueOnce({ _sum: { requestedAmount: new Prisma.Decimal(40) } });

    await service.reconcilePoLineFinancials(tx, 'line-1');

    expect(tx.purchaseOrderLine.update).toHaveBeenCalledWith({
      where: { id: 'line-1' },
      data: {
        totalApprovedAmount: new Prisma.Decimal(80),
        totalRequestedAmount: new Prisma.Decimal(120),
        totalRejectedAmount: new Prisma.Decimal(40),
        remainingBalance: new Prisma.Decimal(420),
      },
    });
  });
});
