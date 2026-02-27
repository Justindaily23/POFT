import React from "react";
import { Filter, ChevronDown, Search, Loader2 } from "lucide-react";
import { usePmPoTypes } from "@/hooks/po-analytics/usePmMetadata";
import type { PoType } from "@/types/po-analytics/po-analytics.types";

interface FilterProps {
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  // Date Modes
  dateFilterMode: "all" | "year" | "month" | "day" | "range";
  setDateFilterMode: (mode: "all" | "year" | "month" | "day" | "range") => void;
  // Search Fields
  searchDUID: string;
  setSearchDUID: (val: string) => void;
  searchPONumber: string;
  setSearchPONumber: (val: string) => void;
  // Values
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  selectedMonth: number;
  setSelectedMonth: (month: number) => void;
  selectedDay: number;
  setSelectedDay: (day: number) => void;
  rangeStart: string;
  setRangeStart: (date: string) => void;
  rangeEnd: string;
  setRangeEnd: (date: string) => void;
  // Type
  poType: string;
  setPoType: (type: string) => void;
}

export const PoAgingFilters: React.FC<FilterProps> = (props) => {
  const { data: poTypes, isLoading: isLoadingMetadata } = usePmPoTypes();

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const daysInMonth = new Date(props.selectedYear, props.selectedMonth, 0).getDate();

  return (
    <div className="px-4 mb-4 mt-2">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => props.setShowFilters(!props.showFilters)}
        className="w-full bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center justify-between active:bg-slate-50 transition-all"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-black text-slate-900 uppercase tracking-tight">
            Search & Filters
          </span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${props.showFilters ? "rotate-180" : ""}`}
        />
      </button>

      {/* Expanded Panel */}
      {props.showFilters && (
        <div className="mt-2 bg-white rounded-2xl shadow-xl border border-blue-50 p-5 space-y-5 animate-in fade-in zoom-in-95 duration-200">
          {/* PRIMARY SEARCH INPUTS */}
          <div className="grid grid-cols-1 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-3.5 w-3.5 text-slate-400" />
              <input
                placeholder="Search DUID (e.g. DUID-001)"
                value={props.searchDUID}
                onChange={(e) => props.setSearchDUID(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-slate-50 rounded-xl text-xs font-bold border-none outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-3.5 w-3.5 text-slate-400" />
              <input
                placeholder="Search PO Number"
                value={props.searchPONumber}
                onChange={(e) => props.setSearchPONumber(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-slate-50 rounded-xl text-xs font-bold border-none outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Timeline Scope Selector */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">
              Timeline Scope
            </label>
            <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100 rounded-xl">
              {(["all", "year", "month", "day", "range"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => props.setDateFilterMode(mode)}
                  className={`py-2 rounded-lg text-[9px] font-black uppercase transition-all ${
                    props.dateFilterMode === mode
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Inputs based on Mode */}
          {props.dateFilterMode !== "all" && (
            <div className="grid grid-cols-1 gap-3 animate-in slide-in-from-top-2">
              {props.dateFilterMode !== "range" && (
                <select
                  value={props.selectedYear}
                  onChange={(e) => props.setSelectedYear(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-900 outline-none appearance-none"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y} Operations
                    </option>
                  ))}
                </select>
              )}

              {(props.dateFilterMode === "month" || props.dateFilterMode === "day") && (
                <select
                  value={props.selectedMonth}
                  onChange={(e) => props.setSelectedMonth(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-900 outline-none appearance-none"
                >
                  {months.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              )}

              {props.dateFilterMode === "day" && (
                <select
                  value={props.selectedDay}
                  onChange={(e) => props.setSelectedDay(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-900 outline-none appearance-none"
                >
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      Day {d}
                    </option>
                  ))}
                </select>
              )}

              {props.dateFilterMode === "range" && (
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={props.rangeStart}
                    onChange={(e) => props.setRangeStart(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold border-none outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <input
                    type="date"
                    value={props.rangeEnd}
                    onChange={(e) => props.setRangeEnd(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-50 rounded-xl text-xs font-bold border-none outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              )}
            </div>
          )}

          {/* PO TYPE FILTER */}
          <div className="pt-2 border-t border-slate-50">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">
              Po Type
            </label>
            <div className="relative flex items-center">
              <select
                disabled={isLoadingMetadata}
                value={props.poType}
                onChange={(e) => props.setPoType(e.target.value)}
                className="w-full px-4 py-3 bg-blue-50/50 text-blue-700 border-none rounded-xl text-sm font-black outline-none appearance-none disabled:opacity-50"
              >
                <option value="all">All Types</option>
                {/* ✅ FIXED: Replaced 'any' with PoType interface for mapping */}
                {poTypes?.map((type: PoType) => (
                  <option key={type.id} value={type.name}>
                    {type.name}
                  </option>
                ))}
              </select>
              {isLoadingMetadata && (
                <Loader2 className="absolute right-3 w-4 h-4 text-blue-600 animate-spin" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
