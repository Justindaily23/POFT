"use client";

import { Search, RotateCcw, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminFundRequestFilters } from "../../types/fund-request/fundRequest.type";

interface AdminFilterBarProps {
  filters: AdminFundRequestFilters;
  onFilterChange: (updates: Partial<AdminFundRequestFilters>) => void;
  onReset: () => void;
}

export function AdminFilterBar({ filters, onFilterChange, onReset }: AdminFilterBarProps) {
  // ✅ FIXED: We store both the current term AND the "source" term in state
  const [searchTerm, setSearchTerm] = useState(filters.search || "");
  const [prevSearchProp, setPrevSearchProp] = useState(filters.search || "");

  // ✅ SYNC LOGIC: If the parent's filter changed (e.g., via Reset), sync the local input
  if (filters.search !== prevSearchProp) {
    setSearchTerm(filters.search || "");
    setPrevSearchProp(filters.search || "");
  }

  // ✅ DEBOUNCE EFFECT: Handles the actual API/Filter update
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const trimmedSearch = searchTerm.trim();
      const currentPropSearch = filters.search || "";

      if (trimmedSearch !== currentPropSearch) {
        onFilterChange({ search: trimmedSearch });
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, onFilterChange, filters.search]);

  const handleReset = () => {
    setSearchTerm("");
    onReset();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 bg-slate-50/50 p-2 rounded-xl border border-slate-100 relative z-20">
      {/* SEARCH BOX */}
      <div className="relative group min-w-70">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search requests..."
          className="pl-9 pr-8 h-9 border-none bg-white shadow-sm ring-1 ring-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg text-xs"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* STATUS SELECT */}
      <Select
        value={filters.status || "ALL"}
        onValueChange={(val) => onFilterChange({ status: val === "ALL" ? "" : val })}
      >
        <SelectTrigger className="w-35 h-9 text-xs border-none shadow-sm ring-1 ring-slate-200 bg-white rounded-lg focus:ring-2 focus:ring-blue-500">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className="z-50">
          <SelectItem value="ALL">All Requests</SelectItem>
          <SelectItem value="PENDING">Pending</SelectItem>
          <SelectItem value="APPROVED">Approved</SelectItem>
          <SelectItem value="REJECTED">Rejected</SelectItem>
        </SelectContent>
      </Select>

      {/* RESET BUTTON */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleReset}
        className="h-9 w-9 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400 transition-all active:scale-95"
        title="Reset all filters"
      >
        <RotateCcw size={16} />
      </Button>
    </div>
  );
}
