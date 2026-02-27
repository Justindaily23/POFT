import { useMutation } from "@tanstack/react-query";
import { amendContract } from "@/api/contract-admendments/amendments.api";
import { toast } from "sonner";
import type { AppAxiosError } from "@/types/api/api.types";
import type { FundRequestResponseDto } from "../../types/fund-request/fundRequest.type";

export const useContractAmendment = (
  onSuccessCallback: (updatedPoLine: FundRequestResponseDto) => void,
) => {
  return useMutation<
    { updatedPoLine: FundRequestResponseDto },
    AppAxiosError,
    Parameters<typeof amendContract>[0]
  >({
    mutationFn: amendContract,
    onSuccess: (data) => {
      toast.success("Contract successfully amended!");
      onSuccessCallback(data.updatedPoLine);
    },
    onError: (error) => {
      const status = error.response?.status;
      const errorData = error.response?.data;

      const message = errorData?.message || "Failed to update";

      const displayMessage = Array.isArray(message)
        ? message[0]
        : message || "An unexpected error occurred";

      if (status === 409) {
        toast.error("Conflict Detected", {
          description: "This record was updated by another user. Please refresh.",
        });
      } else {
        toast.error("Amendment Error", {
          description: displayMessage,
        });
      }
    },
  });
};
