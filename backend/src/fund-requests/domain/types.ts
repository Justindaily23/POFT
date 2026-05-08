import { FundRequest, Prisma, PurchaseOrder, PurchaseOrderLine } from '@prisma/client';

export type Money = Prisma.Decimal;

export interface ApprovalAggregate {
  approvedSum: Money;
}

export interface POLineBalances {
  totalApprovedAmount: Money;
  totalRequestedAmount: Money;
  remainingBalance: Money;
}

export interface ConcurrencyResult {
  updated: boolean;
}

/** Extended type to include nested relations */
export type FundRequestWithRelations = FundRequest & {
  purchaseOrderLine: PurchaseOrderLine & {
    purchaseOrder: PurchaseOrder;
  };
};
