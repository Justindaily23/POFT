import React from "react";
import { ChevronDown, Package, FileText } from "lucide-react";
import { getAgingStatus } from "@/lib/aginUtils";
import { formatNaira } from "@/utils/fund-request/schema";
import type { DuidGroupDto, PoGroupDto } from "@/types/po-analytics/po-analytics.types";
import { PO_LINE_STATUS_LABELS } from "@/types/po-analytics/po-analytics.types";

interface DuidCardProps {
  duidGroup: DuidGroupDto;
  isExpanded: boolean;
  onToggle: () => void;
  expandedPO: string | null;
  onTogglePO: (po: string) => void;
}

export const DuidCard: React.FC<DuidCardProps> = ({ duidGroup, isExpanded, onToggle, expandedPO, onTogglePO }) => {
  const status = getAgingStatus(duidGroup.worstAgingFlag);

  return (
    <div className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden transition-all duration-300 ${isExpanded ? status.border : "border-slate-100"}`}>
      {/* DUID HEADER */}
      <div onClick={onToggle} className={`p-6 cursor-pointer active:bg-slate-50 transition-colors ${status.bg}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`p-1.5 rounded-lg bg-white shadow-sm ${status.text}`}>
                <Package size={16} />
              </div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">{duidGroup.duid}</h3>
            </div>
            <p className="text-[12px] font-bold text-slate-600 leading-tight">
              {duidGroup.projectCode} • {duidGroup.projectName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-2 py-0.5 rounded text-[9px] font-black text-white uppercase ${status.dot}`}>{duidGroup.worstAgingFlag}</div>
            <ChevronDown className={`w-5 h-5 text-slate-300 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">No of POs</span>
            <span className="text-sm font-black text-slate-700">{duidGroup.totalLines}</span>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-emerald-600">{duidGroup.totalInvoiced}</span>
              <span className="text-[8px] font-bold text-slate-600 uppercase">Invoiced</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-orange-600">{duidGroup.totalNotInvoiced}</span>
              <span className="text-[8px] font-bold text-slate-600 uppercase">Not Invoiced</span>
            </div>
          </div>
        </div>
      </div>

      {/* PO LIST (Hierarchical Dropdown) */}
      {isExpanded && (
        <div className="bg-slate-50/30 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
          {duidGroup.pos.map((po: PoGroupDto) => (
            <div key={po.poNumber} className="border-b border-slate-100 last:border-0">
              <div onClick={() => onTogglePO(po.poNumber)} className="p-4 flex items-center justify-between bg-white/60 active:bg-blue-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText size={14} className="text-blue-500" />
                  <p className="text-[12px] font-black text-slate-800 tracking-tight">{po.poNumber}</p>
                  <span className="text-[10px] font-bold text-slate-400">
                    {po.lines?.length ?? 0} {po.lines?.length === 1 ? "line" : "lines"}
                  </span>
                </div>
                <ChevronDown size={14} className={`text-slate-300 transition-transform ${expandedPO === po.poNumber ? "rotate-180" : ""}`} />
              </div>

              {expandedPO === po.poNumber && (
                <div className="px-4 pb-4 space-y-2 bg-slate-50/50 pt-2">
                  {po.lines?.map((line) => (
                    <div key={line.id} className="rounded-xl bg-white border border-slate-100 p-3.5 shadow-sm">
                      {/* Row 1: identity — line no, PM, status pills */}
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] font-black text-slate-900 shrink-0">Line {line.poLineNumber}</span>
                          <span className="text-[9px] font-bold text-slate-300 shrink-0">•</span>
                          <span className="text-[10px] font-bold text-slate-600 truncate">{line.pm}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-white ${getAgingStatus(line.agingFlag).dot}`}>
                            {line.numberOfDaysOpen}d open
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-slate-100 text-slate-600">
                            {PO_LINE_STATUS_LABELS[line.poInvoiceStatus]}
                          </span>
                        </div>
                      </div>

                      {/* Row 2: description */}
                      <p className="text-[10.5px] font-semibold text-slate-500 mb-1.5 line-clamp-2">{line.itemDescription}</p>

                      {/* Row 3: allowed open days — small secondary detail */}
                      <p className="text-[9px] font-bold text-slate-400 mb-3">
                        Allowed open days: <span className="text-slate-600">{line.allowedOpenDays}</span>
                      </p>

                      {/* Row 4: financials — single row, ledger style */}
                      <div className="grid grid-cols-4 gap-2 pt-2.5 border-t border-slate-100">
                        <div>
                          <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">PO Amount</p>
                          <p className="text-[11px] font-black text-slate-900">{formatNaira(line.poLineAmount)}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Contract</p>
                          <p className="text-[11px] font-black text-slate-700">{formatNaira(line.contractAmount)}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Approved</p>
                          <p className="text-[11px] font-black text-emerald-700">{formatNaira(line.totalApprovedAmount)}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Balance</p>
                          <p className="text-[11px] font-black text-amber-700">{formatNaira(line.remainingBalance)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};