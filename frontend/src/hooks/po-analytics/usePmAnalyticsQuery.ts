import { useQuery, useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { fetchPmDashboard, fetchPmAgingList, fetchPmAgingListV2 } from "@/api/po-analytics/poAnalytics.api";
import type { PoAgingDaysPaginatedResponse, PoAgingDuidCardsPaginatedResponse, PoAgingFilterState } from "@/types/po-analytics/po-analytics.types";

/**
 * 🔒 OLD PIPELINE: Left completely untouched so your current app doesn't break
 */
export const usePmAnalyticsHooks = (filters: PoAgingFilterState) => {
  const isReady = !!filters?.pmId;

  const dashboardQuery = useQuery({
    queryKey: ["pm-dashboard", filters],
    queryFn: () => fetchPmDashboard(filters),
    enabled: isReady,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const listQuery = useInfiniteQuery<PoAgingDaysPaginatedResponse, Error, InfiniteData<PoAgingDaysPaginatedResponse>, [string, PoAgingFilterState], string | undefined>({
    queryKey: ["pm-aging-list", filters],
    queryFn: ({ pageParam }) => fetchPmAgingList({ ...filters, cursor: pageParam }),
    enabled: isReady,
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  return { dashboardQuery, listQuery };
};

/**
 * 🌟 PARALLEL V2 PIPELINE: Built separately so you can test the new system safely
 */
export const usePmAnalyticsHooksV2 = (filters: PoAgingFilterState) => {
  const isReady = !!filters?.pmId;

  const dashboardQuery = useQuery({
    queryKey: ["pm-dashboard", filters],
    queryFn: () => fetchPmDashboard(filters),
    enabled: isReady,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const listQuery = useInfiniteQuery<
    PoAgingDuidCardsPaginatedResponse,
    Error,
    InfiniteData<PoAgingDuidCardsPaginatedResponse>, // 🌟 Typed specifically for the pre-grouped cards!
    [string, PoAgingFilterState],
    string | undefined
  >({
    queryKey: ["pm-aging-list-v2", filters],
    // The server V2 pagination steps forward by page numbers instead of cursors
    queryFn: ({ pageParam }) => fetchPmAgingListV2({ ...filters, page: pageParam ? Number(pageParam) : 1 }),
    enabled: isReady,
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  return { dashboardQuery, listQuery };
};
