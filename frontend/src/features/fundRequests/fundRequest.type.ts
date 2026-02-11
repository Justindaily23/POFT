export interface FundRequestData {
  purchaseOrderLineId: string;
  requestedAmount: number;
  requestPurpose: string;
  duid: string;
}

export interface FundRequestResponse {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAmount: number;
  contractAmount: number | null;
  requestPurpose: string;
  duid: string;
  projectCode: string | null;
  poTypeId: string | null;
  projectName: string | null;
  prNumber: string | null;
  poNumber: string | null;
  poLineNumber: string | null;
  poIssuedDate: Date | string | null;
  poLineAmount: number | null;
  pm: string | null;
  itemCode: string | null;
  itemDescription: string | null;
  unitPrice: number | null;
  requestedQuantity: number | null;
}

export interface FundRequestHistory {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAmount: number;
  requestPurpose: string;
  createdAt: string; // often returned from backend as string
  approvedAt?: string;
}

export interface POLineSearchResponseData {
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

export interface FundRequestResponseDto {
  poLineId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";

  requestedAmount: number;
  contractAmount: number | null;
  cumulativeApprovedAmount: number;
  remainingBalance: number;
  isNegotiationRequired: boolean;

  duid: string;
  poNumber: string | null;
  prNumber: string | null;
  projectName: string | null;
  projectCode: string | null;
  poLineNumber: string | null;
  poTypeId: string | null;
  requestPurpose: string;
  createdAt: string; // serialized Date

  itemDescription: string | null;
  itemCode: string | null;
  unitPrice: number | null;
  requestedQuantity: number | null;
  poLineAmount: number | null;
  poIssuedDate: string;

  pm: string | null;
  pmId: string | null;
}

export interface AdminFundRequestFilters {
  search: string;
  status: string;
  startDate?: Date;
  endDate?: Date;
}
