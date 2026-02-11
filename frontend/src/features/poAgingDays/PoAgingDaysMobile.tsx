import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Filter, X, Package, FileText } from "lucide-react";

// ============================================
// TYPES & INTERFACES
// ============================================

export interface PoAgingDaysResponse {
    id: string;
    duid: string;
    poNumber: string;
    prNumber: string;
    projectCode: string;
    projectName: string;
    pm: string;
    pmId: string;
    poLineNumber: string;
    poType: string;
    poIssuedDate: Date;
    poInvoiceDate?: Date | null;
    allowedOpenDays: number;
    numberOfDaysOpen: number;
    agingFlag: "GREEN" | "WARNING" | "RED";
    itemCode: string;
    itemDescription: string;
    poInvoiceStatus: "INVOICED" | "NOT_INVOICED" | null;
}

interface KPIMetrics {
    invoicedPOs: number;
    notInvoicedPOs: number;
    invoiceRate: number;
    avgPoAgingDays: number;
}

interface Props {
    currentPmId: string;
    currentPmName: string;
}

interface POGroup {
    poNumber: string;
    lines: PoAgingDaysResponse[];
    invoicedCount: number;
    notInvoicedCount: number;
    maxDaysOpen: number;
    worstAgingFlag: "GREEN" | "WARNING" | "RED";
}

interface DUIDGroup {
    duid: string;
    pos: POGroup[];
    totalLines: number;
    totalInvoiced: number;
    totalNotInvoiced: number;
    maxDaysOpen: number;
    worstAgingFlag: "GREEN" | "WARNING" | "RED";
    projectCode: string;
    projectName: string;
}

const ITEMS_PER_LOAD = 20;

// ============================================
// MOCK DATA
// ============================================

const generateMockData = (count: number, pmId: string): PoAgingDaysResponse[] => {
    const mockData: PoAgingDaysResponse[] = [];
    const pmName = "John Doe";
    const projects = ["PRJ-2024-001", "PRJ-2024-002", "PRJ-2024-003", "PRJ-2024-004"];
    const projectNames = ["Enterprise Platform", "Mobile App Redesign", "Data Migration", "Cloud Infrastructure"];
    const poTypes = ["Standard", "Rush", "Blanket", "Contract"];

    // Create DUIDs (fewer than total records)
    const numDUIDs = Math.floor(count / 6); // Each DUID will have ~6 records (2 POs, 3 lines each)

    for (let d = 0; d < numDUIDs; d++) {
        const duid = `DUID-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
        const projectIndex = Math.floor(Math.random() * projects.length);

        // Each DUID has 2-3 PO Numbers
        const numPOs = 2 + Math.floor(Math.random() * 2);

        for (let p = 0; p < numPOs; p++) {
            const poNumber = `PO-2024-${String(d * 10 + p + 1).padStart(5, "0")}`;

            // Each PO has 2-4 lines
            const numLines = 2 + Math.floor(Math.random() * 3);

            for (let l = 0; l < numLines; l++) {
                const daysOpen = Math.floor(Math.random() * 120);
                const allowedDays = 30 + Math.floor(Math.random() * 30);

                let flag: "GREEN" | "WARNING" | "RED";
                if (daysOpen <= allowedDays * 0.7) flag = "GREEN";
                else if (daysOpen <= allowedDays) flag = "WARNING";
                else flag = "RED";

                const isInvoiced = Math.random() > 0.4;
                const poIssuedDate = new Date();
                poIssuedDate.setDate(poIssuedDate.getDate() - daysOpen);
                poIssuedDate.setMonth(poIssuedDate.getMonth() - Math.floor(Math.random() * 12));

                mockData.push({
                    id: `PO-${mockData.length + 1000}`,
                    duid: duid,
                    poNumber: poNumber,
                    prNumber: `PR-2024-${String(mockData.length + 1).padStart(5, "0")}`,
                    projectCode: projects[projectIndex],
                    projectName: projectNames[projectIndex],
                    pm: pmName,
                    pmId: pmId,
                    poLineNumber: String(l + 1),
                    poType: poTypes[Math.floor(Math.random() * poTypes.length)],
                    poIssuedDate: poIssuedDate,
                    poInvoiceDate: isInvoiced ? new Date() : null,
                    allowedOpenDays: allowedDays,
                    numberOfDaysOpen: daysOpen,
                    agingFlag: flag,
                    itemCode: `ITEM-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
                    itemDescription: `Equipment and materials for ${projectNames[projectIndex]}`,
                    poInvoiceStatus: isInvoiced ? "INVOICED" : "NOT_INVOICED",
                });
            }
        }
    }

    return mockData;
};

// ============================================
// MAIN COMPONENT
// ============================================

const PoAgingDaysMobile: React.FC<Props> = ({ currentPmId, currentPmName }) => {
    // Date filter states
    const [showFilters, setShowFilters] = useState(false);
    const [dateFilterMode, setDateFilterMode] = useState<"year" | "month" | "day" | "range">("year");
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
    const [dateRangeStart, setDateRangeStart] = useState<string>("");
    const [dateRangeEnd, setDateRangeEnd] = useState<string>("");
    const [filterPOType, setFilterPOType] = useState<string>("all");

    // Expansion states
    const [expandedDUID, setExpandedDUID] = useState<string | null>(null);
    const [expandedPO, setExpandedPO] = useState<string | null>(null);

    const [displayedItems, setDisplayedItems] = useState(ITEMS_PER_LOAD);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Calculate date range for API call
    const apiDateRange = useMemo(() => {
        const start = new Date(selectedYear, 0, 1);
        const end = new Date(selectedYear, 11, 31, 23, 59, 59);

        switch (dateFilterMode) {
            case "year":
                return { start, end };
            case "month":
                return {
                    start: new Date(selectedYear, selectedMonth - 1, 1),
                    end: new Date(selectedYear, selectedMonth, 0, 23, 59, 59),
                };
            case "day":
                return {
                    start: new Date(selectedYear, selectedMonth - 1, selectedDay, 0, 0, 0),
                    end: new Date(selectedYear, selectedMonth - 1, selectedDay, 23, 59, 59),
                };
            case "range":
                return {
                    start: dateRangeStart ? new Date(dateRangeStart) : new Date(selectedYear, 0, 1),
                    end: dateRangeEnd ? new Date(dateRangeEnd) : new Date(selectedYear, 11, 31, 23, 59, 59),
                };
            default:
                return { start, end };
        }
    }, [dateFilterMode, selectedYear, selectedMonth, selectedDay, dateRangeStart, dateRangeEnd]);

    // ============================================
    // BACKEND INTEGRATION (Commented out)
    // ============================================

    // const { data: allPoData = [], isLoading: isLoadingPO } = useQuery({
    //   queryKey: ['poAgingDaysMobile', apiDateRange, currentPmId],
    //   queryFn: async () => {
    //     const response = await fetch('/api/po-aging-days', {
    //       method: 'POST',
    //       headers: { 'Content-Type': 'application/json' },
    //       body: JSON.stringify({
    //         startDate: apiDateRange.start.toISOString(),
    //         endDate: apiDateRange.end.toISOString(),
    //         pmId: currentPmId,
    //       }),
    //     });
    //     if (!response.ok) throw new Error('Failed to fetch PO data');
    //     return response.json();
    //   },
    // });

    // ============================================
    // MOCK DATA USAGE
    // ============================================

    const allPoData = useMemo(() => {
        return generateMockData(120, currentPmId);
    }, [currentPmId]);

    const isLoadingPO = false;

    // ============================================
    // FILTERING LOGIC
    // ============================================

    const filteredData = useMemo(() => {
        let filtered = [...allPoData];

        // Apply PO Type filter
        if (filterPOType !== "all") {
            filtered = filtered.filter((po) => po.poType === filterPOType);
        }

        return filtered;
    }, [allPoData, filterPOType]);

    // Calculate metrics from filtered data
    const metrics = useMemo((): KPIMetrics => {
        const data = filteredData;
        if (data.length === 0) {
            return {
                invoicedPOs: 0,
                notInvoicedPOs: 0,
                invoiceRate: 0,
                avgPoAgingDays: 0,
            };
        }

        const invoiced = data.filter((po) => po.poInvoiceStatus === "INVOICED").length;
        const notInvoiced = data.filter((po) => po.poInvoiceStatus === "NOT_INVOICED").length;
        const avgDays = data.reduce((sum, po) => sum + po.numberOfDaysOpen, 0) / data.length;

        return {
            invoicedPOs: invoiced,
            notInvoicedPOs: notInvoiced,
            invoiceRate: (invoiced / data.length) * 100,
            avgPoAgingDays: avgDays,
        };
    }, [filteredData]);

    // Group by DUID → PO Number → Lines
    const groupedByDUID = useMemo(() => {
        const duidGroups: { [key: string]: DUIDGroup } = {};

        filteredData.forEach((po) => {
            // Initialize DUID group if it doesn't exist
            if (!duidGroups[po.duid]) {
                duidGroups[po.duid] = {
                    duid: po.duid,
                    pos: [],
                    totalLines: 0,
                    totalInvoiced: 0,
                    totalNotInvoiced: 0,
                    maxDaysOpen: 0,
                    worstAgingFlag: "GREEN",
                    projectCode: po.projectCode,
                    projectName: po.projectName,
                };
            }

            // Find or create PO group within DUID
            let poGroup = duidGroups[po.duid].pos.find((p) => p.poNumber === po.poNumber);
            if (!poGroup) {
                poGroup = {
                    poNumber: po.poNumber,
                    lines: [],
                    invoicedCount: 0,
                    notInvoicedCount: 0,
                    maxDaysOpen: 0,
                    worstAgingFlag: "GREEN",
                };
                duidGroups[po.duid].pos.push(poGroup);
            }

            // Add line to PO group
            poGroup.lines.push(po);
            duidGroups[po.duid].totalLines++;

            // Update counts
            if (po.poInvoiceStatus === "INVOICED") {
                poGroup.invoicedCount++;
                duidGroups[po.duid].totalInvoiced++;
            }
            if (po.poInvoiceStatus === "NOT_INVOICED") {
                poGroup.notInvoicedCount++;
                duidGroups[po.duid].totalNotInvoiced++;
            }

            // Update max days open
            if (po.numberOfDaysOpen > poGroup.maxDaysOpen) {
                poGroup.maxDaysOpen = po.numberOfDaysOpen;
            }
            if (po.numberOfDaysOpen > duidGroups[po.duid].maxDaysOpen) {
                duidGroups[po.duid].maxDaysOpen = po.numberOfDaysOpen;
            }

            // Update aging flags
            if (po.agingFlag === "RED") {
                poGroup.worstAgingFlag = "RED";
                duidGroups[po.duid].worstAgingFlag = "RED";
            } else if (po.agingFlag === "WARNING" && poGroup.worstAgingFlag !== "RED") {
                poGroup.worstAgingFlag = "WARNING";
                if (duidGroups[po.duid].worstAgingFlag !== "RED") {
                    duidGroups[po.duid].worstAgingFlag = "WARNING";
                }
            }
        });

        // Sort DUIDs by worst aging
        return Object.values(duidGroups).sort((a, b) => b.maxDaysOpen - a.maxDaysOpen);
    }, [filteredData]);

    // Displayed groups for infinite scroll
    const displayedGroups = useMemo(() => {
        return groupedByDUID.slice(0, displayedItems);
    }, [groupedByDUID, displayedItems]);

    // Reset displayed items when filters change
    useEffect(() => {
        setDisplayedItems(ITEMS_PER_LOAD);
        setExpandedDUID(null);
        setExpandedPO(null);
    }, [dateFilterMode, selectedYear, selectedMonth, selectedDay, dateRangeStart, dateRangeEnd, filterPOType]);

    // Infinite scroll logic
    const loadMore = useCallback(() => {
        if (displayedItems < groupedByDUID.length) {
            setDisplayedItems((prev) => Math.min(prev + ITEMS_PER_LOAD, groupedByDUID.length));
        }
    }, [displayedItems, groupedByDUID.length]);

    useEffect(() => {
        if (loadMoreRef.current) {
            observerRef.current = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting) {
                        loadMore();
                    }
                },
                { threshold: 0.1 },
            );

            observerRef.current.observe(loadMoreRef.current);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [loadMore]);

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    const getAgingFlagColor = (flag: string) => {
        switch (flag) {
            case "GREEN":
                return "bg-emerald-500";
            case "WARNING":
                return "bg-amber-500";
            case "RED":
                return "bg-rose-500";
            default:
                return "bg-gray-500";
        }
    };

    const getAgingFlagTextColor = (flag: string) => {
        switch (flag) {
            case "GREEN":
                return "text-emerald-600";
            case "WARNING":
                return "text-amber-600";
            case "RED":
                return "text-rose-600";
            default:
                return "text-gray-600";
        }
    };

    const getAgingFlagBgColor = (flag: string) => {
        switch (flag) {
            case "GREEN":
                return "bg-emerald-50";
            case "WARNING":
                return "bg-amber-50";
            case "RED":
                return "bg-rose-50";
            default:
                return "bg-gray-50";
        }
    };

    const getInvoiceStatusColor = (status: string | null) => {
        if (status === "INVOICED") return "bg-blue-50 text-blue-700 border-blue-200";
        if (status === "NOT_INVOICED") return "bg-orange-50 text-orange-700 border-orange-200";
        return "bg-gray-50 text-gray-700 border-gray-200";
    };

    const formatDate = (date: Date | null | undefined) => {
        if (!date) return "N/A";
        return new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const toggleDUID = (duid: string) => {
        if (expandedDUID === duid) {
            setExpandedDUID(null);
            setExpandedPO(null);
        } else {
            setExpandedDUID(duid);
            setExpandedPO(null);
        }
    };

    const togglePO = (poNumber: string) => {
        setExpandedPO(expandedPO === poNumber ? null : poNumber);
    };

    const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
    const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 via-indigo-50/20 to-slate-50 pb-20">
            {/* Header */}
            <div className="bg-linear-to-r from-indigo-600 to-indigo-700 shadow-lg sticky top-0 z-10">
                <div className="p-5">
                    <h1 className="text-2xl font-bold text-white mb-1">PO Aging Dashboard</h1>
                    <p className="text-sm text-indigo-100">Welcome, {currentPmName}</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="p-4">
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-slate-500 text-xs font-bold uppercase tracking-wide">Invoiced</div>
                            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-emerald-600">{metrics.invoicedPOs}</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-slate-500 text-xs font-bold uppercase tracking-wide">Not Invoiced</div>
                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-orange-600">{metrics.notInvoicedPOs}</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-slate-500 text-xs font-bold uppercase tracking-wide">Invoice Rate</div>
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">{metrics.invoiceRate.toFixed(1)}%</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-slate-500 text-xs font-bold uppercase tracking-wide">Avg Aging</div>
                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-purple-600">
                            {metrics.avgPoAgingDays.toFixed(0)}
                            <span className="text-sm text-slate-500 ml-1">d</span>
                        </div>
                    </div>
                </div>

                {/* Filter Button */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="w-full bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center justify-between mb-4 active:bg-slate-50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-slate-600" />
                        <span className="font-bold text-slate-900">Filters</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-slate-600 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                </button>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4 space-y-4">
                        {/* Date Filter Mode */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Date Range</label>
                            <div className="grid grid-cols-4 gap-2 mb-3">
                                {(["year", "month", "day", "range"] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => setDateFilterMode(mode)}
                                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                            dateFilterMode === mode ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-700"
                                        }`}
                                    >
                                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                    </button>
                                ))}
                            </div>

                            {/* Year selector */}
                            {(dateFilterMode === "year" || dateFilterMode === "month" || dateFilterMode === "day") && (
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                    className="w-full px-3 py-2 mb-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-sm font-medium"
                                >
                                    {years.map((year) => (
                                        <option key={year} value={year}>
                                            {year}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {/* Month selector */}
                            {(dateFilterMode === "month" || dateFilterMode === "day") && (
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                    className="w-full px-3 py-2 mb-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-sm font-medium"
                                >
                                    {months.map((month, idx) => (
                                        <option key={month} value={idx + 1}>
                                            {month}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {/* Day selector */}
                            {dateFilterMode === "day" && (
                                <select
                                    value={selectedDay}
                                    onChange={(e) => setSelectedDay(Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-sm font-medium"
                                >
                                    {days.map((day) => (
                                        <option key={day} value={day}>
                                            {day}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {/* Date range inputs */}
                            {dateFilterMode === "range" && (
                                <div className="space-y-2">
                                    <input
                                        type="date"
                                        value={dateRangeStart}
                                        onChange={(e) => setDateRangeStart(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-medium"
                                        placeholder="Start date"
                                    />
                                    <input
                                        type="date"
                                        value={dateRangeEnd}
                                        onChange={(e) => setDateRangeEnd(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-medium"
                                        placeholder="End date"
                                    />
                                </div>
                            )}
                        </div>

                        {/* PO Type Filter */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">PO Type</label>
                            <select
                                value={filterPOType}
                                onChange={(e) => setFilterPOType(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-sm"
                            >
                                <option value="all">All Types</option>
                                <option value="Standard">Standard</option>
                                <option value="Rush">Rush</option>
                                <option value="Blanket">Blanket</option>
                                <option value="Contract">Contract</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* Results Summary */}
                <div className="mb-3 text-sm text-slate-600 px-1">
                    Showing {displayedGroups.length} of {groupedByDUID.length} DUIDs
                </div>

                {/* DUID Cards */}
                <div className="space-y-3">
                    {isLoadingPO ? (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-slate-500">Loading...</span>
                            </div>
                        </div>
                    ) : displayedGroups.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">
                            No purchase orders found
                        </div>
                    ) : (
                        <>
                            {displayedGroups.map((duidGroup) => (
                                <div
                                    key={duidGroup.duid}
                                    className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden transition-all ${
                                        expandedDUID === duidGroup.duid
                                            ? `border-${duidGroup.worstAgingFlag === "RED" ? "rose" : duidGroup.worstAgingFlag === "WARNING" ? "amber" : "emerald"}-200`
                                            : "border-slate-200"
                                    }`}
                                >
                                    {/* DUID Header */}
                                    <div
                                        onClick={() => toggleDUID(duidGroup.duid)}
                                        className={`p-4 cursor-pointer active:bg-slate-50 transition-colors ${getAgingFlagBgColor(duidGroup.worstAgingFlag)}`}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Package className="w-4 h-4 text-slate-600" />
                                                    <h3 className="text-base font-bold text-slate-900">{duidGroup.duid}</h3>
                                                </div>
                                                <p className="text-xs text-slate-600 mb-1">
                                                    {duidGroup.projectCode} - {duidGroup.projectName}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {duidGroup.pos.length} PO{duidGroup.pos.length > 1 ? "s" : ""}, {duidGroup.totalLines}{" "}
                                                    line{duidGroup.totalLines > 1 ? "s" : ""}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${getAgingFlagColor(duidGroup.worstAgingFlag)}`} />
                                                <ChevronDown
                                                    className={`w-5 h-5 text-slate-400 transition-transform ${
                                                        expandedDUID === duidGroup.duid ? "rotate-180" : ""
                                                    }`}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs">
                                            <div className="flex items-center gap-1">
                                                <span className="text-slate-500">Max Days:</span>
                                                <span className={`font-bold ${getAgingFlagTextColor(duidGroup.worstAgingFlag)}`}>
                                                    {duidGroup.maxDaysOpen}
                                                </span>
                                            </div>
                                            <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-emerald-600 font-bold">{duidGroup.totalInvoiced}</span>
                                                <span className="text-slate-500">inv</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-orange-600 font-bold">{duidGroup.totalNotInvoiced}</span>
                                                <span className="text-slate-500">not inv</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded POs */}
                                    {expandedDUID === duidGroup.duid && (
                                        <div className="border-t border-slate-200 bg-slate-50/50">
                                            {duidGroup.pos.map((poGroup, poIndex) => (
                                                <div key={poGroup.poNumber} className={`${poIndex > 0 ? "border-t border-slate-200" : ""}`}>
                                                    {/* PO Header */}
                                                    <div
                                                        onClick={() => togglePO(poGroup.poNumber)}
                                                        className="p-4 cursor-pointer active:bg-slate-100 transition-colors bg-white"
                                                    >
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <FileText className="w-4 h-4 text-indigo-600" />
                                                                    <h4 className="text-sm font-bold text-slate-900">{poGroup.poNumber}</h4>
                                                                </div>
                                                                <p className="text-xs text-slate-600">
                                                                    {poGroup.lines.length} line{poGroup.lines.length > 1 ? "s" : ""}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className={`w-2.5 h-2.5 rounded-full ${getAgingFlagColor(poGroup.worstAgingFlag)}`}
                                                                />
                                                                <ChevronDown
                                                                    className={`w-4 h-4 text-slate-400 transition-transform ${
                                                                        expandedPO === poGroup.poNumber ? "rotate-180" : ""
                                                                    }`}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 text-xs">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-slate-500">Days:</span>
                                                                <span
                                                                    className={`font-bold ${getAgingFlagTextColor(poGroup.worstAgingFlag)}`}
                                                                >
                                                                    {poGroup.maxDaysOpen}
                                                                </span>
                                                            </div>
                                                            <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-emerald-600 font-bold">{poGroup.invoicedCount}</span>
                                                                <span className="text-slate-500">inv</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-orange-600 font-bold">
                                                                    {poGroup.notInvoicedCount}
                                                                </span>
                                                                <span className="text-slate-500">not inv</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Expanded Lines */}
                                                    {expandedPO === poGroup.poNumber && (
                                                        <div className="bg-slate-50">
                                                            {poGroup.lines.map((line, lineIndex) => (
                                                                <div
                                                                    key={line.id}
                                                                    className={`p-4 ${
                                                                        lineIndex < poGroup.lines.length - 1
                                                                            ? "border-b border-slate-200"
                                                                            : ""
                                                                    }`}
                                                                >
                                                                    <div className="mb-3">
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <span className="text-xs font-bold text-slate-500 uppercase">
                                                                                Line {line.poLineNumber}
                                                                            </span>
                                                                            <span
                                                                                className={`px-2 py-0.5 rounded-lg text-xs font-bold ${getAgingFlagColor(line.agingFlag)} text-white`}
                                                                            >
                                                                                {line.agingFlag}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-sm font-bold text-slate-900 mb-1">
                                                                            {line.itemCode}
                                                                        </p>
                                                                        <p className="text-xs text-slate-600 mb-2">
                                                                            {line.itemDescription}
                                                                        </p>
                                                                    </div>

                                                                    <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                                                                        <div>
                                                                            <span className="text-slate-500">PR Number:</span>
                                                                            <p className="font-bold text-slate-900">{line.prNumber}</p>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-slate-500">PO Type:</span>
                                                                            <p className="font-bold text-slate-900">{line.poType}</p>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-slate-500">Days Open:</span>
                                                                            <p
                                                                                className={`font-bold ${getAgingFlagTextColor(line.agingFlag)}`}
                                                                            >
                                                                                {line.numberOfDaysOpen} / {line.allowedOpenDays}
                                                                            </p>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-slate-500">Issued:</span>
                                                                            <p className="font-bold text-slate-900">
                                                                                {formatDate(line.poIssuedDate)}
                                                                            </p>
                                                                        </div>
                                                                        <div className="col-span-2">
                                                                            <span className="text-slate-500">Invoice Date:</span>
                                                                            <p className="font-bold text-slate-900">
                                                                                {formatDate(line.poInvoiceDate)}
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    <div>
                                                                        <span
                                                                            className={`px-3 py-1 rounded-lg text-xs font-bold border ${getInvoiceStatusColor(line.poInvoiceStatus)}`}
                                                                        >
                                                                            {line.poInvoiceStatus || "N/A"}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Load More Trigger */}
                            {displayedItems < groupedByDUID.length && (
                                <div ref={loadMoreRef} className="py-4 text-center">
                                    <div className="inline-flex items-center gap-2 text-slate-500">
                                        <div className="w-5 h-5 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                        Loading more...
                                    </div>
                                </div>
                            )}

                            {/* End of List */}
                            {displayedItems >= groupedByDUID.length && groupedByDUID.length > 0 && (
                                <div className="py-4 text-center text-sm text-slate-500">
                                    End of results ({groupedByDUID.length} DUIDs total)
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PoAgingDaysMobile;
