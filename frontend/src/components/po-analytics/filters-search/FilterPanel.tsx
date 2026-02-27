import { Search, RotateCcw, ChevronDown, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { usePoMetadata } from "@/hooks/po-analytics/useTypes";
import type { PoAgingFilterState } from "@/types/po-analytics/po-analytics.types";

interface FilterPanelProps {
  filters: PoAgingFilterState;
  onFilterChange: (filters: PoAgingFilterState) => void;
  onClear: () => void;
}

export function FilterPanel({ filters, onFilterChange, onClear }: FilterPanelProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: metadata } = usePoMetadata();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ FIXED: Replaced 'any' with a generic that matches the key's value type
  const updateFilter = <K extends keyof PoAgingFilterState>(
    key: K,
    value: PoAgingFilterState[K],
  ) => {
    onFilterChange({ ...filters, [key]: value });
  };

  // ✅ FIXED: Defined keys explicitly to allow safe indexing
  const searchInputs = [
    { label: "Project Manager", key: "searchPM" },
    { label: "DUID", key: "searchDUID" },
    { label: "PO Number", key: "searchPONumber" },
    { label: "Project Code", key: "searchProjectCode" },
    { label: "Project Name", key: "searchProjectName" },
  ] as const;

  return (
    <div className="bg-white border-b border-slate-200 p-4 space-y-4" ref={containerRef}>
      {/* HEADER ACTIONS */}
      <div className="flex items-center justify-between px-1">
        <button
          // 3. Directly call onClear from the props
          onClick={onClear}
          className="text-[3px] font-bold text-slate-800 hover:text-red-950 flex items-center gap-1 transition-colors uppercase tracking-widest"
        >
          <RotateCcw size={18} />
          <span>Reset Dashboard</span>
        </button>
      </div>

      {/* ROW 1: PRIMARY SEARCH BOXES */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {searchInputs.map((input) => (
          <div key={input.key} className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-900 uppercase tracking-tighter">
              {input.label}
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                // ✅ FIXED: Replaced 'as any' with safe indexing
                value={filters[input.key] ?? ""}
                placeholder="search..."
                onChange={(e) => updateFilter(input.key, e.target.value)}
                className="w-full h-9 pl-8 pr-3 text-xs bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/10 transition-all"
              />
            </div>
          </div>
        ))}
      </div>

      {/* ROW 2: CATEGORICAL & TEMPORAL FILTERS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4 border-t border-slate-100 items-end">
        {/* DROPDOWNS SECTION (8/12 Columns) */}
        <div className="lg:col-span-8 grid grid-cols-3 gap-4">
          {/* Status Dropdown */}
          <div className="space-y-1.5 relative">
            <label className="block text-[10px] font-black text-slate-900 uppercase tracking-tighter">
              Invoicing Status
            </label>
            <button
              onClick={() => setActiveDropdown(activeDropdown === "status" ? null : "status")}
              className="w-full h-9 px-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-white transition-all"
            >
              <span className="truncate">
                {filters.invoiceStatus === "all"
                  ? "All Statuses"
                  : metadata?.statuses.find((s) => s.value === filters.invoiceStatus)?.label}
              </span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </button>
            {activeDropdown === "status" && (
              <div className="absolute z-50 top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden py-1">
                {metadata?.statuses.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => {
                      updateFilter("invoiceStatus", s.value);
                      setActiveDropdown(null);
                    }}
                    className="w-full px-4 py-2 text-xs text-left hover:bg-slate-50 flex justify-between items-center"
                  >
                    {s.label}{" "}
                    {filters.invoiceStatus === s.value && (
                      <Check className="h-3 w-3 text-indigo-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Aging Flag Dropdown */}
          <div className="space-y-1.5 relative">
            <label className="block text-[10px] font-black text-slate-900 uppercase tracking-tighter">
              SLA Flag
            </label>
            <button
              onClick={() => setActiveDropdown(activeDropdown === "aging" ? null : "aging")}
              className="w-full h-9 px-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-white transition-all"
            >
              <span className="truncate">
                {filters.agingFlag === "all"
                  ? "Flag"
                  : metadata?.agingFlags.find((f) => f.value === filters.agingFlag)?.label}
              </span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </button>
            {activeDropdown === "aging" && (
              <div className="absolute z-50 top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden py-1">
                {metadata?.agingFlags.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => {
                      updateFilter("agingFlag", f.value);
                      setActiveDropdown(null);
                    }}
                    className="w-full px-4 py-2 text-xs text-left hover:bg-slate-50 flex justify-between items-center"
                  >
                    {f.label}{" "}
                    {filters.agingFlag === f.value && <Check className="h-3 w-3 text-indigo-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* PO Type Dropdown */}
          <div className="space-y-1.5 relative">
            <label className="block text-[10px] font-black text-slate-900 uppercase tracking-tighter">
              PO Type
            </label>
            <button
              onClick={() => setActiveDropdown(activeDropdown === "type" ? null : "type")}
              className="w-full h-9 px-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-white transition-all"
            >
              <span className="truncate">
                {filters.poType === "all"
                  ? "All Types"
                  : metadata?.types.find((t) => t.code === filters.poType)?.name}
              </span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </button>
            {activeDropdown === "type" && (
              <div className="absolute z-50 top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-auto py-1">
                {metadata?.types.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      updateFilter("poType", t.code);
                      setActiveDropdown(null);
                    }}
                    className="w-full px-4 py-2 text-xs text-left hover:bg-slate-50 flex justify-between items-center"
                  >
                    {t.name}{" "}
                    {filters.poType === t.code && <Check className="h-3 w-3 text-indigo-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* DATE CONTROLS SECTION (4/12 Columns) */}
        <div className="lg:col-span-4 flex items-end gap-3 pl-4 border-l border-slate-100">
          <div className="space-y-1.5 w-24">
            <label className="block text-[10px] font-black text-slate-900 uppercase tracking-tighter">
              Mode
            </label>
            <select
              value={filters.dateMode}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const newMode = e.target.value as "year" | "range";

                if (newMode === "year") {
                  onFilterChange({
                    ...filters,
                    dateMode: "year",
                    rangeStart: "",
                    rangeEnd: "",
                    year: filters.year || new Date().getFullYear(),
                  });
                } else {
                  onFilterChange({
                    ...filters,
                    dateMode: "range",
                    year: undefined,
                  });
                }
              }}
              className="w-full h-9 px-2 text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-950 rounded-xl outline-none cursor-pointer hover:bg-indigo-100 transition-all"
            >
              <option value="all">All Time</option>
              <option value="year">Yearly</option>
              <option value="range">Range</option>
            </select>
          </div>

          {filters.dateMode === "year" ? (
            <div className="space-y-1.5 flex-1">
              <label className="block text-[10px] font-black text-slate-900 uppercase tracking-tighter">
                Target Year
              </label>
              <input
                type="number"
                value={filters.year || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const val = e.target.value;
                  const parsed = parseInt(val);
                  if (val.length === 4) {
                    updateFilter("year", parsed);
                  } else if (val === "") {
                    updateFilter("year", undefined);
                  }
                }}
                className="w-full h-9 px-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all"
              />
            </div>
          ) : (
            <div className="flex gap-2 flex-1 animate-in fade-in slide-in-from-right-2 duration-200">
              <div className="space-y-1.5 flex-1">
                <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-tighter">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.rangeStart}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateFilter("rangeStart", e.target.value)
                  }
                  className="w-full h-9 px-2 text-[10px] bg-indigo-50/50 border border-indigo-100 rounded-xl outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1.5 flex-1">
                <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-tighter">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.rangeEnd}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateFilter("rangeEnd", e.target.value)
                  }
                  className="w-full h-9 px-2 text-[10px] bg-indigo-50/50 border border-indigo-100 rounded-xl outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
