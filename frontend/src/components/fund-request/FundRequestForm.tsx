// features/fundRequests/FundRequestForm.tsx
import { FormProvider, type UseFormReturn } from "react-hook-form";
import type { CreateFundRequestInput } from "@/features/fundRequests/schema";

export function FundRequestForm({
  form,
  children,
}: {
  form: UseFormReturn<CreateFundRequestInput>;
  children: React.ReactNode;
}) {
  return <FormProvider {...form}>{children}</FormProvider>;
}
