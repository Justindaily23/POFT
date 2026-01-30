import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FilterPanel } from "@/components/poWokSpace/filter-panel";
import { MetricsBar } from "@/components/poWokSpace/metrics-bar";
import { PODataTable } from "@/components/poWokSpace/po-data-table";
import type { FilterState, POWorkspaceResponse } from "@/lib/po-workspace/types";
import { poWorkspaceApi } from "./poWorkspace.api";
import { FullPageLoader } from "@/components/ui/full-page-loader";
//import { generateMockData } from "@/lib/po-workspace/mock-data";
// import { useState, useMemo, useEffect } from "react";
// import type { FilterState, FinancialMetrics, PurchaseOrderLine } from "@/lib/po-workspace/types";

export default function POFinancialWorkspace() {
    // const [allData, setAllData] = useState<PurchaseOrderLine[]>([]);
    // Manage filters locally
    const [filters, setFilters] = useState<FilterState>({
        duid: "",
        poNumber: "",
        projectCode: "",
        projectName: "",
        pm: "",
        poTypes: [],
    });

    // useEffect(() => {
    //     setAllData(generateMockData(200));
    // }, []);

    /**
     * Sync with database using tanstack
     * Every time filters occcur/changes, automatically fetches from the server
     */
    const { data, isFetching, isLoading } = useQuery<POWorkspaceResponse>({
        queryKey: ["poWorkspace", filters],
        queryFn: () => poWorkspaceApi.getWorkSpaceData(filters),
        placeholderData: (previousData) => previousData, // Keeps UI stable while loading
        staleTime: 5000, // consider data fresh for 5 secs
    });
    // 1 First load (nothing cached yet)
    if (isLoading) {
        return <FullPageLoader />;
    }

    //  Safety net (should rarely happen, but keeps TS + runtime safe)
    if (!data) {
        return null;
    }

    // const filteredData = useMemo(() => {
    //     return allData.filter((row) => {
    //         if (filters.duid && !row.duid.toLowerCase().includes(filters.duid.toLowerCase())) {
    //             return false;
    //         }
    //         if (filters.poNumber && !row.poNumber.toLowerCase().includes(filters.poNumber.toLowerCase())) {
    //             return false;
    //         }
    //         if (filters.projectCode && !row.projectCode.toLowerCase().includes(filters.projectCode.toLowerCase())) {
    //             return false;
    //         }
    //         if (filters.projectName && !row.projectName.toLowerCase().includes(filters.projectName.toLowerCase())) {
    //             return false;
    //         }
    //         if (filters.pm && !row.pm.toLowerCase().includes(filters.pm.toLowerCase())) {
    //             return false;
    //         }
    //         if (filters.poTypes.length > 0 && !filters.poTypes.includes(row.poType)) {
    //             return false;
    //         }
    //         return true;
    //     });
    // }, [allData, filters]);

    // const metrics = useMemo<FinancialMetrics>(() => {
    //     const result = filteredData.reduce(
    //         (acc, row) => ({
    //             totalPOAmount: acc.totalPOAmount + row.poLineAmount,
    //             totalContractAmount: acc.totalContractAmount + row.poLineAmount,
    //             totalAmountRequested: acc.totalAmountRequested + row.amountRequested,
    //             totalAmountSpent: acc.totalAmountSpent + row.amountSpent,
    //             balanceDue: 0,
    //         }),
    //         {
    //             totalPOAmount: 0,
    //             totalContractAmount: 0,
    //             totalAmountRequested: 0,
    //             totalAmountSpent: 0,
    //             balanceDue: 0,
    //         },
    //     );

    //     result.balanceDue = result.totalAmountRequested - result.totalAmountSpent;
    //     return result;
    // }, [filteredData]);
    return (
        <div className="h-screen flex flex-col bg-background">
            <FilterPanel filters={filters} onFilterChange={setFilters} />
            {isLoading || !data ? (
                <FullPageLoader />
            ) : (
                <div className={isFetching ? "opacity-70" : ""}>
                    <MetricsBar metrics={data.metrics} rowCount={data.data.length} totalCount={data.totalCount} isStale={isFetching} />
                    <PODataTable data={data.data} />
                </div>
            )}
        </div>
    );
}
