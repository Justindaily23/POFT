import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PO_LINE_STATUS_LABELS, type PoLineStatus } from "@/types/po-workspace/types";
import { useUpdatePoLineStatus } from "@/hooks/po-workspace/useUpdatePoLineStatus";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

export const StatusCell = ({
  id,
  currentStatus,
}: {
  id: string | null | undefined;
  currentStatus: string | null | undefined;
}) => {
  const { mutateAsync, isPending } = useUpdatePoLineStatus();
  const user = useAuthStore((state) => state.user);

  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Narrowing for TypeScript
  if (!id || !currentStatus) return <span className="text-[10px] text-slate-400 italic">N/A</span>;

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const getBadgeStyles = (status: string) =>
    status === "INVOICED"
      ? "bg-green-150 text-green-800 border-green-200"
      : "bg-red-150 text-red-800 border-red-200";

  const executeUpdate = async (statusToApply: string) => {
    await toast.promise(mutateAsync({ id, status: statusToApply }), {
      loading: "Syncing status...",
      success: `Status updated to ${PO_LINE_STATUS_LABELS[statusToApply as PoLineStatus]}`,
      error: (err) => {
        const serverMessage = err.response?.data?.message;
        return Array.isArray(serverMessage) ? serverMessage[0] : serverMessage || "Update failed";
      },
    });
    setIsConfirmOpen(false);
    setPendingStatus(null);
  };

  const handleSelectChange = (newStatus: string) => {
    // If the status is actually changing, trigger the confirmation
    if (newStatus !== currentStatus) {
      setPendingStatus(newStatus);
      setIsConfirmOpen(true);
    }
  };

  if (!isAdmin) {
    return (
      <span
        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getBadgeStyles(currentStatus)}`}
      >
        {PO_LINE_STATUS_LABELS[currentStatus as PoLineStatus] || currentStatus}
      </span>
    );
  }

  // Dynamic Dialog Content based on direction
  const isMarkingInvoiced = pendingStatus === "INVOICED";

  return (
    <>
      <Select value={currentStatus} onValueChange={handleSelectChange} disabled={isPending}>
        <SelectTrigger
          className={`h-7 w-28.75 text-[10px] font-bold uppercase border focus:ring-0 ${getBadgeStyles(currentStatus)}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(PO_LINE_STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value} className="text-[8px] uppercase font-medium">
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change PO Status?</AlertDialogTitle>
            <AlertDialogDescription>
              {isMarkingInvoiced ? (
                <>
                  You are marking this line as <strong>INVOICED</strong>. This indicates payment
                  processing is complete and may lock this line from further budget changes.
                </>
              ) : (
                <>
                  You are reverting this line to <strong>NOT INVOICED</strong>. This will reopen the
                  line for budget adjustments and remove it from the invoiced records.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingStatus(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={
                isMarkingInvoiced
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
              onClick={() => pendingStatus && executeUpdate(pendingStatus)}
            >
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
