export interface POLineSearchResponseDto {
  poLineId: string; // Primary ID of the PO line
  duid: string;
  poNumber: string | null;
  prNumber: string | null;
  poLineNumber: string | null;

  itemDescription: string | null;
  projectName: string | null;
  projectCode: string | null;
  itemCode: string | null;
  poTypeId: string | null;

  unitPrice: number | null;
  requestedQuantity: number | null;
  poLineAmount: number | null;

  pm: string | null;
  pmId: string | null;
  poIssuedDate: Date | null;

  contractAmount: number | null; // Max contract amount
  cumulativeApprovedAmount: number; // Already approved + pending
  remainingBalance: number; // contractAmount - cumulativeApprovedAmount
  isNegotiationRequired: boolean; // True if contractAmount is null or exceeded

  requestHistory?: FundRequestHistory[]; // Optional history of fund requests for this PO line
}

export interface FundRequestHistory {
  id: string;
  fundRequestId: string;
  purchaseOrderLineId;
  requestedBy: string;
  itemDescription: string;
  requestStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAmount: number;
  requestPurpose: string;
  createdAt: string; // often returned from backend as string
  approvedAt?: string;
}
