import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, XCircle } from "lucide-react";
import DatePicker from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// 1. Import the shared interface from your types file
import type { AdminFundRequestFilters } from "../../fundRequest.type";

interface AdminFilterBarProps {
  filters: AdminFundRequestFilters;
  // 2. Use the exact Dispatch type that matches the parent's useState
  setFilters: React.Dispatch<React.SetStateAction<AdminFundRequestFilters>>;
}

export default function AdminFilterBar({ filters, setFilters }: AdminFilterBarProps) {
  // Use local state for the search input so it doesn't refetch on every keystroke
  const [localSearch, setLocalSearch] = useState(filters.search || "");

  const handleApply = () => {
    // 3. Functional updates (prev => ...) ensure you never lose other filter values
    setFilters((prev) => ({ ...prev, search: localSearch }));
  };

  const handleReset = () => {
    setLocalSearch("");
    setFilters({
      search: "",
      status: "",
      startDate: undefined,
      endDate: undefined,
    });
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center w-full md:w-auto">
      {/* Search Input Group */}
      <div className="relative flex-1 md:flex-none w-full md:w-64">
        <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
        <Input
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search DUID, PM, PO..."
          className="pl-10 h-12 rounded-xl border-slate-200 shadow-sm focus-visible:ring-blue-500"
          onKeyDown={(e) => e.key === "Enter" && handleApply()}
        />
        {localSearch && (
          <button
            onClick={() => {
              setLocalSearch("");
              setFilters((prev) => ({ ...prev, search: "" }));
            }}
            className="absolute right-3 top-3.5 text-slate-300 hover:text-slate-600 transition-colors"
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Status Dropdown */}
      <Select
        value={filters.status || "ALL"}
        onValueChange={(value) =>
          setFilters((prev) => ({ ...prev, status: value === "ALL" ? "" : value }))
        }
      >
        <SelectTrigger className="w-40 h-12 rounded-xl border-slate-200 shadow-sm bg-white">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Status</SelectItem>
          <SelectItem value="PENDING">Pending</SelectItem>
          <SelectItem value="APPROVED">Approved</SelectItem>
          <SelectItem value="REJECTED">Rejected</SelectItem>
        </SelectContent>
      </Select>

      {/* Date Range Picker Component */}
      <DatePicker
        startDate={filters.startDate}
        endDate={filters.endDate}
        // Explicitly type the 'range' parameter here
        onChange={(range: { startDate?: Date; endDate?: Date }) =>
          setFilters((prev) => ({
            ...prev,
            startDate: range.startDate,
            endDate: range.endDate,
          }))
        }
      />

      {/* Action Buttons */}
      <div className="flex gap-2 w-full md:w-auto">
        <Button
          onClick={handleApply}
          className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-sm active:scale-95"
        >
          Apply Filters
        </Button>
        <Button
          variant="outline"
          onClick={handleReset}
          className="h-12 px-4 rounded-xl border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-all"
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
