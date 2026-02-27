export interface PurchaseOrderLine {
  id: string;
  duid: string;
  poNumber: string;
  prNumber: string;
  projectCode: string;
  projectName: string;
  pm: string;
  //pmId: string;
  poLineNumber: number;
  poType: string;
  unitPrice: number;
  requestedQuantity: number;
  poLineAmount: number;
  itemDescription: string;
  contractAmount?: number | null;
  status?: "INVOICED" | "NOT_INVOICED" | null;
  amountRequested: number;
  amountRejected: number;
  amountSpent: number;
}

export interface FilterState {
  duid: string;
  poNumber: string;
  projectCode: string;
  projectName: string;
  pm: string;
  poTypes: string[];
  cursor?: string | null;
  limit?: number;
}

export interface FinancialMetrics {
  totalPoAmount: number;
  totalContractAmount: number;
  totalAmountRequested: number;
  totalAmountRejected: number;
  totalAmountSpent: number;
  balanceDue: number;
}

export interface POWorkspaceResponse {
  metrics: FinancialMetrics;
  data: PurchaseOrderLine[];
  totalCount: number;
  nextCursor: string | null;
}

// src/lib/po-workspace/types.ts

export interface ImportResult {
  historyId: string; // Added to match service
  duidCount: number;
  poSucceeded: number;
  poFailed: number;
  linesProcessed: number; // FIX: Replace created/updated with this
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  errors: string[];
}

// lib/po-workspace/types.ts
export interface PoType {
  id: string;
  code: string;
  name: string;
}

// 1. Define the object first
export const PoLineStatus = {
  INVOICED: "INVOICED",
  NOT_INVOICED: "NOT_INVOICED",
} as const;

// 2. Define the type second (using the object name)
export type PoLineStatus = (typeof PoLineStatus)[keyof typeof PoLineStatus];

// 3. Define the labels (using the type)
export const PO_LINE_STATUS_LABELS: Record<PoLineStatus, string> = {
  [PoLineStatus.INVOICED]: "Invoiced",
  [PoLineStatus.NOT_INVOICED]: "Not Invoiced",
};

export interface PoImportHistoryItem {
  id: string;
  fileName: string;
  fileHash: string;
  duidCount: number;
  poCount: number;
  poLineCount: number;
  status: "SUCCESS" | "PARTIAL" | "FAILED" | string;
  errors: string[] | null;
  createdBy: string | null;
  // Using string | Date allows it to be a JSON string from the API
  // or a Date object if used locally or via Prisma types.
  createdAt: string | Date;
}

export interface ImportResult {
  historyId: string;
  duidCount: number;
  poSucceeded: number;
  poFailed: number;
  linesProcessed: number;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  errors: string[];
}
