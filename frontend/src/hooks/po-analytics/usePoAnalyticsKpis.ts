import { useQuery } from "@tanstack/react-query";
import type {
  PoAgingDashboardResponse,
  PoAgingFilterState,
} from "@/types/po-analytics/po-analytics.types";
import { fetchPoAgingDashboard } from "@/api/po-analytics/poAnalytics.api";

export const usePoAgingKpis = (query: PoAgingFilterState) => {
  const { data, isLoading, error } = useQuery<PoAgingDashboardResponse, Error>({
    // Important: Query key must include the query object to trigger refetches
    queryKey: ["po-aging-kpis", query],
    queryFn: () => fetchPoAgingDashboard(query),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const metrics = data?.kpis ?? {
    totalPOLines: 0,
    invoicedPOs: 0,
    notInvoicedPOs: 0,
    invoiceRate: 0,
    avgPoAgingDays: 0,
    criticalAgedPos: 0,
  };

  return {
    dashboard: data,
    metrics,
    topCriticalProjects: data?.topCriticalProjects ?? [],
    duids: data?.duids ?? [],
    isLoading,
    error,
  };
};
