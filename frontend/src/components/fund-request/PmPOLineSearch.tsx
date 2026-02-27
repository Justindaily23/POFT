import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, AlertTriangle, CheckCircle2, Search } from "lucide-react";
import type { POLineSearchResponseData } from "../../types/fund-request/fundRequest.type";

interface Props {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  searchResults: POLineSearchResponseData[];
  isFetching: boolean;
  selectedPOLine: POLineSearchResponseData | null;
  handleSelectPO: (item: POLineSearchResponseData) => void;
}

export default function POLineSearch({
  searchTerm,
  setSearchTerm,
  searchResults,
  isFetching,
  selectedPOLine,
  handleSelectPO,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          placeholder="Enter DUID or PO Number..."
          className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 font-semibold placeholder:text-slate-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <ScrollArea className="h-[calc(100vh-420px)] min-h-75">
        <div className="space-y-2 pr-2">
          {isFetching && (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-blue-600 h-6 w-6" />
            </div>
          )}

          {!isFetching && searchResults.length === 0 && searchTerm.length > 2 && (
            <div className="text-center py-10 text-slate-400 text-sm">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              No results found
            </div>
          )}

          {searchResults.map((item) => (
            <button
              key={item.poLineId}
              type="button"
              onClick={() => handleSelectPO(item)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                selectedPOLine?.poLineId === item.poLineId
                  ? "border-blue-500 bg-blue-50 shadow-md"
                  : "border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/50"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="min-w-0 flex-1">
                  <span className="font-black text-sm text-slate-900 block truncate">
                    {item.duid}
                  </span>
                  <span className="font-black text-sm text-blue-700 block">
                    ₦{item.poLineAmount?.toLocaleString() || 0}
                  </span>

                  {item.poNumber && (
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                      PO: {item.poNumber}
                    </span>
                  )}
                  {item.pm && (
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-tighter">
                      PM: {item.pm}
                    </span>
                  )}
                </div>
                {item.poLineNumber && (
                  <Badge
                    variant="outline"
                    className="text-[9px] border-slate-200 text-slate-600 shrink-0"
                  >
                    LINE {item.poLineNumber}
                  </Badge>
                )}
              </div>

              <p className="text-[11px] text-slate-600 line-clamp-2 mb-3 leading-tight italic">
                {item.itemDescription || "No description provided"}
              </p>

              {item.isNegotiationRequired ? (
                <div className="flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                  <AlertTriangle className="h-3 w-3" />
                  AWAITING CONTRACT SETUP
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                  <CheckCircle2 className="h-3 w-3" />
                  CONTRACT: ₦{(item.contractAmount || 0).toLocaleString()}
                </div>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
