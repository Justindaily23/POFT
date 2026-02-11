import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fundRequestApi } from "../features/fundRequests/fundRequest.api";
import type { CreateFundRequestInput } from "../features/fundRequests/schema";
import type {
  AdminFundRequestFilters,
  FundRequestHistory,
  FundRequestResponse,
  FundRequestResponseDto,
  POLineSearchResponseData,
} from "../features/fundRequests/fundRequest.type";

/**
 * Search PO Lines by DUID or PO Number
 */
export function useSearchPOLines(query: string) {
  return useQuery<POLineSearchResponseData[], Error>({
    queryKey: ["po-search", query],
    queryFn: async () => {
      const results: FundRequestResponseDto[] = await fundRequestApi.searchByDuidOrPoNumber(query);

      // Map API response to frontend POLineData type
      return results.map((item) => ({
        ...item,
        poIssuedDate: item.poIssuedDate ? new Date(item.poIssuedDate) : null,
      }));
    },
    enabled: query.trim().length > 2, // only fetch if query is longer than 2 chars
    staleTime: 1000 * 60 * 5, // cache for 5 minutes
    gcTime: 1000 * 60 * 10, // 10 mins in memory
  });
}

/**
 * Submit a new fund request
 */
export function useSubmitFundRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFundRequestInput) => fundRequestApi.submitRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pm-requests"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["po-search"] }); // refresh search if needed
    },
  });
}

/**
 * Fetch fund request history for a specific DUID and PO line
 */
export function useFundRequestHistory(poLinedId?: string) {
  return useQuery<FundRequestHistory[]>({
    queryKey: ["fund-request-history", poLinedId],
    queryFn: async () => {
      if (!poLinedId) return [];
      const response: FundRequestResponseDto[] =
        await fundRequestApi.getRequestsByDuidAndPoLine(poLinedId);

      // Map backend response to FundRequestHistory
      return response.map((req) => ({
        id: req.poLineId,
        status: req.status,
        requestedAmount: req.requestedAmount,
        requestPurpose: req.requestPurpose,
        createdAt: req.createdAt,
        approvedAt: req.status === "APPROVED" ? req.createdAt : undefined, // or real approvedAt if backend provides it
      }));
    },
    enabled: Boolean(poLinedId),
  });
}

/**
 * Fetch all PM requests
 */
export function useAllPmRequests() {
  return useQuery<FundRequestResponseDto[]>({
    queryKey: ["pm-requests"],
    queryFn: () => fundRequestApi.getAllPmRequests(),
  });
}

export const useAdminFundRequests = (filters: AdminFundRequestFilters) => {
  return useQuery<FundRequestResponseDto[], Error, FundRequestResponse[]>({
    queryKey: ["adminFundRequests", filters] as const,
    queryFn: () => fundRequestApi.fetchAdminFundRequests(filters),
    // 1. Transform the DTOs into the Response format your UI expects
    select: (data) =>
      data.map((dto) => ({
        ...dto,
        // Ensure id exists. Map it from _id or uuid if that's what your DTO uses
        id: (dto as any).id || (dto as any)._id || (dto as any).uuid,
      })),
    staleTime: 60000, // Data stays "fresh" in cache for 1 min
    refetchInterval: 15000, // But we check the server every 15 seconds anyway
    refetchOnWindowFocus: true, // Bonus: refresh if they come back from another tab
    placeholderData: [],
  });
};
