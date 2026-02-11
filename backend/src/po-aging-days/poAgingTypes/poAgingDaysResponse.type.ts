export interface PoAgingDaysResponse {
  id: string;
  duid: string;
  poNumber: string;
  prNumber: string;
  projectCode: string;
  projectName: string;
  pm: string;
  pmId: string;
  poLineNumber: string;
  poType: string;
  poIssuedDate: Date;
  poInvoiceDate?: Date | null;
  allowedOpenDays: number;
  numberOfDaysOpen: number;
  agingFlag: 'GREEN' | 'WARNING' | 'RED';
  itemCode: string;
  itemDescription: string;
  poInvoiceStatus: 'INVOICED' | 'NOT_INVOICED' | null;
}

// This represents the PAGINATED wrapper
export interface PoAgingDaysPaginatedResponse {
  data: PoAgingDaysResponse[]; // Changed from PoAgingDaysItem to PoAgingDaysResponse
  nextCursor: string | null;
}

// export interface FinancialMetrics {
//   unitPrice?: number;
//   amountSpent?: number;
//   contractAmount?: number | null;
//   requestedQuantity?: number;
//   poLineAmount?: number;
//   amountRequested?: number;

//   totalPoAmount: number;
//   totalContractAmount: number;
//   totalAmountRequested: number;
//   totalAmountSpent: number;
//   balanceDue: number;
// }

// export interface PoWorkspaceResponse {
//   data: PurchaseOrderLine[];
//   metrics: FinancialMetrics;
//   totalCount: number;
// }
