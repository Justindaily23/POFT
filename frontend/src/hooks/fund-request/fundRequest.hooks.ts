import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { fundRequestApi } from "@/api/fund-request/fundRequest.api";
import type { AppAxiosError } from "@/types/api/api.types";
import type { CreateFundRequestInput } from "../../utils/fund-request/schema";
import type {
  AdminFundRequestFilters,
  FundRequestAction,
  FundRequestHistory,
  FundRequestResponseDto,
  PaginatedFundRequestResponse,
  POLineSearchResponseData,
} from "../../types/fund-request/fundRequest.type";

/**
 * Search PO Lines by DUID or PO Number
 */
export function useSearchPOLines(query: string) {
  return useQuery<POLineSearchResponseData[], AppAxiosError>({
    queryKey: ["po-search", query],
    queryFn: async () => {
      const results: FundRequestResponseDto[] = await fundRequestApi.searchByDuidOrPoNumber(query);

      // Map API response to frontend POLineSearchResponseData type
      return results.map((item) => ({
        ...item,
        poIssuedDate: item.poIssuedDate ? new Date(item.poIssuedDate) : null,
      }));
    },
    enabled: query.trim().length > 2,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}

/**
 * Submit a new fund request
 */
export function useSubmitFundRequest() {
  const queryClient = useQueryClient();
  // Changed <any> to <FundRequestResponseDto>
  return useMutation<FundRequestResponseDto, AppAxiosError, CreateFundRequestInput>({
    mutationFn: (data: CreateFundRequestInput) => fundRequestApi.submitRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pm-requests"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["po-search"] });
    },
  });
}

/**
 * Fetch fund request history for a specific DUID and PO line
 */
export function useFundRequestHistory(poLinedId?: string) {
  return useQuery<FundRequestHistory[], AppAxiosError>({
    queryKey: ["fund-request-history", poLinedId],
    queryFn: async () => {
      if (!poLinedId) return [];
      const response: FundRequestResponseDto[] =
        await fundRequestApi.getRequestsByDuidAndPoLine(poLinedId);

      return response.map((req) => ({
        id: req.id,
        status: req.status,
        requestedAmount: req.requestedAmount,
        requestPurpose: req.requestPurpose,
        createdAt: req.createdAt,
        approvedAt: req.status === "APPROVED" ? req.createdAt : undefined,
      }));
    },
    enabled: Boolean(poLinedId),
  });
}

/**
 * Fetch all PM requests
 */
export function useAllPmRequests() {
  return useQuery<FundRequestResponseDto[], AppAxiosError>({
    queryKey: ["pm-requests"],
    queryFn: () => fundRequestApi.getAllPmRequests(),
  });
}

/**
 * Fetch admin fund requests with filters
 */
export const useAdminFundRequests = (filters: AdminFundRequestFilters) => {
  return useInfiniteQuery<PaginatedFundRequestResponse, AppAxiosError, FundRequestResponseDto[]>({
    queryKey: ["adminFundRequests", filters] as const,

    // Passes the pageParam (cursor) to the API
    queryFn: ({ pageParam }) =>
      fundRequestApi.fetchAdminFundRequests(filters, pageParam as string, 20),

    initialPageParam: null,

    // Grabs the next ID from the backend response
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,

    // Flattens the "pages" array into a single list for the UI
    select: (data) =>
      data.pages.flatMap((page) =>
        page.data.map((dto: FundRequestResponseDto) => ({
          ...dto,
          // Your safety ID fallback logic
          id: dto.id || (dto as { _id?: string })._id || (dto as { uuid?: string }).uuid || "",
        })),
      ),

    staleTime: 60000,
    refetchOnWindowFocus: true,
  });
};
/**
 * Approve or Reject a fund request
 */
export function useApproveOrRejectFundRequest() {
  const queryClient = useQueryClient();

  return useMutation<
    FundRequestResponseDto, // Changed from any
    AppAxiosError,
    {
      fundRequestId: string;
      action: FundRequestAction;
      setContractAmount?: number;
      rejectionReason?: string;
    }
  >({
    mutationFn: ({ fundRequestId, action, setContractAmount, rejectionReason }) =>
      fundRequestApi.approveOrReject(fundRequestId, action, setContractAmount, rejectionReason),

    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["adminFundRequests"] }),
        queryClient.invalidateQueries({ queryKey: ["fund-request-history", data.poLineId] }),
        queryClient.invalidateQueries({ queryKey: ["pm-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["po-search"] }),
      ]);
    },

    onError: (error) => {
      const errorData = error.response?.data;
      const errorMessage =
        (Array.isArray(errorData?.message) ? errorData?.message.join(", ") : errorData?.message) ||
        error.message ||
        "Failed to process request";

      // Production check for contract requirements
      if (errorData?.requiresContract) {
        console.warn("Contract required for PO Line:", errorData.poLineId);
      } else {
        console.error("Action Error:", errorMessage);
      }
    },
  });
}
