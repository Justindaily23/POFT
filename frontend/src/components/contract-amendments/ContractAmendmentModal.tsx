"use client";

import React, { useState } from "react";
import { useContractAmendment } from "@/hooks/contract-amendments/useContractAmendment";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PurchaseOrderLine } from "@/types/po-workspace/types";
import type { FundRequestResponseDto } from "@/types/fund-request/fundRequest.type";

interface Props {
  poLine: PurchaseOrderLine;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: (updatedPoLine: FundRequestResponseDto) => void;
}

export const ContractAmendmentModal: React.FC<Props> = ({ poLine, isOpen, onClose, onRefresh }) => {
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState("");

  const [prevId, setPrevId] = useState<string | null>(null);

  if (isOpen && poLine?.id !== prevId) {
    setAmount(poLine?.contractAmount?.toString() || "");
    setReason("");
    setPrevId(poLine?.id || null);
  }

  const { mutate, isPending } = useContractAmendment((updatedPoLine) => {
    onRefresh(updatedPoLine);
    onClose();
  });

  const handleConfirm = () => {
    if (!poLine) return;

    mutate({
      purchaseOrderLineId: poLine.id,
      newContractAmount: Number(amount),
      reason,
    });
  };

  const isInvalid =
    !amount || reason.trim().length < 5 || Number(amount) < Number(poLine?.amountSpent || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Amend Contract Amount</DialogTitle>
          <DialogDescription className="text-bold text-foreground">
            Current Contract:{" "}
            <span className="font-bold text-foreground">
              ₦{Number(poLine?.contractAmount || 0).toLocaleString()}
            </span>
            <br />
            Minimum Allowed:{" "}
            <span className="font-bold text-red-600">
              ₦{Number(poLine?.amountSpent || 0).toLocaleString()}
            </span>
            <span className="block mt-1 text-[10px] text-foreground italic">
              (Cannot reduce below already approved funds)
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700 uppercase">
              New Total Amount (₦)
            </label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter new total"
              className="font-medium"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700 uppercase">
              Reason for Change
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a reason for the audit trail..."
              className="resize-none h-24"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPending || isInvalid}>
            {isPending ? "Saving..." : "Confirm Amendment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
