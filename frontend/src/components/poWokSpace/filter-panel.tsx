import { Search, X, ChevronDown, Check } from "lucide-react";
import type { FilterState } from "@/types/po-workspace/types";
import { useState, useRef, useEffect } from "react";
import { usePoTypes } from "@/hooks/po-workspace/usePoType";

interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export function FilterPanel({ filters, onFilterChange }: FilterPanelProps) {
  const [isPoTypeOpen, setIsPoTypeOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 2. Fetch the REAL PoTypes from your NestJS backend
  const { data: poTypes, isLoading } = usePoTypes();
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPoTypeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateFilter = (key: keyof FilterState, value: string | string[]) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const togglePoType = (type: string) => {
    const newTypes = filters.poTypes.includes(type)
      ? filters.poTypes.filter((t) => t !== type)
      : [...filters.poTypes, type];
    updateFilter("poTypes", newTypes);
  };

  const clearAllFilters = () => {
    onFilterChange({
      duid: "",
      poNumber: "",
      projectCode: "",
      projectName: "",
      pm: "",
      poTypes: [],
    });
  };

  const hasActiveFilters =
    filters.duid ||
    filters.poNumber ||
    filters.projectCode ||
    filters.projectName ||
    filters.pm ||
    filters.poTypes.length > 0;

  return (
    <div className="bg-card border-b border-border">
      <div className="px-2 py-1">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-md font-bold text-accent-foreground">Filters & Search</h2>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-md text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* DUID Search */}
          <div className="relative">
            <label className="block text-xs font-bold mb-1">DUID</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={filters.duid}
                onChange={(e) => updateFilter("duid", e.target.value)}
                placeholder="Search DUID..."
                className="w-full h-8 pl-8 pr-3 text-xs bg-input border border-border rounded-md text-shadow-accent-foreground placeholder:text-muted-foreground placeholder:text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* PO Number Search */}
          <div className="relative">
            <label className="block text-xs font-bold mb-1">PO Number</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={filters.poNumber}
                onChange={(e) => updateFilter("poNumber", e.target.value)}
                placeholder="Search PO..."
                className="w-full h-8 pl-8 pr-3 text-xs bg-input border border-border rounded-md text-foreground placeholder:text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* Project Code Search */}
          <div className="relative">
            <label className="block text-xs  font-bold mb-1">Project Code</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={filters.projectCode}
                onChange={(e) => updateFilter("projectCode", e.target.value)}
                placeholder="Search code..."
                className="w-full h-8 pl-8 pr-3 text-xs bg-input border border-border rounded-md text-foreground placeholder:text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* Project Name Search */}
          <div className="relative">
            <label className="block text-xs  font-bold mb-1">Project Name</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={filters.projectName}
                onChange={(e) => updateFilter("projectName", e.target.value)}
                placeholder="Search project..."
                className="w-full h-8 pl-8 pr-3 text-xs bg-input border border-border rounded-md text-foreground placeholder:text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* PM Search */}
          <div className="relative">
            <label className="block text-xs font-bold mb-1">PM</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={filters.pm}
                onChange={(e) => updateFilter("pm", e.target.value)}
                placeholder="Search PM..."
                className="w-full h-8 pl-8 pr-3 text-xs bg-input border border-border rounded-md text-foreground placeholder:text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* PO Type Multi-select */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs  font-bold mb-1">PO Type</label>
            <button
              type="button" // Important: prevents form submission
              onClick={() => setIsPoTypeOpen(!isPoTypeOpen)}
              disabled={isLoading} // Added: disable while fetching from NestJS
              className="w-full h-8 px-3 text-xs bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring flex items-center justify-between"
            >
              <span className={filters.poTypes.length === 0 ? "text-muted-foreground text-xs" : ""}>
                {isLoading
                  ? "Loading..."
                  : filters.poTypes.length === 0
                    ? "Select types..."
                    : `${filters.poTypes.length} selected`}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-accent-foreground transition-transform ${isPoTypeOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isPoTypeOpen && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-auto animate-in fade-in zoom-in-95">
                {/* SWAPPED: Now mapping through your real DB types */}
                {poTypes?.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => togglePoType(type.code)} // Uses the DB 'code' for logic
                    className="w-full px-3 py-2 text-xs text-left hover:bg-accent flex items-center gap-2 text-popover-foreground transition-colors"
                  >
                    <div
                      className={`h-3.5 w-3.5 border rounded flex items-center justify-center transition-all ${
                        filters.poTypes.includes(type.code)
                          ? "bg-primary border-primary"
                          : "border-input bg-background"
                      }`}
                    >
                      {filters.poTypes.includes(type.code) && (
                        <Check className="h-2.5 w-2.5 text-primary-foreground" />
                      )}
                    </div>
                    {type.name} {/* Display the human-readable name */}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active Filters Tags */}
          {filters.poTypes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border">
              <span className="text-xs  font-bold mr-2">Active:</span>
              {filters.poTypes.map((type) => (
                <span
                  key={type}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded border border-primary/20"
                >
                  {type}
                  <button onClick={() => togglePoType(type)} className="hover:text-primary/80">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
