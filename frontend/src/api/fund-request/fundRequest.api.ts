import apiClient from "@/api/auth/axios";
import type {
  AdminFundRequestFilters,
  ApproveRejectPayload,
  FundRequestResponseDto,
  PaginatedFundRequestResponse,
} from "@/types/fund-request/fundRequest.type";
import type { CreateFundRequestInput } from "@/utils/fund-request/schema";
import { handleApiError } from "@/utils/fund-request/apiHelpers";

/**
 * PRODUCTION TIP: Local definition prevents circular dependencies
 * and ensures TypeScript can trace types without 'any'.
 */
export const FundRequestAction = {
  APPROVE: "APPROVE",
  REJECT: "REJECT",
} as const;

export type FundRequestAction = (typeof FundRequestAction)[keyof typeof FundRequestAction];

export const fundRequestApi = {
  searchByDuidOrPoNumber: async (query: string): Promise<FundRequestResponseDto[]> => {
    if (!query.trim()) return [];

    const response = await apiClient.get<FundRequestResponseDto[]>("/fund-requests/search", {
      params: { query: query.trim() },
    });
    return response.data;
  },

  submitRequest: async (data: CreateFundRequestInput): Promise<FundRequestResponseDto> => {
    const response = await apiClient.post<FundRequestResponseDto>("/fund-requests/submit", data);
    return response.data;
  },

  getLineSummary: async (
    poLineNumber: string,
  ): Promise<{ totalApproved: number; contractAmount: number }> => {
    const response = await apiClient.get<{ totalApproved: number; contractAmount: number }>(
      `/po-summary/${poLineNumber}`,
    );
    return response.data;
  },

  getRequestsByDuidAndPoLine: async (
    PoLineId: string,
    cursor?: string,
    limit = 10,
  ): Promise<FundRequestResponseDto[]> => {
    const response = await apiClient.get<FundRequestResponseDto[]>(
      `/fund-requests/history/${PoLineId}`,
      {
        params: {
          cursor,
          limit,
        },
      },
    );
    return response.data;
  },

  getAllPmRequests: async (): Promise<FundRequestResponseDto[]> => {
    const response = await apiClient.get<FundRequestResponseDto[]>("/fund-requests");
    return response.data;
  },

  approveOrReject: async (
    fundRequestId: string,
    action: FundRequestAction,
    setContractAmount?: number,
    rejectionReason?: string,
  ): Promise<FundRequestResponseDto> => {
    try {
      const payload: Partial<ApproveRejectPayload> = {
        action: action as ApproveRejectPayload["action"],
      };

      if (setContractAmount !== undefined) payload.setContractAmount = setContractAmount;
      if (rejectionReason !== undefined) payload.rejectionReason = rejectionReason;

      const { data } = await apiClient.patch<FundRequestResponseDto>(
        `/fund-requests/${fundRequestId}/action`,
        payload,
      );
      return data;
    } catch (error) {
      // ✅ PRODUCTION TIP: Re-throws via handleApiError utility
      // so TanStack Query triggers its 'onError' callback.
      return handleApiError(error);
    }
  },

  fetchAdminFundRequests: async (
    filters?: AdminFundRequestFilters,
    cursor?: string, // 🟢 Accept the cursor from the hook
    limit = 20, // 🟢 Accept the limit
  ): Promise<PaginatedFundRequestResponse> => {
    // 🟢 Return the Object type
    try {
      const { data } = await apiClient.get<PaginatedFundRequestResponse>("/fund-requests/admin", {
        params: {
          query: filters?.search?.trim() || undefined,
          status: filters?.status === "ALL" ? undefined : filters?.status,
          fromDate: filters?.startDate?.toISOString(),
          toDate: filters?.endDate?.toISOString(),
          cursor, // 🟢 Send to backend
          limit, // 🟢 Send to backend
        },
      });
      return data; // Returns { data: [...], nextCursor: "..." }
    } catch (err) {
      console.error("Admin fetch error:", err);
      // Return the correct object structure even on error
      return { data: [], nextCursor: null };
    }
  },
};
