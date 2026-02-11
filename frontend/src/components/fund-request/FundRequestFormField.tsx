// features/fundRequests/FundRequestFormField.tsx
import { Controller, type ControllerProps } from "react-hook-form";
import type { CreateFundRequestInput } from "@/features/fundRequests/schema";

export function FundRequestFormField<TName extends keyof CreateFundRequestInput>(
  props: ControllerProps<CreateFundRequestInput, TName>,
) {
  return <Controller {...props} />;
}
