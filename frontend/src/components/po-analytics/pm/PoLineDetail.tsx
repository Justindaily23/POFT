import React from "react";
import { getAgingStatus, formatDate } from "@/lib/aginUtils";
// ✅ FIXED: Import the specific DTO for PO Aging Lines
import type { PoAgingLineDto } from "@/types/po-analytics/po-analytics.types";

interface PoLineDetailProps {
  // ✅ FIXED: Replaced 'any' with the correct interface
  line: PoAgingLineDto;
  isLast: boolean;
}

export const PoLineDetail: React.FC<PoLineDetailProps> = ({ line, isLast }) => {
  const status = getAgingStatus(line.agingFlag);

  return (
    <div
      className={`p-4 bg-white rounded-xl border border-slate-100 shadow-sm ${!isLast ? "mb-2" : ""}`}
    >
      {/* HEADER: Line # and Status Badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Line {line.poLineNumber}
        </span>
        <span
          className={`px-2 py-0.5 rounded-full text-[9px] font-black text-white uppercase ${status.dot}`}
        >
          {line.agingFlag}
        </span>
      </div>

      {/* ITEM INFO */}
      <div className="mb-4">
        <h5 className="text-[12px] font-black text-slate-900 leading-tight mb-1">
          {line.itemCode}
        </h5>
        <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
          {line.itemDescription}
        </p>
      </div>

      {/* DATA GRID: 2-Column High Density */}
      <div className="grid grid-cols-2 gap-y-4 gap-x-2 pb-4 border-b border-slate-50">
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">
            PR Number
          </span>
          <span className="text-[11px] font-bold text-slate-700">{line.prNumber}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">
            PO Type
          </span>
          <span className="text-[11px] font-bold text-slate-700">{line.poType}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">
            Days Open / Allowed
          </span>
          <span className={`text-[11px] font-black ${status.text}`}>
            {line.numberOfDaysOpen} <span className="text-slate-300">/</span> {line.allowedOpenDays}
            d
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">
            Issued Date
          </span>
          <span className="text-[11px] font-bold text-slate-700">
            {formatDate(line.poIssuedDate)}
          </span>
        </div>
        <div className="col-span-2 flex flex-col pt-1">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">
            Invoice Date
          </span>
          <span className="text-[11px] font-bold text-slate-700">
            {line.poInvoiceDate ? formatDate(line.poInvoiceDate) : "Pending Review"}
          </span>
        </div>
      </div>

      {/* INVOICE STATUS BADGE */}
      <div className="mt-3 flex items-center justify-between">
        <div
          className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider
          ${line.poInvoiceStatus === "INVOICED" ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-orange-50 text-orange-700 border-orange-100"}
        `}
        >
          {line.poInvoiceStatus || "UNVERIFIED"}
        </div>
        <span className="text-[9px] font-bold text-slate-300 italic">
          #{line.id.includes("-") ? line.id.split("-")[1] : line.id.slice(-6)}
        </span>
      </div>
    </div>
  );
};
