export interface PurchaseOrderLine {
  id: string;
  duid: string;
  poNumber: string;
  prNumber: string;
  projectCode: string;
  projectName: string;
  pm: string;
  poLineNumber: number;
  poType: string;
  unitPrice: number;
  requestedQuantity: number;
  poLineAmount: number;
  itemDescription: string;
  contractAmount?: number | null;
  status?: 'INVOICED' | 'NOT_INVOICED' | null;
  amountRequested: number;
  amountSpent: number;
}

export interface FinancialMetrics {
  totalPoAmount: number;
  totalContractAmount: number;
  totalAmountRequested: number;
  totalAmountSpent: number;
  balanceDue: number;
}

export interface PoWorkspaceResponse {
  data: PurchaseOrderLine[];
  metrics: FinancialMetrics;
  totalCount: number;
}
