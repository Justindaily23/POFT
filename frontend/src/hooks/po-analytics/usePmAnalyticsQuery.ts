import { useQuery, useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { fetchPmDashboard, fetchPmAgingList } from "@/api/po-analytics/poAnalytics.api";
import type {
  PoAgingDaysPaginatedResponse,
  PoAgingFilterState,
} from "@/types/po-analytics/po-analytics.types";

export const usePmAnalyticsHooks = (filters: PoAgingFilterState) => {
  // 🔒 Production Guard: Only run if we have a PM name
  const isReady = !!filters?.pmId;

  // 1. DASHBOARD QUERY
  const dashboardQuery = useQuery({
    queryKey: ["pm-dashboard", filters],
    queryFn: () => fetchPmDashboard(filters),
    enabled: isReady, // Now TypeScript finds 'isReady' defined above
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 2. AGING LIST QUERY
  const listQuery = useInfiniteQuery<
    PoAgingDaysPaginatedResponse,
    Error,
    InfiniteData<PoAgingDaysPaginatedResponse>, // ✅ Tells TS the data has a .pages property
    [string, PoAgingFilterState],
    string | undefined
  >({
    queryKey: ["pm-aging-list", filters],
    queryFn: ({ pageParam }) => fetchPmAgingList({ ...filters, cursor: pageParam }),
    enabled: isReady, // Prevents "undefined" API calls
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  return { dashboardQuery, listQuery };
};
