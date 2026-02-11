import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

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
  totalPOs: number;
  invoicedPOs: number;
  notInvoicedPOs: number;
  invoiceRate: number;
  avgPoAgingDays: number;
}

type UserRole = "ADMIN" | "PM";

interface Props {
  userRole: UserRole;
  currentPmId?: string;
}

const ITEMS_PER_PAGE = 30;

// ============================================
// MOCK DATA (Remove when connecting to backend)
// ============================================

const generateMockData = (count: number, pmId?: string): PoAgingDaysResponse[] => {
  const mockData: PoAgingDaysResponse[] = [];
  const pms = ["John Doe", "Jane Smith", "Bob Johnson", "Alice Williams", "Charlie Brown"];
  const pmIds = ["PM001", "PM002", "PM003", "PM004", "PM005"];
  const projects = ["PRJ-2024-001", "PRJ-2024-002", "PRJ-2024-003", "PRJ-2024-004", "PRJ-2024-005"];
  const projectNames = [
    "Enterprise Platform",
    "Mobile App Redesign",
    "Data Migration",
    "Cloud Infrastructure",
    "Security Upgrade",
  ];
  const poTypes = ["Standard", "Rush", "Blanket", "Contract"];

  for (let i = 0; i < count; i++) {
    const pmIndex = pmId ? pmIds.indexOf(pmId) : Math.floor(Math.random() * pms.length);
    const projectIndex = Math.floor(Math.random() * projects.length);
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
      id: `PO-${i + 1000}`,
      duid: `DUID-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      poNumber: `PO-2024-${String(i + 1).padStart(5, "0")}`,
      prNumber: `PR-2024-${String(i + 1).padStart(5, "0")}`,
      projectCode: projects[projectIndex],
      projectName: projectNames[projectIndex],
      pm: pms[pmIndex],
      pmId: pmIds[pmIndex],
      poLineNumber: String(Math.floor(Math.random() * 10) + 1),
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

  return mockData;
};

// ============================================
// MAIN COMPONENT
// ============================================

const PoAgingDaysDesktop: React.FC<Props> = ({ userRole, currentPmId }) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Date filter states
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFilterMode, setDateFilterMode] = useState<"year" | "month" | "day" | "range">("year");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const [dateRangeStart, setDateRangeStart] = useState<string>("");
  const [dateRangeEnd, setDateRangeEnd] = useState<string>("");

  // Search and filter states
  const [searchPM, setSearchPM] = useState("");
  const [searchDUID, setSearchDUID] = useState("");
  const [searchPONumber, setSearchPONumber] = useState("");
  const [searchProjectCode, setSearchProjectCode] = useState("");
  const [searchProjectName, setSearchProjectName] = useState("");
  const [filterAgingFlag, setFilterAgingFlag] = useState<string>("all");
  const [filterInvoiceStatus, setFilterInvoiceStatus] = useState<string>("all");
  const [filterPOType, setFilterPOType] = useState<string>("all");

  // Sorting
  const [sortField, setSortField] = useState<keyof PoAgingDaysResponse>("numberOfDaysOpen");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

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
  //   queryKey: ['poAgingDays', apiDateRange, currentPmId],
  //   queryFn: async () => {
  //     const response = await fetch('/api/po-aging-days', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({
  //         startDate: apiDateRange.start.toISOString(),
  //         endDate: apiDateRange.end.toISOString(),
  //         pmId: userRole === 'PM' ? currentPmId : undefined,
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
    return generateMockData(200, userRole === "PM" ? currentPmId : undefined);
  }, [userRole, currentPmId]);

  const isLoadingPO = false;

  // ============================================
  // FILTERING, SEARCHING & SORTING LOGIC
  // ============================================

  const filteredAndSearchedData = useMemo(() => {
    let filtered = [...allPoData];

    // Apply search filters (Admin only)
    if (userRole === "ADMIN") {
      if (searchPM.trim()) {
        filtered = filtered.filter(
          (po) =>
            po.pm.toLowerCase().includes(searchPM.toLowerCase()) ||
            po.pmId.toLowerCase().includes(searchPM.toLowerCase()),
        );
      }
      if (searchDUID.trim()) {
        filtered = filtered.filter((po) =>
          po.duid.toLowerCase().includes(searchDUID.toLowerCase()),
        );
      }
      if (searchPONumber.trim()) {
        filtered = filtered.filter((po) =>
          po.poNumber.toLowerCase().includes(searchPONumber.toLowerCase()),
        );
      }
      if (searchProjectCode.trim()) {
        filtered = filtered.filter((po) =>
          po.projectCode.toLowerCase().includes(searchProjectCode.toLowerCase()),
        );
      }
      if (searchProjectName.trim()) {
        filtered = filtered.filter((po) =>
          po.projectName.toLowerCase().includes(searchProjectName.toLowerCase()),
        );
      }
    }

    // Apply dropdown filters (respects search)
    if (filterAgingFlag !== "all") {
      filtered = filtered.filter((po) => po.agingFlag === filterAgingFlag);
    }
    if (filterInvoiceStatus !== "all") {
      filtered = filtered.filter((po) => po.poInvoiceStatus === filterInvoiceStatus);
    }
    if (filterPOType !== "all") {
      filtered = filtered.filter((po) => po.poType === filterPOType);
    }

    // Sort data
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [
    allPoData,
    searchPM,
    searchDUID,
    searchPONumber,
    searchProjectCode,
    searchProjectName,
    filterAgingFlag,
    filterInvoiceStatus,
    filterPOType,
    sortField,
    sortDirection,
    userRole,
  ]);

  // Calculate metrics from filtered/searched data
  const metrics = useMemo((): KPIMetrics => {
    const data = filteredAndSearchedData;
    if (data.length === 0) {
      return {
        totalPOs: 0,
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
      totalPOs: data.length,
      invoicedPOs: invoiced,
      notInvoicedPOs: notInvoiced,
      invoiceRate: (invoiced / data.length) * 100,
      avgPoAgingDays: avgDays,
    };
  }, [filteredAndSearchedData]);

  // Pagination - only display 30 rows at a time
  const totalPages = Math.ceil(filteredAndSearchedData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSearchedData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSearchedData, currentPage]);

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchPM,
    searchDUID,
    searchPONumber,
    searchProjectCode,
    searchProjectName,
    filterAgingFlag,
    filterInvoiceStatus,
    filterPOType,
  ]);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  const handleSort = (field: keyof PoAgingDaysResponse) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const clearAllFilters = () => {
    setSearchPM("");
    setSearchDUID("");
    setSearchPONumber("");
    setSearchProjectCode("");
    setSearchProjectName("");
    setFilterAgingFlag("all");
    setFilterInvoiceStatus("all");
    setFilterPOType("all");
  };

  const getAgingFlagColor = (flag: string) => {
    switch (flag) {
      case "GREEN":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "WARNING":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "RED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
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
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const SortIcon = ({ field }: { field: keyof PoAgingDaysResponse }) => {
    if (sortField !== field) return <ChevronDown className="w-4 h-4 opacity-30" />;
    return sortDirection === "asc" ? (
      <ChevronUp className="w-4 h-4 text-indigo-600" />
    ) : (
      <ChevronDown className="w-4 h-4 text-indigo-600" />
    );
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
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-indigo-50/30 to-slate-50">
      <div className="max-w-480 mx-auto p-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
              Purchase Order Aging Analysis
            </h1>
            <div className="text-sm text-slate-500 font-medium">
              {userRole === "ADMIN" ? "Administrator View" : "Project Manager View"}
            </div>
          </div>
          <p className="text-slate-600 text-base">
            Monitor and analyze purchase order aging across all projects
          </p>
        </div>

        {/* KPI Cards */}
        <div className={`grid gap-5 mb-8 ${userRole === "ADMIN" ? "grid-cols-5" : "grid-cols-4"}`}>
          {userRole === "ADMIN" && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                  Total POs
                </div>
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {metrics.totalPOs.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500">Purchase orders</div>
            </div>
          )}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                Invoiced
              </div>
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
              </div>
            </div>
            <div className="text-3xl font-bold text-emerald-600 mb-1">
              {metrics.invoicedPOs.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500">Completed invoices</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                Not Invoiced
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
              </div>
            </div>
            <div className="text-3xl font-bold text-orange-600 mb-1">
              {metrics.notInvoicedPOs.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500">Pending invoices</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                Invoice Rate
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
            </div>
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {metrics.invoiceRate.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500">Completion rate</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                Avg Aging
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
              </div>
            </div>
            <div className="text-3xl font-bold text-purple-600 mb-1">
              {metrics.avgPoAgingDays.toFixed(1)}
            </div>
            <div className="text-xs text-slate-500">Days average</div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Filter className="w-5 h-5 text-slate-600" />
                <h2 className="text-lg font-bold text-slate-900">Filters & Search</h2>
              </div>
              {(searchPM ||
                searchDUID ||
                searchPONumber ||
                searchProjectCode ||
                searchProjectName ||
                filterAgingFlag !== "all" ||
                filterInvoiceStatus !== "all" ||
                filterPOType !== "all") && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Clear all
                </button>
              )}
            </div>

            {/* Date Filter */}
            <div className="mb-6 pb-6 border-b border-slate-200">
              <label className="block text-sm font-bold text-slate-700 mb-3">Date Range</label>
              <div className="flex gap-3 items-start flex-wrap">
                <div className="flex gap-2">
                  {(["year", "month", "day", "range"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setDateFilterMode(mode)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        dateFilterMode === mode
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Year selector */}
                {(dateFilterMode === "year" ||
                  dateFilterMode === "month" ||
                  dateFilterMode === "day") && (
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-sm font-medium"
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
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-sm font-medium"
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
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-sm font-medium"
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
                  <>
                    <input
                      type="date"
                      value={dateRangeStart}
                      onChange={(e) => setDateRangeStart(e.target.value)}
                      className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-medium"
                    />
                    <span className="text-slate-500 self-center">to</span>
                    <input
                      type="date"
                      value={dateRangeEnd}
                      onChange={(e) => setDateRangeEnd(e.target.value)}
                      className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-medium"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Admin Search Fields */}
            {userRole === "ADMIN" && (
              <div className="grid grid-cols-5 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Search PM
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchPM}
                      onChange={(e) => setSearchPM(e.target.value)}
                      placeholder="PM name or ID..."
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Search DUID
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchDUID}
                      onChange={(e) => setSearchDUID(e.target.value)}
                      placeholder="DUID..."
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Search PO Number
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchPONumber}
                      onChange={(e) => setSearchPONumber(e.target.value)}
                      placeholder="PO number..."
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Project Code
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchProjectCode}
                      onChange={(e) => setSearchProjectCode(e.target.value)}
                      placeholder="Project code..."
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Project Name
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchProjectName}
                      onChange={(e) => setSearchProjectName(e.target.value)}
                      placeholder="Project name..."
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Dropdown Filters */}
            <div className="grid grid-cols-3 gap-4">
              {userRole === "ADMIN" && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Aging Flag
                  </label>
                  <select
                    value={filterAgingFlag}
                    onChange={(e) => setFilterAgingFlag(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white text-sm"
                  >
                    <option value="all">All Flags</option>
                    <option value="GREEN">Green</option>
                    <option value="WARNING">Warning</option>
                    <option value="RED">Red</option>
                  </select>
                </div>
              )}
              {userRole === "ADMIN" && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Invoice Status
                  </label>
                  <select
                    value={filterInvoiceStatus}
                    onChange={(e) => setFilterInvoiceStatus(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white text-sm"
                  >
                    <option value="all">All Statuses</option>
                    <option value="INVOICED">Invoiced</option>
                    <option value="NOT_INVOICED">Not Invoiced</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">PO Type</label>
                <select
                  value={filterPOType}
                  onChange={(e) => setFilterPOType(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="Standard">Standard</option>
                  <option value="Rush">Rush</option>
                  <option value="Blanket">Blanket</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Showing <span className="font-bold text-slate-900">{paginatedData.length}</span> of{" "}
            <span className="font-bold text-slate-900">{filteredAndSearchedData.length}</span>{" "}
            results
            {filteredAndSearchedData.length < allPoData.length && (
              <span className="text-slate-500"> (filtered from {allPoData.length} total)</span>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-linear-to-r from-indigo-900 to-indigo-950 shadow-lg sticky top-0 z-10">
                <tr>
                  {[
                    { key: "duid", label: "DUID" },
                    { key: "poNumber", label: "PO Number" },
                    { key: "prNumber", label: "PR Number" },
                    { key: "projectCode", label: "Project Code" },
                    { key: "projectName", label: "Project Name" },
                    { key: "pm", label: "PM" },
                    { key: "pmId", label: "PM ID" },
                    { key: "poLineNumber", label: "Line #" },
                    { key: "poType", label: "PO Type" },
                    { key: "poIssuedDate", label: "Issued Date" },
                    { key: "poInvoiceDate", label: "Invoice Date" },
                    { key: "allowedOpenDays", label: "Allowed Days" },
                    { key: "numberOfDaysOpen", label: "Days Open" },
                    { key: "agingFlag", label: "Aging Flag" },
                    { key: "itemCode", label: "Item Code" },
                    { key: "itemDescription", label: "Item Description" },
                    { key: "poInvoiceStatus", label: "Invoice Status" },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key as keyof PoAgingDaysResponse)}
                      className="px-4 py-4 text-center text-white text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-600 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {label}
                        <SortIcon field={key as keyof PoAgingDaysResponse} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isLoadingPO ? (
                  <tr>
                    <td colSpan={17} className="px-4 py-12 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        Loading data...
                      </div>
                    </td>
                  </tr>
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="px-4 py-12 text-center text-slate-500">
                      No purchase orders found
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((po, index) => (
                    <tr
                      key={po.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-slate-700 font-mono">{po.duid}</td>
                      <td className="px-4 py-3 text-sm text-slate-900 font-semibold">
                        {po.poNumber}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{po.prNumber}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{po.projectCode}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{po.projectName}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 font-medium">{po.pm}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 font-mono">{po.pmId}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 text-center">
                        {po.poLineNumber}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium">
                          {po.poType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {formatDate(po.poIssuedDate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {formatDate(po.poInvoiceDate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 text-center">
                        {po.allowedOpenDays}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 font-bold text-center">
                        {po.numberOfDaysOpen}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-bold border ${getAgingFlagColor(po.agingFlag)}`}
                        >
                          {po.agingFlag}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 font-mono">{po.itemCode}</td>
                      <td
                        className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate"
                        title={po.itemDescription}
                      >
                        {po.itemDescription}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-bold border ${getInvoiceStatusColor(po.poInvoiceStatus)}`}
                        >
                          {po.poInvoiceStatus || "N/A"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoadingPO && paginatedData.length > 0 && (
            <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between bg-slate-50">
              <div className="text-sm text-slate-600">
                Page <span className="font-semibold">{currentPage}</span> of{" "}
                <span className="font-semibold">{totalPages}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          currentPage === pageNum
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PoAgingDaysDesktop;
