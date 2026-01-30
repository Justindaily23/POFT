// features/fundRequests/fundRequest.schema.ts

import * as z from "zod";

// Helper function to format currency for display
export const formatNaira = (amount: number | string | undefined | null): string => {
    if (amount === undefined || amount === null || isNaN(Number(amount))) return "₦0.00";
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
    }).format(Number(amount));
};

// Client-side Zod schema matching the backend DTO structure
export const createFundRequestSchema = z.object({
    duid: z.string().trim().min(3, "Invalid DUID"),
    poNumber: z.string().trim().optional(),
    prNumber: z.string().trim().optional(),
    poLineNumber: z.string().trim().optional(),
    itemDescription: z.string().trim().optional(),
    requestPurpose: z.string().trim().min(5, "Purpose must be descriptive."),
    poTypeId: z.string().trim().optional(),
    projectName: z.string().trim().optional(),
    projectCode: z.string().trim().optional(),
    itemCode: z.string().trim().optional(),
    unitPrice: z.number().min(0).optional(),
    requestedQuantity: z.number().min(0).optional(),
    poLineAmount: z.number().min(0).optional(),
    pm: z.string().trim().optional(),
    requestedAmount: z.number().min(1, "Amount must be greater than zero."),
    poIssuedDate: z.date().optional(),
    contractAmount: z.number().min(0).optional(),
});

// Infer the TypeScript type from the schema
export type CreateFundRequestInput = z.infer<typeof createFundRequestSchema>;

// Add types for the API response statuses you need
export type FundRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export interface FundRequest extends CreateFundRequestInput {
    id: string;
    status: FundRequestStatus;
    createdAt: string;
}

export interface FundRequestSearchResult {
    id: string;
    duid: string;
    poNumber: string;
    poLineNumber: string;
    projectName: string;
    contractAmount?: number;
}
