import { useState, useMemo, useCallback } from "react";
import type { PoAgingFilterState } from "@/types/po-analytics/po-analytics.types";

const initialState: PoAgingFilterState = {
  pmId: "",
  searchPM: "",
  searchDUID: "",
  searchPONumber: "",
  searchProjectCode: "",
  searchProjectName: "",
  agingFlag: "all",
  invoiceStatus: "all",
  poType: "all",
  dateMode: "all", // "all" tells the backend to skip date filtering
  year: undefined, // No specific year on mount
  month: "Jan",
  day: new Date().getDate(),
  rangeStart: "",
  rangeEnd: "",
  page: 1,
  take: 30,
  cursor: undefined, // Start with no cursor
};

export function usePoAnalyticsState() {
  const [filters, setFilters] = useState<PoAgingFilterState>(initialState);
  // Track previous cursors to allow "Back" navigation
  const [history, setHistory] = useState<(string | undefined)[]>([]);

  const query = useMemo(
    () => ({
      ...filters,
      // Backend expects 'cursor' as a string (ID), not 'skip'
      cursor: filters.cursor || undefined,
    }),
    [filters],
  );

  const updateFilter = useCallback((updates: Partial<PoAgingFilterState>) => {
    setFilters((prev) => ({
      ...prev,
      ...updates,
      page: 1,
      cursor: undefined, // Reset pagination on any filter change
    }));
    setHistory([]);
  }, []);

  const paginateNext = useCallback(
    (nextCursor: string) => {
      setHistory((prev) => [...prev, filters.cursor]);
      setFilters((prev) => ({
        ...prev,
        cursor: nextCursor,
        page: prev.page + 1,
      }));
    },
    [filters.cursor],
  );

  const paginatePrev = useCallback(() => {
    const prevHistory = [...history];
    const prevCursor = prevHistory.pop();
    setHistory(prevHistory);
    setFilters((prev) => ({
      ...prev,
      cursor: prevCursor,
      page: Math.max(1, prev.page - 1),
    }));
  }, [history]);

  const clearAll = useCallback(() => {
    setFilters(initialState);
    setHistory([]);
  }, []);

  return {
    query,
    filters,
    updateFilter,
    clearAll,
    paginateNext,
    paginatePrev,
    canGoBack: history.length > 0,
  };
}
