// // features/fundRequests/fundRequest.schema.ts

// import * as z from "zod";

// Helper function to format currency for display
export const formatNaira = (amount: number | string | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return "₦0.00";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(Number(amount));
};

// // // Client-side Zod schema matching the backend DTO structure
// // export const createFundRequestSchema = z.object({
// //     duid: z.string().trim().min(3, "Invalid DUID"),
// //     poNumber: z.string().trim().optional(),
// //     prNumber: z.string().trim().optional(),
// //     poLineNumber: z.string().trim().optional(),
// //     itemDescription: z.string().trim().optional(),
// //     requestPurpose: z.string().trim().min(5, "Purpose must be descriptive."),
// //     poTypeId: z.string().trim().optional(),
// //     projectName: z.string().trim().optional(),
// //     projectCode: z.string().trim().optional(),
// //     itemCode: z.string().trim().optional(),
// //     unitPrice: z.number().min(0).optional(),
// //     requestedQuantity: z.number().min(0).optional(),
// //     poLineAmount: z.number().min(0).optional(),
// //     pm: z.string().trim().optional(),
// //     requestedAmount: z.number().min(1, "Amount must be greater than zero."),
// //     poIssuedDate: z.date().optional(),
// //     contractAmount: z.number().min(0).optional(),
// // });

// // // Infer the TypeScript type from the schema
// // export type CreateFundRequestInput = z.infer<typeof createFundRequestSchema>;

// // Add types for the API response statuses you need
// export type FundRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
// // export interface FundRequest extends CreateFundRequestInput {
// //     id: string;
// //     status: FundRequestStatus;
// //     createdAt: string;
// // }

// export interface FundRequestSearchResult {
//   id: string;
//   duid: string;
//   poNumber: string;
//   poLineNumber: string;
//   projectName: string;
//   contractAmount?: number;
// }

// // Helper to match your backend's cleanNumeric logic
// const preprocessNumeric = (val: unknown) => {
//   if (typeof val === "string") {
//     const sanitized = val.replace(/[^0-9.]/g, "");
//     return sanitized ? parseFloat(sanitized) : 0;
//   }
//   return typeof val === "number" ? val : 0;
// };

// export const fundRequestSchema = z.object({
//   duid: z.string().min(1, "DUID is required").trim(),

//   // Aligning with your @IsNumber() and @Min(0)
//   requestedAmount: z.preprocess(preprocessNumeric, z.number().min(0, "Amount must be at least 0")),

//   requestPurpose: z.string().min(5, "Purpose is required").trim(),

//   // Nullable/Optional fields to match your CreateFundRequestDto
//   poNumber: z.string().nullish(),
//   prNumber: z.string().nullish(),
//   poLineNumber: z.string().nullish(),
//   itemDescription: z.string().nullish(),
//   poTypeId: z.string().nullish(),
//   projectName: z.string().nullish(),
//   projectCode: z.string().nullish(),
//   itemCode: z.string().nullish(),

//   unitPrice: z.preprocess(preprocessNumeric, z.number().nullish()),
//   requestedQuantity: z.preprocess(preprocessNumeric, z.number().nullish()),
//   poLineAmount: z.preprocess(preprocessNumeric, z.number().nullish()),
//   contractAmount: z.preprocess(preprocessNumeric, z.number().nullish()),

//   pm: z.string().nullish(),
//   pmId: z.string().nullish(),
//   poIssuedDate: z.union([z.string(), z.date()]).nullish(),
// });

// export type CreateFundRequestInput = z.infer<typeof fundRequestSchema>;

import { z } from "zod";

export const fundRequestSchema = z.object({
  duid: z.string().min(1, "DUID is required"),
  poNumber: z.string().optional(),
  prNumber: z.string().optional(),
  poLineNumber: z.string().optional(),
  itemDescription: z.string().optional(),
  requestPurpose: z.string().min(5, "Purpose must be at least 5 characters"),
  projectName: z.string().optional(),
  projectCode: z.string().optional(),
  itemCode: z.string().optional(),
  poTypeId: z.string().optional(),
  unitPrice: z.number().optional(),
  requestedQuantity: z.number().optional(),
  poLineAmount: z.number().optional(),
  pm: z.string().optional(),
  pmId: z.string().optional(),
  requestedAmount: z.number().min(1, "Amount must be greater than 0"),
  poIssuedDate: z.date().optional(),
  contractAmount: z.number().optional(),
  cumulativeApprovedAmount: z.number().optional(),
});

export type CreateFundRequestInput = z.infer<typeof fundRequestSchema>;
