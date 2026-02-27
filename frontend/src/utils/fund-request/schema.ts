import { z } from "zod";

export const formatNaira = (amount: number | string | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return "₦0.00";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(Number(amount));
};

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
