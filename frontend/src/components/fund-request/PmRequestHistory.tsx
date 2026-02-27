import React from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, CheckCircle2, XCircle, ChevronDown } from "lucide-react";
import { formatNaira } from "@/utils/fund-request/schema"; // Using your helper
import type { FundRequestHistory } from "../../types/fund-request/fundRequest.type";

interface Props {
  history: FundRequestHistory[];
}

export default function RequestHistory({ history }: Props) {
  const [showHistory, setShowHistory] = React.useState(false);

  if (!history || history.length === 0) return null;

  // Status mapping for cleaner UI logic
  const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    PENDING: {
      color: "text-amber-600 bg-amber-50 border-amber-100",
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

  return (
    <div className="mt-6">
      <Collapsible open={showHistory} onOpenChange={setShowHistory}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all border border-slate-200">
          <div className="flex items-center gap-2">
            <div className="bg-white p-1.5 rounded-lg shadow-sm">
              <Clock className="h-4 w-4 text-slate-600" />
            </div>
            <span className="text-xs font-bold uppercase text-slate-700 tracking-tight">
              Request History
              <span className="ml-2 px-2 py-0.5 bg-slate-200 rounded-full text-[10px]">
                {history.length}
              </span>
            </span>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-slate-500 transition-transform duration-300 ${
              showHistory ? "rotate-180" : ""
            }`}
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4 transition-all">
          <ScrollArea className="h-100 pr-4">
            <div className="space-y-3">
              {history.map((req) => {
                const config = statusConfig[req.status] || statusConfig.PENDING;

                return (
                  <div
                    key={req.id}
                    className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-slate-300 transition-colors"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-black text-slate-800 text-base">
                        {formatNaira(req.requestedAmount)}
                      </h3>
                      <div
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${config.color}`}
                      >
                        {config.icon} {req.status}
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 mb-3 italic">
                      "{req.requestPurpose}"
                    </p>

                    <div className="flex justify-between items-end border-t border-slate-50 pt-3 mt-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Ref: <span className="font-mono text-slate-600">{req.id.slice(-6)}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(req.createdAt).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
