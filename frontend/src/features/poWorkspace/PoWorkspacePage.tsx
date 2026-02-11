import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FilterPanel } from "@/components/poWokSpace/filter-panel";
import { MetricsBar } from "@/components/poWokSpace/metrics-bar";
import { PODataTable } from "@/components/poWokSpace/po-data-table";
import type { FilterState, POWorkspaceResponse } from "@/lib/po-workspace/types";
import { poWorkspaceApi } from "./poWorkspace.api";
import { FullPageLoader } from "@/components/ui/full-page-loader";

export default function POFinancialWorkspace() {
  const [filters, setFilters] = useState<FilterState>({
    duid: "",
    poNumber: "",
    projectCode: "",
    projectName: "",
    pm: "",
    poTypes: [],
  });

  const { data, isFetching, isLoading, isError, refetch } = useQuery<POWorkspaceResponse>({
    queryKey: ["poWorkspace", filters],
    queryFn: () => poWorkspaceApi.getWorkSpaceData(filters),
    placeholderData: (previousData) => previousData,
    staleTime: 8000,
  });

  // 1. HARD LOADING: Only show on the very first mount with no cached data
  if (isLoading) {
    return <FullPageLoader />;
  }

  // 2. ERROR HANDLING: Production-ready alternative to Toasts
  if (isError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-destructive">Failed to Load PO Data</h2>
          <p className="text-muted-foreground max-w-md">
            There was a problem connecting to the server. Please check your connection or try again.
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-all"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // 3. DATA SAFETY: Ensure data exists before rendering children
  if (!data) return null;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Filter Panel always stays at top */}
      <FilterPanel filters={filters} onFilterChange={setFilters} />

      <div
        className={`flex-1 flex flex-col transition-opacity duration-200 ${isFetching ? "opacity-60" : "opacity-100"}`}
      >
        <MetricsBar
          metrics={data.metrics}
          rowCount={data.data.length}
          totalCount={data.totalCount}
          isStale={isFetching}
        />

        <div className="flex-1 overflow-auto">
          <PODataTable data={data.data || []} />
        </div>
      </div>

      {/* Optional: Subtle loading bar for background fetches (isFetching) */}
      {isFetching && !isLoading && (
        <div className="fixed bottom-0 left-0 w-full h-1 bg-primary/20 overflow-hidden">
          <div className="h-full bg-primary animate-progress-loop" style={{ width: "30%" }} />
        </div>
      )}
    </div>
  );
}
