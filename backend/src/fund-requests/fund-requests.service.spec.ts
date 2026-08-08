import { FundRequestsService } from './fund-requests.service';
import { FundRequestRepository } from './infrastructure/fund-request.repository';
import { NotificationsService } from 'src/notifications/notifications.service';
import { FundRequestStatus, Prisma } from '@prisma/client';
import { ApprovalAction } from './dto/approve-fund-request.dto';

describe('FundRequestsService', () => {
  it('approves a fund request with an updated requested amount override', async () => {
    const prisma = {
      $transaction: jest.fn(),
    } as any;

    const fundRequestRepo = {
      withTx: jest.fn(),
    } as unknown as FundRequestRepository;

    const notificationsService = {
      notify: jest.fn().mockResolvedValue(undefined),
    } as unknown as NotificationsService;

    const notificationsQueue = { add: jest.fn() } as any;

    const service = new FundRequestsService(prisma, fundRequestRepo, notificationsService, notificationsQueue, {
      reconcilePoLineFinancials: jest.fn().mockResolvedValue(undefined),
    } as any);

    const request = {
      id: 'req-1',
      status: FundRequestStatus.PENDING,
      requestedAmount: new Prisma.Decimal(120),
      purchaseOrderLine: {
        id: 'line-1',
        contractAmount: new Prisma.Decimal(500),
        totalRequestedAmount: new Prisma.Decimal(0),
        totalApprovedAmount: new Prisma.Decimal(0),
        totalRejectedAmount: new Prisma.Decimal(0),
        remainingBalance: new Prisma.Decimal(500),
        purchaseOrder: { id: 'po-1', duid: 'DUID-1', poNumber: 'PO-1' },
        pm: 'PM',
        itemDescription: 'Item',
        poLineNumber: '1',
      },
    };

    const tx: any = {
      fundRequest: {
        findUnique: jest.fn().mockResolvedValue(request),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => callback(tx));

    const repo = {
      getApprovedAggregate: jest.fn().mockResolvedValue({ approvedSum: new Prisma.Decimal(0) }),
      approveFundRequest: jest.fn().mockResolvedValue({ ...request, status: FundRequestStatus.APPROVED }),
      updatePOLineBalances: jest.fn().mockResolvedValue({ updated: true }),
      updatePOLineRejectedAmountIncrement: jest.fn().mockResolvedValue(undefined),
    };

    jest.spyOn(fundRequestRepo, 'withTx').mockReturnValue(repo as any);

    const result = await service.approveOrRejectFundRequest(
      'req-1',
      { action: ApprovalAction.APPROVE, updatedRequestedAmount: 250 } as any,
      'admin-1',
    );

    expect(repo.approveFundRequest).toHaveBeenCalledWith('req-1', 'admin-1', new Prisma.Decimal(250));
    expect(result.status).toBe(FundRequestStatus.APPROVED);
  });
});
