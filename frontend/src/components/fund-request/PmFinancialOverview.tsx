import {
  Landmark,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { POLineSearchResponseData } from "../../types/fund-request/fundRequest.type";
import { useState } from "react";

interface Props {
  selectedPOLine: POLineSearchResponseData;
  requestedAmount: number;
}

export default function FinancialOverview({ selectedPOLine, requestedAmount }: Props) {
  const [showDetails, setShowDetails] = useState(false);

  const contractAmount = selectedPOLine.contractAmount || 0;
  const cumulativeApproved = selectedPOLine.cumulativeApprovedAmount || 0;
  const remainingBalance = selectedPOLine.remainingBalance || 0;
  const isNegotiation = selectedPOLine.isNegotiationRequired ?? true;

  const projectedBalance = remainingBalance - (requestedAmount || 0);
  const isOverLimit = !isNegotiation && requestedAmount > remainingBalance;

  const extraDetails = {
    "Project Name": selectedPOLine.projectName,
    "Item Code": selectedPOLine.itemCode,
    PM: selectedPOLine.pm,
    "PO Line Amount": selectedPOLine.poLineAmount,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      {!isNegotiation && (
        <>
          {/* Contract Amount */}
          <div className="bg-linear-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Landmark className="h-4 w-4 text-blue-600" />
              <span className="text-xs sm:text-[10px] font-black uppercase text-blue-700 tracking-wider">
                Contract
              </span>
              <button
                className="sm:hidden p-1"
                onClick={() => setShowDetails(!showDetails)}
                aria-label="Toggle extra details"
              >
                {showDetails ? (
                  <ChevronUp className="w-6 h-6 text-blue-600" />
                ) : (
                  <ChevronDown className="w-6 h-6 text-blue-600" />
                )}
              </button>
            </div>
            <p className="text-2xl font-black text-blue-900">₦{contractAmount.toLocaleString()}</p>

            {/* Collapsible extra details */}
            <div
              className={`sm:hidden mt-2 text-xs text-blue-700 space-y-1 overflow-hidden transition-all duration-200 ${
                showDetails ? "max-h-40" : "max-h-0"
              }`}
            >
              {Object.entries(extraDetails).map(([key, value]) => (
                <p key={key}>
                  <span className="font-semibold">{key}:</span> {value}
                </p>
              ))}
            </div>
          </div>

          {/* Approved Amount */}
          <div className="bg-linear-to-br from-green-50 to-green-100/50 rounded-xl p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-xs sm:text-[10px] font-black uppercase text-green-700 tracking-wider">
                Approved
              </span>
            </div>
            <p className="text-2xl font-black text-green-900">
              ₦{cumulativeApproved.toLocaleString()}
            </p>
            <p className="text-xs sm:text-[10px] text-green-600 font-semibold mt-1">
              {contractAmount > 0 ? ((cumulativeApproved / contractAmount) * 100).toFixed(1) : 0}%
              utilized
            </p>
          </div>

          {/* Remaining Balance */}
          <div
            className={`bg-linear-to-br rounded-xl p-4 border ${
              isOverLimit
                ? "from-red-50 to-red-100/50 border-red-200"
                : "from-slate-50 to-slate-100/50 border-slate-200"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp
                className={`h-4 w-4 ${isOverLimit ? "text-red-600" : "text-slate-600"}`}
              />
              <span
                className={`text-xs sm:text-[10px] font-black uppercase tracking-wider ${
                  isOverLimit ? "text-red-700" : "text-slate-700"
                }`}
              >
                Available
              </span>
            </div>
            <p className={`text-2xl font-black ${isOverLimit ? "text-red-900" : "text-slate-900"}`}>
              ₦{remainingBalance.toLocaleString()}
            </p>
            {requestedAmount > 0 && (
              <p
                className={`text-xs sm:text-[10px] font-semibold mt-1 ${
                  isOverLimit ? "text-red-600" : "text-slate-600"
                }`}
              >
                After: ₦{projectedBalance.toLocaleString()}
              </p>
            )}
          </div>
        </>
      )}

      {/* Negotiation Required */}
      {isNegotiation && (
        <div className="bg-linear-to-br from-amber-50 to-amber-100/50 rounded-xl p-5 border-2 border-amber-200 col-span-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-black text-amber-900 text-sm mb-1">Contract Required</h4>
              <p className="text-xs text-amber-700 leading-relaxed">
                This is the first fund request for this PO Line. Your Requested Amount will be
                reviewed and the Contract Amount for the Project will be set
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
