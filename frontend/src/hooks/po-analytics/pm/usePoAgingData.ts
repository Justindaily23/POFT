import { useInfiniteQuery } from "@tanstack/react-query";
import type {
  PoAgingDashboardResponse,
  PoAgingFilterState,
} from "@/types/po-analytics/po-analytics.types";
import type { AppAxiosError } from "@/types/api/api.types";
import apiClient from "@/api/auth/axios";

/**
 * Infinite Query Hook for PO Aging Data
 */
export const usePoAgingData = (filters: PoAgingFilterState, pmId: string) => {
  // Replace <any, ...> with the actual response interface
  return useInfiniteQuery<PoAgingDashboardResponse, AppAxiosError>({
    queryKey: ["po-aging", filters, pmId],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await apiClient.post("/pm-analytics/aging", {
        ...filters,
        pmId,
        page: pageParam,
      });
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.duids?.length ? filters.page + 1 : undefined),
  });
};
