// import { useState } from "react";
// import { useQuery } from "@tanstack/react-query";
// import { FilterPanel } from "@/components/poWokSpace/filter-panel";
// import { MetricsBar } from "@/components/poWokSpace/metrics-bar";
// import { PODataTable } from "@/components/poWokSpace/po-data-table";
// import type { FilterState, POWorkspaceResponse } from "@/lib/po-workspace/types";
// import { poWorkspaceApi } from "./poWorkspace.api";
// import { FullPageLoader } from "@/components/ui/full-page-loader";
// //import { generateMockData } from "@/lib/po-workspace/mock-data";
// // import { useState, useMemo, useEffect } from "react";
// // import type { FilterState, FinancialMetrics, PurchaseOrderLine } from "@/lib/po-workspace/types";

// export default function POFinancialWorkspace() {
//     // const [allData, setAllData] = useState<PurchaseOrderLine[]>([]);
//     // Manage filters locally
//     const [filters, setFilters] = useState<FilterState>({
//         duid: "",
//         poNumber: "",
//         projectCode: "",
//         projectName: "",
//         pm: "",
//         poTypes: [],
//     });

//     // useEffect(() => {
//     //     setAllData(generateMockData(200));
//     // }, []);

//     /**
//      * Sync with database using tanstack
//      * Every time filters occcur/changes, automatically fetches from the server
//      */
//     const { data, isFetching, isLoading } = useQuery<POWorkspaceResponse>({
//         queryKey: ["poWorkspace", filters],
//         queryFn: () => poWorkspaceApi.getWorkSpaceData(filters),
//         placeholderData: (previousData) => previousData, // Keeps UI stable while loading
//         staleTime: 5000, // consider data fresh for 5 secs
//     });
//     // 1 First load (nothing cached yet)
//     if (isLoading) {
//         return <FullPageLoader />;
//     }

//     //  Safety net (should rarely happen, but keeps TS + runtime safe)
//     if (!data) {
//         return null;
//     }

//     // const filteredData = useMemo(() => {
//     //     return allData.filter((row) => {
//     //         if (filters.duid && !row.duid.toLowerCase().includes(filters.duid.toLowerCase())) {
//     //             return false;
//     //         }
//     //         if (filters.poNumber && !row.poNumber.toLowerCase().includes(filters.poNumber.toLowerCase())) {
//     //             return false;
//     //         }
//     //         if (filters.projectCode && !row.projectCode.toLowerCase().includes(filters.projectCode.toLowerCase())) {
//     //             return false;
//     //         }
//     //         if (filters.projectName && !row.projectName.toLowerCase().includes(filters.projectName.toLowerCase())) {
//     //             return false;
//     //         }
//     //         if (filters.pm && !row.pm.toLowerCase().includes(filters.pm.toLowerCase())) {
//     //             return false;
//     //         }
//     //         if (filters.poTypes.length > 0 && !filters.poTypes.includes(row.poType)) {
//     //             return false;
//     //         }
//     //         return true;
//     //     });
//     // }, [allData, filters]);

//     // const metrics = useMemo<FinancialMetrics>(() => {
//     //     const result = filteredData.reduce(
//     //         (acc, row) => ({
//     //             totalPOAmount: acc.totalPOAmount + row.poLineAmount,
//     //             totalContractAmount: acc.totalContractAmount + row.poLineAmount,
//     //             totalAmountRequested: acc.totalAmountRequested + row.amountRequested,
//     //             totalAmountSpent: acc.totalAmountSpent + row.amountSpent,
//     //             balanceDue: 0,
//     //         }),
//     //         {
//     //             totalPOAmount: 0,
//     //             totalContractAmount: 0,
//     //             totalAmountRequested: 0,
//     //             totalAmountSpent: 0,
//     //             balanceDue: 0,
//     //         },
//     //     );

//     //     result.balanceDue = result.totalAmountRequested - result.totalAmountSpent;
//     //     return result;
//     // }, [filteredData]);
//     return (
//         <div className="h-screen flex flex-col bg-background">
//             <FilterPanel filters={filters} onFilterChange={setFilters} />
//             {isLoading || !data ? (
//                 <FullPageLoader />
//             ) : (
//                 <div className={isFetching ? "opacity-70" : ""}>
//                     <MetricsBar metrics={data.metrics} rowCount={data.data.length} totalCount={data.totalCount} isStale={isFetching} />
//                     <PODataTable data={data.data} />
//                 </div>
//             )}
//         </div>
//     );
// }

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

            <div className={`flex-1 flex flex-col transition-opacity duration-200 ${isFetching ? "opacity-60" : "opacity-100"}`}>
                <MetricsBar metrics={data.metrics} rowCount={data.data.length} totalCount={data.totalCount} isStale={isFetching} />

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
