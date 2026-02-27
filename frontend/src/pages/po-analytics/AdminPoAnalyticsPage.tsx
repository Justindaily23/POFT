import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Consolidated Hooks
import { usePoAgingKpis } from "@/hooks/po-analytics/usePoAnalyticsKpis";
import { usePoAgingTable } from "@/hooks/po-analytics/usePoAgingTable";
import { usePoAnalyticsState } from "@/hooks/po-analytics/usePoAnalyticsState";

// Components
import { FilterPanel } from "@/components/po-analytics/filters-search/FilterPanel";
import { PoKpiCards } from "@/components/po-analytics/PoKpiCards";
import { TopCriticalProjects } from "@/components/po-analytics/TopCriticalProjects";

// Types
import { type PoAgingLineDto, PO_AGING_FLAG_LABELS } from "@/types/po-analytics/po-analytics.types";

interface Props {
  userRole: "ADMIN" | "SUPER_ADMIN";
}

export const AdminPoAnalyticsPage: React.FC<Props> = ({ userRole }) => {
  // 1. MASTER STATE: Unified source of truth for all filters + Cursor logic
  const { query, filters, updateFilter, paginateNext, paginatePrev, clearAll, canGoBack } =
    usePoAnalyticsState();

  // 2. DATA FETCHING: Both hooks react to the same 'query' object
  const {
    metrics,
    dashboard,
    topCriticalProjects,
    isLoading: isLoadingKpis,
    error: KpiError,
  } = usePoAgingKpis(query);

  const { data: tableResponse, isLoading: isLoadingTable, isFetching } = usePoAgingTable(query);

  // Pagination Helper: ID-based cursor from backend
  const nextId = tableResponse?.nextCursor;

  return (
    <div className="h-screen flex flex-col bg-slate-50/50 overflow-hidden text-slate-900">
      {/* --- UNIFIED FILTER PANEL --- */}
      {/* This panel drives the 5 search boxes and 3 filters */}
      <FilterPanel filters={filters} onFilterChange={updateFilter} onClear={clearAll} />

      {/* --- MAIN SCROLLABLE AREA --- */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-400 mx-auto">
            {/* ERROR NOTIFICATION */}
            {KpiError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
                ⚠️ Failed to sync with database. Please check your connection.
              </div>
            )}

            {/* KPI RIBBON SECTION */}
            <section className="mb-6">
              {dashboard ? (
                <PoKpiCards metrics={metrics} userRole={userRole} />
              ) : (
                <div className="grid grid-cols-5 mb-8 gap-2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="h-18 bg-white border border-slate-200 mb-8 animate-pulse rounded-xl"
                    />
                  ))}
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-8 items-start">
              {/* LEFT: TABLE CONTAINER */}
              <section
                className={`lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200 ${
                  isFetching ? "opacity-60 grayscale-[0.5]" : "opacity-100"
                }`}
              >
                {/* TABLE ACTION HEADER */}
                <div className="px-6 py-4 mt-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                  <h2 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.2em]">
                    Aging Records ({tableResponse?.data?.length || 0})
                  </h2>

                  {/* CURSOR-BASED PAGINATION UI */}
                  <div className="flex items-center gap-4">
                    <button
                      disabled={!canGoBack || isFetching}
                      onClick={paginatePrev}
                      className="p-2 hover:bg-white rounded-lg disabled:opacity-20 transition-all border border-transparent hover:border-slate-200 shadow-xs"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                      PAGE {filters.page}
                    </span>
                    <button
                      disabled={!nextId || isFetching}
                      onClick={() => nextId && paginateNext(nextId)}
                      className="p-2 hover:bg-white rounded-lg disabled:opacity-20 transition-all border border-transparent hover:border-slate-200 shadow-xs"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* THE DATA GRID */}
                <div className="overflow-x-auto min-h-100">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-accent-foreground sticky top-0 z-10 text-slate-50 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4">Duid Project Code & Project Name</th>
                        <th className="px-6 py-4">PO Number & Po Type</th>
                        <th className="px-6 py-4">Aging Days & Issued Date</th>
                        <th className="px-6 py-4 text-center">SLA Status</th>
                        <th className="px-6 py-4 text-right">Po Line</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tableResponse?.data?.map((line: PoAgingLineDto) => (
                        <tr key={line.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-700 text-xs truncate max-w-55">
                              {line.duid}
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase">
                              {line.projectName} • {line.projectCode}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs font-bold text-slate-600">{line.poNumber}</div>
                            <div className="text-[9px] text-indigo-500 font-black uppercase">
                              {line.poType}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-black text-xs">
                            {line.numberOfDaysOpen}
                            <span className="text-slate-400 font-normal">Days</span> •{" "}
                            {new Date(line.poIssuedDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <StatusBadge flag={line.agingFlag} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="text-[14px] text-indigo-800">{line.poLineNumber}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* EMPTY & LOADING STATES */}
                  {!isLoadingTable && tableResponse?.data?.length === 0 && (
                    <div className="p-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                      No Records Found
                    </div>
                  )}
                  {isLoadingTable && (
                    <div className="p-20 text-center text-slate-400 text-[10px] animate-pulse font-black uppercase tracking-widest">
                      Refreshing Workspace...
                    </div>
                  )}
                </div>
              </section>

              {/* RIGHT: SIDEBAR (CRITICAL PROJECTS & GUIDES) */}
              <aside className="lg:col-span-1 space-y-6">
                <TopCriticalProjects projects={topCriticalProjects} isLoading={isLoadingKpis} />

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">
                    SLA Guidelines
                  </h4>
                  <div className="space-y-3">
                    <SlaGuide color="bg-emerald-500" label="Within SLA" />
                    <SlaGuide color="bg-orange-500" label="Warning" />
                    <SlaGuide
                      color="bg-red-500 animate-pulse"
                      label="Critical Breached"
                      isCritical
                    />
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </main>

      {/* GLOBAL BACKGROUND FETCH PROGRESS INDICATOR */}
      {isFetching && !isLoadingTable && (
        <div className="fixed bottom-0 left-0 w-full h-0.5 bg-indigo-500/10 overflow-hidden">
          <div
            className="h-full bg-indigo-600 animate-[progress_2s_ease-in-out_infinite]"
            style={{ width: "40%" }}
          />
        </div>
      )}
    </div>
  );
};

/* --- SHARED UI HELPERS --- */

const SlaGuide = ({
  color,
  label,
  isCritical,
}: {
  color: string;
  label: string;
  isCritical?: boolean;
}) => (
  <div className="flex items-center gap-3">
    <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
    <span className={`text-[10px] font-bold ${isCritical ? "text-red-500" : "text-slate-500"}`}>
      {label}
    </span>
  </div>
);

const StatusBadge = ({ flag }: { flag: string }) => {
  const styles: Record<string, string> = {
    RED: "bg-red-50 text-red-600 border-red-100",
    WARNING: "bg-orange-50 text-orange-600 border-orange-100",
    GREEN: "bg-emerald-50 text-emerald-600 border-emerald-100",
  };
  return (
    <span
      className={`px-2.5 py-1 rounded-md text-[9px] font-black border uppercase tracking-widest ${
        styles[flag] || "bg-slate-50 text-slate-400 border-slate-200"
      }`}
    >
      {PO_AGING_FLAG_LABELS[flag as keyof typeof PO_AGING_FLAG_LABELS] || flag}
    </span>
  );
};
