import { Prisma } from '@prisma/client';
import { ApprovalAggregate, ConcurrencyResult, FundRequestWithRelations, POLineBalances } from './types';

export interface FundRequestRepoTx {
  getApprovedAggregate(poLinedId: string, excludeRequestId: string): Promise<ApprovalAggregate>;

  //   getRejectedAggregate(poLineId: string): Promise<Prisma.Decimal>;
  updatePOLineRejectedAmountIncrement(poLineId: string, amount: Prisma.Decimal): Promise<void>;

  approveFundRequest(requestId: string, adminId: string): Promise<FundRequestWithRelations>;

  rejectFundRequest(requestId: string, adminId: string, rejectionReason: string): Promise<FundRequestWithRelations>;

  updatePOLineRejectedAmount(poLineId: string, rejectedTotal: Prisma.Decimal): Promise<void>;

  updatePOLineBalances(
    poLineId: string,
    expectedApprovedAmount: Prisma.Decimal,
    balances: POLineBalances,
  ): Promise<ConcurrencyResult>;
}
