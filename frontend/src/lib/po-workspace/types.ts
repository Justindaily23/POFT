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
    amountSpent: number;
}

export interface FilterState {
    duid: string;
    poNumber: string;
    projectCode: string;
    projectName: string;
    pm: string;
    poTypes: string[];
}

export interface FinancialMetrics {
    totalPoAmount: number;
    totalContractAmount: number;
    totalAmountRequested: number;
    totalAmountSpent: number;
    balanceDue: number;
}

export interface POWorkspaceResponse {
    metrics: FinancialMetrics;
    data: PurchaseOrderLine[];
    totalCount: number;
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
