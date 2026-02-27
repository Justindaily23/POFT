import { useState } from "react";
import { FilterPanel } from "@/components/poWokSpace/filter-panel";
import { MetricsBar } from "@/components/poWokSpace/metrics-bar";
import { PODataTable } from "@/components/poWokSpace/po-data-table";
import { FullPageLoader } from "@/components/ui/full-page-loader";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ContractAmendmentModal } from "@/components/contract-amendments/ContractAmendmentModal";
import { usePOWorkspace } from "@/hooks/po-workspace/usePOWorkspace";
import type { PurchaseOrderLine } from "@/types/po-workspace/types";

export default function POFinancialWorkspace() {
  const { data, filters, handleFilterChange, pagination, selection, refreshData } =
    usePOWorkspace();

  const [editingPoLine, setEditingPoLine] = useState<PurchaseOrderLine | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (pagination.isLoading) return <FullPageLoader />;

  if (pagination.isError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-destructive">Failed to Load PO Data</h2>
        <button
          onClick={() => pagination.refetch()}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-md"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      <header className="flex-none bg-white border-b border-slate-200 z-30 shadow-sm">
        <FilterPanel filters={filters} onFilterChange={handleFilterChange} />
        <div className={pagination.isFetching ? "opacity-60" : "opacity-100"}>
          <MetricsBar
            metrics={data.metrics}
            rowCount={data.data.length}
            totalCount={data.totalCount}
            selectedRows={selection.selectedRows}
          />
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-slate-50/50">
        <div className="p-4 md:p-6 min-w-max">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <PODataTable
              data={data.data}
              onSelectionChange={selection.setSelectedRows}
              onEditClick={(row) => {
                setEditingPoLine(row);
                setIsModalOpen(true);
              }}
            />
          </div>
        </div>
      </main>

      <footer className="flex-none bg-white border-t border-slate-200 p-3">
        <div className="flex items-center justify-center gap-6">
          <button
            disabled={pagination.cursorStack.length === 0 || pagination.isFetching}
            onClick={pagination.paginatePrev}
            className="p-2 hover:bg-slate-50 border rounded-xl disabled:opacity-20"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="text-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Navigation
            </span>
            <div className="text-xs font-bold">PAGE {pagination.cursorStack.length + 1}</div>
          </div>

          <button
            disabled={!data?.nextCursor || pagination.isFetching}
            onClick={pagination.paginateNext}
            className="p-2 hover:bg-slate-50 border rounded-xl disabled:opacity-20"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </footer>

      {editingPoLine && (
        <ContractAmendmentModal
          isOpen={isModalOpen}
          poLine={editingPoLine}
          onClose={() => {
            setIsModalOpen(false);
            setEditingPoLine(null);
          }}
          onRefresh={refreshData}
        />
      )}
    </div>
  );
}
