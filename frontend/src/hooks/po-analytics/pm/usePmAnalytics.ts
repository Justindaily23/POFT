import { useState, useMemo, useRef, useCallback } from "react";
import { usePmAnalyticsHooks } from "../usePmAnalyticsQuery";
import { usePoAgingLogic } from "../usePoAgingLogic";
import type { PoAgingFilterState } from "@/types/po-analytics/po-analytics.types";

export const usePmAnalytics = (userId: string) => {
  // --- UI & Filter State ---
  const [showFilters, setShowFilters] = useState(false);
  const [poType, setPoType] = useState("all");
  const [searchDUID, setSearchDUID] = useState("");
  const [searchPONumber, setSearchPONumber] = useState("");
  const [dateFilterMode, setDateFilterMode] = useState<"all" | "year" | "month" | "day" | "range">(
    "all",
  );
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  const [expandedDUID, setExpandedDUID] = useState<string | null>(null);
  const [expandedPO, setExpandedPO] = useState<string | null>(null);

  // ✅ PRODUCTION FIX: Helper to reset UI state whenever filters change
  // This replaces the useEffect and fixes the "Avoid calling setState directly within an effect" error.
  const resetUI = useCallback(() => {
    setExpandedDUID(null);
    setExpandedPO(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // --- Wrapped Setters for UI Sync ---
  const handlePoTypeChange = (val: string) => {
    setPoType(val);
    resetUI();
  };

  const handleSearchDUIDChange = (val: string) => {
    setSearchDUID(val);
    resetUI();
  };

  const handleSearchPONumberChange = (val: string) => {
    setSearchPONumber(val);
    resetUI();
  };

  const handleDateModeChange = (val: "all" | "year" | "month" | "day" | "range") => {
    setDateFilterMode(val);
    resetUI();
  };

  // 1. CALCULATE FILTERS (Pure calculation)
  const filters: PoAgingFilterState = useMemo(() => {
    return {
      pmId: userId,
      searchDUID,
      searchPONumber,
      searchPM: "",
      searchProjectCode: "",
      searchProjectName: "",
      poType: poType === "all" ? "all" : poType,
      agingFlag: "all",
      invoiceStatus: "all",
      dateMode: dateFilterMode,
      year: !["all", "range"].includes(dateFilterMode) ? selectedYear : undefined,
      month: ["month", "day"].includes(dateFilterMode) ? String(selectedMonth) : undefined,
      day: dateFilterMode === "day" ? selectedDay : undefined,
      rangeStart: dateFilterMode === "range" ? rangeStart : undefined,
      rangeEnd: dateFilterMode === "range" ? rangeEnd : undefined,
      page: 1,
      take: 20,
    };
  }, [
    userId,
    poType,
    searchDUID,
    searchPONumber,
    dateFilterMode,
    selectedYear,
    selectedMonth,
    selectedDay,
    rangeStart,
    rangeEnd,
  ]);

  // --- Queries ---
  const { dashboardQuery, listQuery } = usePmAnalyticsHooks(filters);

  // --- Data Processing ---
  const flatLines = useMemo(
    () => listQuery.data?.pages.flatMap((p) => p.data) ?? [],
    [listQuery.data],
  );
  const { metrics, groupedByDUID } = usePoAgingLogic(flatLines);

  // --- Infinite Scroll ---
  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (listQuery.isFetchingNextPage) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && listQuery.hasNextPage) {
          listQuery.fetchNextPage();
        }
      });

      if (node) observer.current.observe(node);
    },
    [listQuery],
  );

  return {
    state: {
      showFilters,
      setShowFilters,
      poType,
      setPoType: handlePoTypeChange, // Use wrapped setter
      searchDUID,
      setSearchDUID: handleSearchDUIDChange, // Use wrapped setter
      searchPONumber,
      setSearchPONumber: handleSearchPONumberChange, // Use wrapped setter
      dateFilterMode,
      setDateFilterMode: handleDateModeChange, // Use wrapped setter
      selectedYear,
      setSelectedYear,
      selectedMonth,
      setSelectedMonth,
      selectedDay,
      setSelectedDay,
      rangeStart,
      setRangeStart,
      rangeEnd,
      setRangeEnd,
      expandedDUID,
      setExpandedDUID,
      expandedPO,
      setExpandedPO,
    },
    queries: { dashboardQuery, listQuery },
    data: { metrics, groupedByDUID, lastElementRef },
  };
};
