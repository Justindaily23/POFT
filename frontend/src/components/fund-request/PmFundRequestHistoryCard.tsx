import type { FundRequestResponse } from "@/types/fund-request/fundRequest.type";
import { formatNaira } from "@/utils/fund-request/schema";
import { Clock, CheckCircle2, XCircle } from "lucide-react";

export default function PmHistoryCard({ request }: { request: FundRequestResponse }) {
  const statusConfig = {
    PENDING: {
      color: "text-yellow-600 bg-yellow-50 border-yellow-100",
      icon: <Clock className="h-3 w-3" />,
    },
    APPROVED: {
      color: "text-green-600 bg-green-50 border-green-100",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    REJECTED: {
      color: "text-red-600 bg-red-50 border-red-100",
      icon: <XCircle className="h-3 w-3" />,
    },
  };

  const config = statusConfig[request.status];

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-3">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-black text-slate-800 text-lg">
          {formatNaira(request.requestedAmount)}
        </h3>
        <div
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${config.color}`}
        >
          {config.icon} {request.status}
        </div>
      </div>
      <p className="text-xs text-slate-500 line-clamp-2 mb-3 italic">"{request.requestPurpose}"</p>
      <div className="flex justify-between items-end border-t pt-2 mt-2">
        <div className="text-[10px] font-bold text-slate-400 uppercase">
          {request.projectName || "Standard Project"} <br />
          <span className="font-mono">PO: {request.poNumber}</span>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">
          {new Date(request.poIssuedDate || "").toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
