import { useState } from "react";
import { AdminFilterBar } from "./AdminFilterBar";
import { useAdminFundRequests } from "@/hooks/fund-request/fundRequest.hooks";
import AdminFundRequestCard from "@/components/fund-request/AdminFundRequestCard";
import { Loader2, Clock, History, LayoutDashboard, ShieldCheck } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import type { AdminFundRequestFilters } from "../../types/fund-request/fundRequest.type";

export default function AdminFundRequestDashboard() {
  const [filters, setFilters] = useState<AdminFundRequestFilters>({
    search: "",
    status: "PENDING", // Start with PENDING
    startDate: undefined,
    endDate: undefined,
  });

  // 🟢 1. Destructure the pagination helpers
  const {
    data: requests,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAdminFundRequests(filters);

  // 🟢 2. Sync Tabs with Backend Status
  const handleTabChange = (value: string) => {
    // When switching tabs, we tell the backend to fetch different data
    const status = value === "pending" ? "PENDING" : "APPROVED,REJECTED";
    setFilters((prev) => ({ ...prev, status }));
  };

  const handleFilterChange = (updates: Partial<AdminFundRequestFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const handleReset = () => {
    setFilters({ search: "", status: "PENDING", startDate: undefined, endDate: undefined });
  };

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="animate-spin h-5 w-5 text-slate-400 mb-4" />
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">
          Synchronizing Records...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased">
      <div className="max-w-400 mx-auto px-4 sm:px-8 py-8">
        <header className="mb-6">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-blue-600">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em]">
                  System Admin
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fund Requests</h1>
            </div>
            <AdminFilterBar
              filters={filters}
              onFilterChange={handleFilterChange}
              onReset={handleReset}
            />
          </div>
          <Separator className="mt-6 bg-slate-200/60" />
        </header>

        <Tabs defaultValue="pending" onValueChange={handleTabChange} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="bg-slate-200/40 border border-slate-200 p-1 h-9">
              <TabsTrigger
                value="pending"
                className="px-5 text-[11px] font-bold uppercase tracking-wide"
              >
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                Pending
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="px-5 text-[11px] font-extrabold uppercase tracking-wide"
              >
                <History className="h-3.5 w-3.5 mr-1.5" />
                Audit Trail
              </TabsTrigger>
            </TabsList>
            <div className="hidden md:block text-[12px] font-bold text-slate-400 uppercase tracking-widest">
              {requests?.length || 0} Records Synced
            </div>
          </div>

          {/* SHARED RENDERER: Works for both Tabs because 'requests' matches the active Tab */}
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {requests?.map((req) => (
                <AdminFundRequestCard
                  key={req.id}
                  request={req}
                  isHistory={filters.status !== "PENDING"}
                />
              ))}
            </div>

            {requests?.length === 0 && (
              <div className="py-24 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl bg-white/50">
                <LayoutDashboard className="h-8 w-8 text-slate-200 mb-3" />
                <p className="text-slate-400 text-sm font-medium italic">
                  No ledger entries found.
                </p>
              </div>
            )}

            {/* 🟢 3. The Pagination UI */}
            <div className="flex flex-col items-center justify-center pt-4">
              {hasNextPage ? (
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="px-8 py-2.5 bg-white border border-slate-200 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isFetchingNextPage ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="animate-spin h-3 w-3" />
                      Synchronizing...
                    </div>
                  ) : (
                    "Load More Ledger Entries"
                  )}
                </button>
              ) : (
                /* 🟢 4. The End of Ledger Message */
                requests &&
                requests.length > 0 && (
                  <div className="flex items-center gap-4 w-full max-w-xs opacity-30">
                    <div className="h-px flex-1 bg-slate-400" />
                    <span className="text-[9px] font-black uppercase tracking-[0.3em]">
                      End of Ledger
                    </span>
                    <div className="h-px flex-1 bg-slate-400" />
                  </div>
                )
              )}
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
