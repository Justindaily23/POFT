import React from "react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fundRequestApi } from "@/api/fund-request/fundRequest.api";
import type { FundRequestResponseDto } from "@/types/fund-request/fundRequest.type";
import type { AppAxiosError } from "@/types/api/api.types";
import { formatNaira } from "@/utils/fund-request/schema";
import { toast } from "sonner";
import { User, Wallet, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  const [contractAmount, setContractAmount] = useState<number | undefined>();
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
    onError: (error: AppAxiosError) => {
      const data = error.response?.data;
      if (data?.requiresContract) {
        setShowApproveModal(true);
      } else {
        toast.error(data?.message || "Failed to approve request.");
      }
    },
  });

  // 2️⃣ Manual approve with contract amount
  const approveWithContractMutation = useMutation({
    mutationFn: (amount: number) =>
      fundRequestApi.approveOrReject(request.id, FundRequestAction.APPROVE, amount),
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

  // 3️⃣ Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: (reason: string) =>
      fundRequestApi.approveOrReject(request.id, FundRequestAction.REJECT, undefined, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminFundRequests"] });
      toast.success("Request rejected. PM has been notified.");
      setShowRejectModal(false);
      setRejectionReason("");
    },
    onError: (error: AppAxiosError) => {
      const data = error?.response?.data;
      const rawMessage = Array.isArray(data?.message)
        ? data.message.join(", ")
        : data?.message || "An unexpected error occurred";
      toast.error(rawMessage);
    },
  });

  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl p-4 transition-all flex flex-col justify-between h-full ${
        isHistory ? "bg-slate-50 opacity-80" : "shadow-sm hover:shadow-md hover:border-blue-200"
      }`}
    >
      {/* Header & Details */}
      <div className="min-w-0">
        <div className="flex justify-between items-start mb-3 gap-2">
          <div className="space-y-0.5 min-w-0">
            <span className="text-[9px] font-bold text-slate-900 uppercase tracking-tight">
              Amount
            </span>
            <h2 className="text-lg font-bold tracking-tight truncate text-slate-900">
              {formatNaira(request.requestedAmount)}
            </h2>
          </div>

          <div
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${
              !isHistory
                ? "bg-blue-50 text-blue-700 border-blue-100"
                : request.status === "APPROVED"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : "bg-red-50 text-red-700 border-red-100"
            }`}
          >
            {isHistory ? request.status : "Pending"}
          </div>
        </div>

        <div className="space-y-2 mb-3 py-2 border-y border-slate-50">
          <DetailRow
            icon={<User />}
            label="PM"
            value={request.pm || "N/A"}
            labelClass="text-slate-900 font-bold"
          />
          <DetailRow
            icon={<Wallet />}
            label="DUID / Line"
            value={`${request.duid} / ${request.poLineNumber || "N/A"}`}
            valueClass="font-mono text-slate-900"
            labelClass="text-slate-900 font-bold"
          />
          <DetailRow
            icon={<Wallet />}
            label="Contract"
            value={formatNaira(request.contractAmount)}
            valueClass="text-blue-950 font-mono"
            labelClass="text-slate-900 font-bold"
          />
          <DetailRow
            icon={<Wallet />}
            label="Requested"
            value={formatNaira(request.totalRequestedAmount)}
            valueClass="text-orange-600 font-mono"
            labelClass="text-slate-900 font-bold"
          />
          <DetailRow
            icon={<Wallet />}
            label="Approved"
            value={formatNaira(request.totalApprovedAmount)}
            valueClass="text-emerald-800 font-mono"
            labelClass="text-slate-900 font-bold"
          />
          <DetailRow
            icon={<Wallet />}
            label="Balance"
            value={formatNaira(request.remainingBalance)}
            valueClass="text-red-900 font-mono"
            labelClass="text-slate-900 font-bold"
          />
        </div>

        <div className="mb-4 h-8">
          <p className="text-[10px] text-slate-500 italic line-clamp-2 leading-tight">
            "{request.requestPurpose}"
          </p>
        </div>
      </div>

      {!isHistory ? (
        <div className="flex gap-2 pt-2 border-t border-slate-50">
          <Button
            size="sm"
            onClick={() => approveAttemptMutation.mutate()}
            disabled={approveAttemptMutation.isPending || approveWithContractMutation.isPending}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-[10px] font-bold"
          >
            {approveAttemptMutation.isPending ? "..." : "Approve"}
          </Button>

          <Button
            size="sm"
            onClick={() => setShowRejectModal(true)}
            disabled={approveAttemptMutation.isPending || approveWithContractMutation.isPending}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white h-7 text-[10px] font-bold"
          >
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
          <p className="text-xs text-slate-500 mb-2">
            No contract amount found for this line. Please set the total contract value to proceed.
          </p>
          <Input
            type="number"
            placeholder="Enter Amount in Naira"
            value={contractAmount ?? ""}
            onChange={(e) => setContractAmount(Number(e.target.value))}
          />
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

      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Rejection Reason</DialogTitle>
          </DialogHeader>
          <Input
            type="text"
            placeholder="Explain why this request is being rejected"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="mb-2"
          />
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
function DetailRow({
  icon,
  label,
  value,
  valueClass = "text-slate-700",
  labelClass = "text-slate-900 font-bold", // Defaulting to darker/bolder here
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
        {React.isValidElement(icon)
          ? React.cloneElement(icon as React.ReactElement, { className: "h-3.5 w-3.5 opacity-90" })
          : icon}
        {label}
      </span>
      {/* Fallback to "0" or "N/A" here to stop NaN from showing up */}
      <span className={`font-semibold truncate ml-4 ${valueClass}`}>
        {value === "NaN" || value === null || value === undefined ? "0" : value}
      </span>
    </div>
  );
}
