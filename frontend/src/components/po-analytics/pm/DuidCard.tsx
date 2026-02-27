import React from "react";
import { ChevronDown, Package, FileText } from "lucide-react";
import { getAgingStatus } from "@/lib/aginUtils";
import type { DuidGroupDto, PoGroupDto } from "@/types/po-analytics/po-analytics.types";

interface DuidCardProps {
  duidGroup: DuidGroupDto;
  isExpanded: boolean;
  onToggle: () => void;
  expandedPO: string | null;
  onTogglePO: (po: string) => void;
}

export const DuidCard: React.FC<DuidCardProps> = ({
  duidGroup,
  isExpanded,
  onToggle,
  expandedPO,
  onTogglePO,
}) => {
  const status = getAgingStatus(duidGroup.worstAgingFlag);

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden transition-all duration-300 ${
        isExpanded ? status.border : "border-slate-100"
      }`}
    >
      {/* DUID HEADER */}
      <div
        onClick={onToggle}
        className={`p-5 cursor-pointer active:bg-slate-50 transition-colors ${status.bg}`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`p-1.5 rounded-lg bg-white shadow-sm ${status.text}`}>
                <Package size={16} />
              </div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">{duidGroup.duid}</h3>
            </div>
            <p className="text-[11px] font-bold text-slate-500 leading-tight">
              {duidGroup.projectCode} • {duidGroup.projectName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`px-2 py-0.5 rounded text-[9px] font-black text-white uppercase ${status.dot}`}
            >
              {duidGroup.worstAgingFlag}
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-300 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Max Aging
              </span>
              <span className={`text-sm font-black ${status.text}`}>{duidGroup.maxDaysOpen}d</span>
            </div>
            <div className="w-px h-6 bg-slate-200/60" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Orders
              </span>
              <span className="text-sm font-black text-slate-700">{duidGroup.pos.length}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-emerald-600">
                {duidGroup.totalInvoiced}
              </span>
              <span className="text-[8px] font-bold text-slate-400 uppercase">Inv</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-orange-600">
                {duidGroup.totalNotInvoiced}
              </span>
              <span className="text-[8px] font-bold text-slate-400 uppercase">Not</span>
            </div>
          </div>
        </div>
      </div>

      {/* PO LIST (Hierarchical Dropdown) */}
      {isExpanded && (
        <div className="bg-slate-50/30 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
          {duidGroup.pos.map((po: PoGroupDto) => (
            <div key={po.poNumber} className="border-b border-slate-100 last:border-0">
              <div
                onClick={() => onTogglePO(po.poNumber)}
                className="p-4 flex items-center justify-between bg-white/60 active:bg-blue-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText size={14} className="text-blue-500" />
                  <div>
                    <p className="text-[11px] font-black text-slate-800 tracking-tight">
                      {po.poNumber}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                      {po.lines.length} Line Items
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] font-black ${getAgingStatus(po.worstAgingFlag).text}`}
                  >
                    {po.maxDaysOpen}d
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-slate-300 transition-transform ${expandedPO === po.poNumber ? "rotate-180" : ""}`}
                  />
                </div>
              </div>

              {expandedPO === po.poNumber && (
                <div className="px-4 pb-4 space-y-2 bg-slate-50/50 pt-2">
                  {/* Line items mapped here will now also be type-safe */}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
