import { FundRequestStatus, Prisma } from '@prisma/client';
import { PoLineFinancialService } from './po-line-financial.service';
import { PrismaService } from '@/prisma/prisma.service';

const D = (n: number) => new Prisma.Decimal(n);

describe('PoLineFinancialService', () => {
  const makePrisma = () => ({
    purchaseOrderLine: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    fundRequest: {
      groupBy: jest.fn(),
    },
  });

  let prisma: ReturnType<typeof makePrisma>;
  let service: PoLineFinancialService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new PoLineFinancialService(prisma as unknown as PrismaService);
  });

  describe('reconcilePoLineFinancials', () => {
    it('reconciles approved, requested (pending + approved) and rejected totals', async () => {
      prisma.purchaseOrderLine.findUnique.mockResolvedValue({ id: 'line-1', contractAmount: D(500) });
      prisma.fundRequest.groupBy.mockResolvedValue([
        { status: FundRequestStatus.APPROVED, _sum: { requestedAmount: D(80) } },
        { status: FundRequestStatus.PENDING, _sum: { requestedAmount: D(120) } },
        { status: FundRequestStatus.REJECTED, _sum: { requestedAmount: D(40) } },
      ]);

      const result = await service.reconcilePoLineFinancials(prisma as any, 'line-1');

      expect(prisma.fundRequest.groupBy).toHaveBeenCalledTimes(1);
      expect(prisma.purchaseOrderLine.update).toHaveBeenCalledWith({
        where: { id: 'line-1' },
        data: {
          totalApprovedAmount: D(80),
          totalRequestedAmount: D(200),
          totalRejectedAmount: D(40),
          remainingBalance: D(420),
        },
      });
      expect(result?.remainingBalance).toEqual(D(420));
    });

    it('treats statuses with no fund requests as zero', async () => {
      prisma.purchaseOrderLine.findUnique.mockResolvedValue({ id: 'line-1', contractAmount: D(500) });
      prisma.fundRequest.groupBy.mockResolvedValue([]);

      await service.reconcilePoLineFinancials(prisma as any, 'line-1');

      expect(prisma.purchaseOrderLine.update).toHaveBeenCalledWith({
        where: { id: 'line-1' },
        data: {
          totalApprovedAmount: D(0),
          totalRequestedAmount: D(0),
          totalRejectedAmount: D(0),
          remainingBalance: D(500),
        },
      });
    });

    it('returns null and writes nothing when the line does not exist', async () => {
      prisma.purchaseOrderLine.findUnique.mockResolvedValue(null);

      const result = await service.reconcilePoLineFinancials(prisma as any, 'missing');

      expect(result).toBeNull();
      expect(prisma.fundRequest.groupBy).not.toHaveBeenCalled();
      expect(prisma.purchaseOrderLine.update).not.toHaveBeenCalled();
    });
  });

  describe('reconcileManyPoLines', () => {
    it('does nothing for an empty list', async () => {
      await service.reconcileManyPoLines([]);

      expect(prisma.purchaseOrderLine.findMany).not.toHaveBeenCalled();
      expect(prisma.fundRequest.groupBy).not.toHaveBeenCalled();
    });

    it('reconciles many lines with one findMany and one groupBy', async () => {
      prisma.purchaseOrderLine.findMany.mockResolvedValue([
        { id: 'line-1', contractAmount: D(500) },
        { id: 'line-2', contractAmount: D(300) },
        { id: 'line-3', contractAmount: null }, // null contract amount -> 0
      ]);
      prisma.fundRequest.groupBy.mockResolvedValue([
        { purchaseOrderLineId: 'line-1', status: FundRequestStatus.APPROVED, _sum: { requestedAmount: D(80) } },
        { purchaseOrderLineId: 'line-1', status: FundRequestStatus.PENDING, _sum: { requestedAmount: D(120) } },
        { purchaseOrderLineId: 'line-1', status: FundRequestStatus.REJECTED, _sum: { requestedAmount: D(40) } },
        { purchaseOrderLineId: 'line-2', status: FundRequestStatus.APPROVED, _sum: { requestedAmount: D(100) } },
        // line-3 has no fund requests
      ]);

      await service.reconcileManyPoLines(['line-1', 'line-2', 'line-3']);

      expect(prisma.purchaseOrderLine.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.fundRequest.groupBy).toHaveBeenCalledTimes(1);
      expect(prisma.purchaseOrderLine.update).toHaveBeenCalledTimes(3);

      expect(prisma.purchaseOrderLine.update).toHaveBeenCalledWith({
        where: { id: 'line-1' },
        data: {
          totalApprovedAmount: D(80),
          totalRequestedAmount: D(200),
          totalRejectedAmount: D(40),
          remainingBalance: D(420),
        },
      });
      expect(prisma.purchaseOrderLine.update).toHaveBeenCalledWith({
        where: { id: 'line-2' },
        data: {
          totalApprovedAmount: D(100),
          totalRequestedAmount: D(100),
          totalRejectedAmount: D(0),
          remainingBalance: D(200),
        },
      });
      expect(prisma.purchaseOrderLine.update).toHaveBeenCalledWith({
        where: { id: 'line-3' },
        data: {
          totalApprovedAmount: D(0),
          totalRequestedAmount: D(0),
          totalRejectedAmount: D(0),
          remainingBalance: D(0),
        },
      });
    });
  });
});