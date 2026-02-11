import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { POLineSearchResponseData } from "../fundRequest.type";

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
      <input
        placeholder="Enter DUID or PO Number..."
        className="h-12 bg-slate-50 border-slate-200 font-semibold placeholder:text-slate-400 rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <ScrollArea className="h-[calc(100vh-400px)] min-h-50">
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
                <div>
                  <span className="font-black text-sm text-slate-900 block">{item.duid}</span>
                  <span className="font-black text-sm text-slate-900 block">
                    ₦{item.poLineAmount?.toLocaleString() || 0}
                  </span>

                  {item.poNumber && <span className="text-xs text-slate-500">{item.poNumber}</span>}
                  {item.pm && (
                    <span className="text-xs text-slate-500 block mt-1">PM: {item.pm}</span>
                  )}
                </div>
                {item.poLineNumber && (
                  <Badge variant="outline" className="text-[9px] border-slate-200 text-slate-600">
                    LINE {item.poLineNumber}
                  </Badge>
                )}
              </div>

              <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                {item.itemDescription || "No description"}
              </p>

              {item.isNegotiationRequired ? (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Contract Amount Not Set
                </Badge>
              ) : (
                <div className="flex items-center gap-1 text-[10px] font-bold text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Contract: ₦{(item.contractAmount || 0).toLocaleString()}
                </div>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
