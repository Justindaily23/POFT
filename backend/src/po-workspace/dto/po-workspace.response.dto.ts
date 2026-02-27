import { PoLineStatus } from '@prisma/client';

export interface PurchaseOrderLine {
  id: string;
  duid: string;
  poNumber: string;
  prNumber: string;
  projectCode: string;
  projectName: string;
  pm: string;
  poLineNumber: string;
  poType: string;
  unitPrice: number;
  requestedQuantity: number;
  poLineAmount: number;
  itemDescription: string;
  contractAmount?: number | null;
  status?: PoLineStatus | null;
  amountRequested: number;
  amountRejected: number;
  amountSpent: number;
  balanceDue: number;
}

export interface FinancialMetrics {
  totalPoAmount: number;
  totalContractAmount: number;
  totalAmountRequested: number;
  totalAmountRejected: number;
  totalAmountSpent: number;
  balanceDue: number;
}

export interface PoWorkspaceResponse {
  data: PurchaseOrderLine[];
  metrics: FinancialMetrics;
  nextCursor?: string | null; // <-- new cursor-based pagination field
  totalCount: number;
}
