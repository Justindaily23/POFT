import React from "react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fundRequestApi } from "@/api/fund-request/fundRequest.api";
import type { FundRequestResponseDto } from "@/types/fund-request/fundRequest.type";
import type { AppAxiosError, BackendErrorData } from "@/types/api/api.types";
import { formatNaira } from "@/utils/fund-request/schema";
import { toast } from "sonner";
import { User, Wallet, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface AdminCardProps {
  request: FundRequestResponseDto;
  isHistory?: boolean;
}

export const FundRequestAction = {
  APPROVE: "APPROVE",
  REJECT: "REJECT",
} as const;

export type FundRequestAction = (typeof FundRequestAction)[keyof typeof FundRequestAction];

export default function AdminFundRequestCard({ request, isHistory = false }: AdminCardProps) {
  const queryClient = useQueryClient();

  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showApproveReviewModal, setShowApproveReviewModal] = useState(false);
  const [contractAmount, setContractAmount] = useState<number | undefined>();
  const [updatedRequestedAmount, setUpdatedRequestedAmount] = useState<number | undefined>();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string>("");

  // ─── Mutations ────────────────────────────────

  // 1️⃣ Initial approve attempt
  const approveAttemptMutation = useMutation({
    mutationFn: () => fundRequestApi.approveOrReject(request.id, FundRequestAction.APPROVE),
    onSuccess: () => {
      toast.success("Request approved successfully!");
      queryClient.invalidateQueries({ queryKey: ["adminFundRequests"] });
    },
    onError: (error: BackendErrorData) => {
      // 🛡️ Access the property DIRECTLY from the error object (not error.response)
      const needsContract = error.requiresContract === true;

      if (needsContract) {
        // Ensure state is fresh
        setShowApproveModal(false);
        setTimeout(() => {
          setShowApproveModal(true);
        }, 50);
      } else {
        toast.error(error.message || "Failed to approve request.");
      }
    },
  });

  // 2️⃣ Manual approve with contract amount
  const approveWithContractMutation = useMutation({
    mutationFn: (amount: number) => fundRequestApi.approveOrReject(request.id, FundRequestAction.APPROVE, amount),
    onSuccess: () => {
      toast.success("Request approved successfully!");
      queryClient.invalidateQueries({ queryKey: ["adminFundRequests"] });
      queryClient.invalidateQueries({ queryKey: ["fund-request-history", request.poLineId] });
      setShowApproveModal(false);
      setContractAmount(undefined);
    },
    onError: (error: AppAxiosError) => {
      toast.error(error.response?.data?.message || "Failed to approve request.");
    },
  });

  const approveWithAmountMutation = useMutation({
    mutationFn: (amount?: number) => fundRequestApi.approveOrReject(request.id, FundRequestAction.APPROVE, undefined, undefined, amount),
    onSuccess: () => {
      toast.success("Request approved successfully!");
      queryClient.invalidateQueries({ queryKey: ["adminFundRequests"] });
      queryClient.invalidateQueries({ queryKey: ["fund-request-history", request.poLineId] });
      setShowApproveReviewModal(false);
      setUpdatedRequestedAmount(undefined);
    },
    onError: (error: AppAxiosError) => {
      toast.error(error.response?.data?.message || "Failed to approve request.");
    },
  });

  // 3️⃣ Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: (reason: string) => fundRequestApi.approveOrReject(request.id, FundRequestAction.REJECT, undefined, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminFundRequests"] });
      toast.success("Request rejected. PM has been notified.");
      setShowRejectModal(false);
      setRejectionReason("");
    },
    onError: (error: AppAxiosError) => {
      const data = error?.response?.data;
      const rawMessage = Array.isArray(data?.message) ? data.message.join(", ") : data?.message || "An unexpected error occurred";
      toast.error(rawMessage);
    },
  });

  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 transition-all flex flex-col justify-between h-full ${isHistory ? "bg-slate-50 opacity-80" : "shadow-sm hover:shadow-md hover:border-blue-200"}`}>
      <div className="min-w-0">
        <div className="flex justify-between items-start mb-3 gap-2">
          <div className="space-y-0.5 min-w-0">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Requested</span>
            <h2 className="text-lg font-black tracking-tight truncate text-slate-900">{formatNaira(request.requestedAmount)}</h2>
          </div>

          <div
            className={`text-[9px] font-bold px-2 py-1 rounded-full border uppercase shrink-0 ${
              !isHistory ? "bg-blue-50 text-blue-700 border-blue-100" : request.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
            }`}
          >
            {isHistory ? request.status : "Pending"}
          </div>
        </div>

        <div className="mb-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <MetricCell label="PO Amount" value={formatNaira(request.poLineAmount)} valueClass="text-slate-900" />
            <MetricCell label="Contract" value={formatNaira(request.contractAmount)} valueClass="text-blue-700" />
            <MetricCell label="Approved" value={formatNaira(request.totalApprovedAmount)} valueClass="text-emerald-700" />
            <MetricCell label="Balance" value={formatNaira(request.remainingBalance)} valueClass="text-amber-700" />
          </div>
        </div>

        <div className="space-y-1.5 mb-3 rounded-lg border border-slate-100 bg-white p-2.5">
          <DetailRow icon={<User />} label="PM" value={request.pm || "N/A"} labelClass="text-slate-500" valueClass="text-slate-800" />
          <DetailRow icon={<Wallet />} label="PO No." value={request.poNumber || "N/A"} valueClass="font-mono text-slate-800" labelClass="text-slate-500" />
          <DetailRow icon={<Wallet />} label="PO Line" value={request.poLineNumber || "N/A"} valueClass="font-mono text-slate-800" labelClass="text-slate-500" />
          <DetailRow icon={<Wallet />} label="DUID" value={request.duid || "N/A"} valueClass="font-mono text-slate-800" labelClass="text-slate-500" />
        </div>

        <div className="mb-4 rounded-lg bg-slate-50 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Description</p>
          <p className="text-[10px] text-slate-600 leading-relaxed line-clamp-3">{request.itemDescription || "No description available"}</p>
          <p className="mt-2 text-[10px] text-slate-500 italic line-clamp-2">"{request.requestPurpose}"</p>
        </div>
      </div>

      {!isHistory ? (
        <div className="flex gap-2 pt-2 border-t border-slate-50">
          <Button
            size="sm"
            onClick={() => {
              if (request.contractAmount == null) {
                approveAttemptMutation.mutate();
              } else {
                setUpdatedRequestedAmount(request.requestedAmount);
                setShowApproveReviewModal(true);
              }
            }}
            disabled={approveAttemptMutation.isPending || approveWithContractMutation.isPending || approveWithAmountMutation.isPending}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-[10px] font-bold"
          >
            {approveAttemptMutation.isPending || approveWithAmountMutation.isPending ? "..." : "Approve"}
          </Button>

          <Button size="sm" onClick={() => setShowRejectModal(true)} disabled={approveAttemptMutation.isPending || approveWithContractMutation.isPending} className="flex-1 bg-red-600 hover:bg-red-700 text-white h-7 text-[10px] font-bold">
            Reject
          </Button>
        </div>
      ) : (
        <div className="flex justify-between items-center pt-2 border-t border-slate-50 text-[9px] font-bold text-slate-400 uppercase">
          <div className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 opacity-40" /> Audited
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 opacity-40" />
            {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : "N/A"}
          </div>
        </div>
      )}

      {/* Modals */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Initial Contract Setup</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500 mb-2">No contract amount found for this line. Please set the total contract value to proceed.</p>
          <Input type="number" placeholder="Enter Amount in Naira" value={contractAmount ?? ""} onChange={(e) => setContractAmount(Number(e.target.value))} />
          <DialogFooter>
            <Button
              className="w-full"
              disabled={approveWithContractMutation.isPending}
              onClick={() => {
                if (contractAmount && contractAmount > 0) {
                  approveWithContractMutation.mutate(contractAmount);
                } else {
                  toast.error("Enter a valid contract amount");
                }
              }}
            >
              {approveWithContractMutation.isPending ? "Setting Up..." : "Set Amount & Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showApproveReviewModal} onOpenChange={setShowApproveReviewModal}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Confirm Approval</DialogTitle>
            <DialogDescription>Review the request before approving it. You can also adjust the requested amount if needed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="rounded-lg bg-slate-50 p-3 space-y-1">
              <p>
                <span className="font-semibold text-slate-700">PO Amount:</span> {formatNaira(request.poLineAmount)}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Current Request:</span> {formatNaira(request.requestedAmount)}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Contract:</span> {formatNaira(request.contractAmount)}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Balance:</span> {formatNaira(request.remainingBalance)}
              </p>
            </div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Updated Requested Amount</label>
            <Input type="number" placeholder="Leave blank to keep current amount" value={updatedRequestedAmount ?? ""} onChange={(e) => setUpdatedRequestedAmount(e.target.value === "" ? undefined : Number(e.target.value))} />
          </div>
          <DialogFooter>
            <Button
              className="w-full"
              disabled={approveWithAmountMutation.isPending}
              onClick={() => {
                if (updatedRequestedAmount !== undefined && updatedRequestedAmount < 0) {
                  toast.error("Requested amount cannot be negative");
                  return;
                }
                approveWithAmountMutation.mutate(updatedRequestedAmount);
              }}
            >
              {approveWithAmountMutation.isPending ? "Approving..." : "Confirm Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Rejection Reason</DialogTitle>
          </DialogHeader>
          <Input type="text" placeholder="Explain why this request is being rejected" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="mb-2" />
          <DialogFooter>
            <Button
              className="w-full"
              variant="destructive"
              disabled={rejectMutation.isPending}
              onClick={() => {
                if (!rejectionReason.trim()) return toast.error("Reason is required");
                rejectMutation.mutate(rejectionReason);
              }}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Internal Helper for clean layout
function MetricCell({ label, value, valueClass = "text-slate-900" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-md bg-white px-2 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className={`mt-1 text-[11px] font-black truncate ${valueClass}`}>{value}</p>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  valueClass = "text-slate-700",
  labelClass = "text-slate-500", // Defaulting to darker/bolder here
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number | null; // Added number/null to prevent TS errors
  valueClass?: string;
  labelClass?: string; // 👈 Added this prop
}) {
  return (
    <div className="flex justify-between items-center text-[11px] py-0.5">
      <span className={`flex items-center gap-1.5 shrink-0 ${labelClass}`}>
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement, { className: "h-3.5 w-3.5 opacity-90" }) : icon}
        {label}
      </span>
      {/* Fallback to "0" or "N/A" here to stop NaN from showing up */}
      <span className={`font-semibold truncate ml-4 ${valueClass}`}>
        {/* Check for null/undefined first, then check the string representation */}
        {!value || String(value).includes("NaN") ? "₦0.00" : value}
      </span>
    </div>
  );
}
