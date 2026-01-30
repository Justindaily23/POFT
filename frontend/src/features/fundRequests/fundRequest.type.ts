// src/features/fund-request/types.ts

export interface PurchaseOrderLine {
    id: string;
    duid: string;
    poNumber: string;
    poLineNumber: string;
    itemDescription: string;
    customItemDescription?: string; // Intent of request
    poType: string;
    projectName: string;
    pm: string;
    unitPrice: number;
    quantity: number;
    poLineAmount: number;
    contractAmount?: number;
    status: "Not Invoiced" | "Invoiced" | "PENDING" | "APPROVED" | "REJECTED";
}

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
