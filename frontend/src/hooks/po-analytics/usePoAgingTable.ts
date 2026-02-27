import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchPoAgingTable } from "@/api/po-analytics/poAnalytics.api";
import type {
  PoAgingDaysPaginatedResponse,
  PoAgingFilterState, // ✅ Import the filter interface
} from "@/types/po-analytics/po-analytics.types";
import type { AppAxiosError } from "@/types/api/api.types";

/**
 * Hook for Paginated PO Aging Table Data
 */
// ✅ Fixed: Replaced 'any' with the specific filter type
export const usePoAgingTable = (query: PoAgingFilterState) => {
  return useQuery<PoAgingDaysPaginatedResponse, AppAxiosError>({
    queryKey: ["po-aging-table", query],

    // 2. FIX: Call fetchPoAgingTable here
    queryFn: () => fetchPoAgingTable(query),

    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 2,
  });
};
