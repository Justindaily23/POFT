import type { BackendErrorData, EnhancedError } from "@/types/api/api.types";
import { AxiosError } from "axios";

export function handleApiError(error: unknown): never {
  // Use the official Axios type for better internal consistency
  const axiosError = error as AxiosError<BackendErrorData>;
  const errorData = axiosError.response?.data;

  const rawMessage = errorData?.message || "An unexpected error occurred";
  const displayMessage = Array.isArray(rawMessage) ? rawMessage.join(", ") : rawMessage;

  const enhancedError = new Error(displayMessage) as EnhancedError;
  enhancedError.requiresContract = errorData?.requiresContract;
  enhancedError.poLineId = errorData?.poLineId;

  throw enhancedError;
}
