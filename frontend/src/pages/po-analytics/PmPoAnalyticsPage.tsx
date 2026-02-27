import React from "react";
import { PoAgingKpis } from "@/components/po-analytics/pm/PoAgingKpis";
import { PoAgingFilters } from "@/components/po-analytics/pm/PoAgingFilters";
import { DuidCard } from "@/components/po-analytics/pm/DuidCard";
import { useAuthStore } from "@/stores/authStore";
import { toTitleCase } from "@/lib/utils";
import { usePmAnalytics } from "@/hooks/po-analytics/pm/usePmAnalytics";
import { SkeletonLoader } from "@/components/po-analytics/pm/SkeletonLoader";
import { EmptyState } from "@/components/po-analytics/pm/EmptyState";
import { Spinner } from "@/components/po-analytics/pm/spinner";

const PmPoAnalyticsPage: React.FC = () => {
  const { user, isInitialLoading } = useAuthStore();
  const { state, queries, data } = usePmAnalytics(user?.id ?? "");

  if (isInitialLoading)
    return (
      <div className="p-10 text-center animate-pulse font-black text-slate-300 uppercase">
        Authenticating...
      </div>
    );
  if (!user) return <div className="p-10 text-center font-bold text-red-400">Session expired.</div>;

  return (
    <div className="flex flex-col bg-[#F8FAFC] min-h-screen pb-10">
      {/* Header - Identical Styling */}
      <div className="px-5 pt-4">
        <h1 className="text-xl font-black text-slate-900 tracking-tight">PO Analytics</h1>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Scoped: {toTitleCase(user.name)}
        </p>
      </div>

      <PoAgingKpis
        metrics={data.metrics}
        loading={queries.dashboardQuery.isLoading || queries.listQuery.isLoading}
      />

      <div className="sticky top-0 z-40 bg-[#F8FAFC]/90 backdrop-blur-md border-b border-slate-100">
        <PoAgingFilters {...state} />
      </div>

      <div className="px-4 mt-4 space-y-4 flex-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
          {queries.listQuery.isLoading
            ? "Initializing..."
            : `Active Projects: ${data.groupedByDUID.length}`}
        </p>

        {queries.listQuery.isLoading ? (
          <SkeletonLoader />
        ) : data.groupedByDUID.length === 0 ? (
          <EmptyState />
        ) : (
          data.groupedByDUID.map((group) => (
            <DuidCard
              key={group.duid}
              duidGroup={group}
              isExpanded={state.expandedDUID === group.duid}
              onToggle={() =>
                state.setExpandedDUID(state.expandedDUID === group.duid ? null : group.duid)
              }
              expandedPO={state.expandedPO}
              onTogglePO={(po) => state.setExpandedPO(state.expandedPO === po ? null : po)}
            />
          ))
        )}

        {/* Fixed Callback Ref for Infinite Scroll */}
        <div
          ref={(node) => data.lastElementRef(node)}
          className="py-10 flex flex-col items-center justify-center gap-3"
        >
          {queries.listQuery.isFetchingNextPage && <Spinner />}
          {!queries.listQuery.hasNextPage && data.groupedByDUID.length > 0 && (
            <p className="text-[10px] font-bold text-slate-300 uppercase italic">
              Financial Data Synced
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PmPoAnalyticsPage;
