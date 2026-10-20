import { FundRequestsService } from './fund-requests.service';
import { FundRequestRepository } from './infrastructure/fund-request.repository';
import { NotificationsService } from 'src/notifications/notifications.service';
import { FundRequestStatus, Prisma } from '@prisma/client';
import { ApprovalAction } from './dto/approve-fund-request.dto';
import { NotificationType } from '@prisma/client';

const D = (n: number) => new Prisma.Decimal(n);

describe('FundRequestsService', () => {
  const setup = (opts: {
    contractAmount: number;
    alreadyApproved: number;
    requestedAmount: number;
    // what reconcilePoLineFinancials returns after the approval is written
    reconciled: { approved: number; requested: number; rejected: number; remaining: number };
  }) => {
    const prisma = { $transaction: jest.fn() } as any;

    const fundRequestRepo = { withTx: jest.fn() } as unknown as FundRequestRepository;

    const notificationsService = {
      notify: jest.fn().mockResolvedValue(undefined),
    } as unknown as NotificationsService;

    const notificationsQueue = { add: jest.fn() } as any;

    const financialService = {
      reconcilePoLineFinancials: jest.fn().mockResolvedValue({
        totalApprovedAmount: D(opts.reconciled.approved),
        totalRequestedAmount: D(opts.reconciled.requested),
        totalRejectedAmount: D(opts.reconciled.rejected),
        remainingBalance: D(opts.reconciled.remaining),
      }),
    } as any;

    const service = new FundRequestsService(
      prisma,
      fundRequestRepo,
      notificationsService,
      notificationsQueue,
      financialService,
    );

    const request = {
      id: 'req-1',
      status: FundRequestStatus.PENDING,
      requestedBy: 'user-1',
      requestedAmount: D(opts.requestedAmount),
      purchaseOrderLine: {
        id: 'line-1',
        contractAmount: D(opts.contractAmount),
        totalRequestedAmount: D(opts.alreadyApproved + opts.requestedAmount),
        totalApprovedAmount: D(opts.alreadyApproved),
        totalRejectedAmount: D(0),
        remainingBalance: D(opts.contractAmount - opts.alreadyApproved),
        purchaseOrder: { id: 'po-1', duid: 'DUID-1', poNumber: 'PO-1' },
        pm: 'PM',
        itemDescription: 'Item',
        poLineNumber: '1',
      },
    };

    const tx: any = {
      fundRequest: { findUnique: jest.fn().mockResolvedValue(request) },
    };
    prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => cb(tx));

    const repo = {
      getApprovedAggregate: jest.fn().mockResolvedValue({ approvedSum: D(opts.alreadyApproved) }),
      approveFundRequest: jest.fn().mockImplementation(async (_id, _admin, amount) => ({
        ...request,
        status: FundRequestStatus.APPROVED,
        requestedAmount: amount,
      })),
      updatePOLineBalances: jest.fn().mockResolvedValue({ updated: true }),
      updatePOLineRejectedAmountIncrement: jest.fn().mockResolvedValue(undefined),
    };
    jest.spyOn(fundRequestRepo, 'withTx').mockReturnValue(repo as any);

    return { service, repo, notificationsService, financialService, tx };
  };

  it('approves a fund request with an updated requested amount override', async () => {
    const { service, repo, tx, financialService } = setup({
      contractAmount: 500,
      alreadyApproved: 0,
      requestedAmount: 120,
      reconciled: { approved: 250, requested: 250, rejected: 0, remaining: 250 },
    });

    const result = await service.approveOrRejectFundRequest(
      'req-1',
      { action: ApprovalAction.APPROVE, updatedRequestedAmount: 250 },
      'admin-1',
    );

    expect(repo.approveFundRequest).toHaveBeenCalledWith('req-1', 'admin-1', D(250));
    expect(financialService.reconcilePoLineFinancials).toHaveBeenCalledWith(tx, 'line-1');
    expect(result.status).toBe(FundRequestStatus.APPROVED);
  });

  // Regression: notification used to subtract the approved amount twice.
  // Contract 100k, 30k already approved, 20k request approved -> balance must be 50k, not 30k.
  it('sends the true remaining balance in the approval notification', async () => {
    const { service, notificationsService } = setup({
      contractAmount: 100000,
      alreadyApproved: 30000,
      requestedAmount: 20000,
      reconciled: { approved: 50000, requested: 50000, rejected: 0, remaining: 50000 },
    });

    await service.approveOrRejectFundRequest('req-1', { action: ApprovalAction.APPROVE }, 'admin-1');

    expect(notificationsService.notify).toHaveBeenCalledWith(
      'user-1',
      NotificationType.FUND_REQUEST_APPROVED,
      expect.objectContaining({
        contractAmount: 100000,
        requestedAmount: 20000,
        remainingBalance: 50000,
      }),
      'req-1',
    );
  });
});