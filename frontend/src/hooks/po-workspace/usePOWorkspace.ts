import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { poWorkspaceApi } from "@/api/po-workspace/poWorkspace.api";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type {
  FilterState,
  POWorkspaceResponse,
  PurchaseOrderLine,
} from "@/types/po-workspace/types";

export const usePOWorkspace = () => {
  const queryClient = useQueryClient();

  // 1. State
  const [filters, setFilters] = useState<FilterState>({
    duid: "",
    poNumber: "",
    projectCode: "",
    projectName: "",
    pm: "",
    poTypes: [],
    cursor: null,
    limit: 8,
  });

  const debouncedFilters = useDebouncedValue(filters, 500);
  const [selectedRows, setSelectedRows] = useState<PurchaseOrderLine[]>([]);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);

  // 2. Optimized Filter Change (Fixes the ESLint Warning)
  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    setSelectedRows([]); // Reset immediately on change
    setCurrentCursor(null);
    setCursorStack([]);
  }, []);

  // 3. Data Fetching
  const { data, isFetching, isLoading, isError, refetch } = useQuery<POWorkspaceResponse>({
    queryKey: ["poWorkspace", { ...debouncedFilters, cursor: currentCursor }],
    queryFn: () => poWorkspaceApi.getWorkSpaceData({ ...filters, cursor: currentCursor }),
    placeholderData: (prev) => prev,
    staleTime: 8000,
  });

  // 4. Pagination Actions
  const paginateNext = () => {
    if (!data?.nextCursor) return;
    setCursorStack((prev) => [...prev, currentCursor ?? ""]);
    setCurrentCursor(data.nextCursor);
  };

  const paginatePrev = () => {
    setCursorStack((prev) => {
      if (prev.length === 0) return [];
      const last = prev[prev.length - 1];
      setCurrentCursor(last);
      return prev.slice(0, -1);
    });
  };

  const refreshData = () => queryClient.invalidateQueries({ queryKey: ["poWorkspace"] });

  return {
    data,
    filters,
    handleFilterChange,
    pagination: {
      paginateNext,
      paginatePrev,
      cursorStack,
      currentCursor,
      isFetching,
      isLoading,
      isError,
      refetch,
    },
    selection: { selectedRows, setSelectedRows },
    refreshData,
  };
};
