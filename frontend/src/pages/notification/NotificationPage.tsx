import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "@/api/notification/notification.api";
import {
  CheckCircle2,
  XCircle,
  Bell,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  History,
  Info,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { NotificationType } from "../../types/notification/notification.types";
import type {
  Notification,
  FundRequestStatusPayload,
  PoAgingAlertPayload,
  AccountCreatedPayload,
} from "../../types/notification/notification.types";

export default function NotificationPage() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: notificationApi.getNotifications,
    refetchInterval: 30000, // Syncs the Bell Icon every 30s
  });

  const markReadMutation = useMutation({
    mutationFn: notificationApi.markAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const handleExpand = (id: string, isRead: boolean) => {
    setExpandedId(expandedId === id ? null : id);
    if (!isRead) markReadMutation.mutate(id);
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  if (isLoading) return <LoadingState />;

  return (
    <div className="w-full max-w-2x1 mx-auto p-2 pb-28">
      {/* 🔔 ACTIVE BELL HEADER */}
      <header className="flex justify-between items-center py-4 mb-6 sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="relative bg-slate-900 p-2.5 rounded-2xl shadow-lg shadow-slate-200">
            <Bell size={20} className="text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white animate-in zoom-in">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Inbox</h1>
            <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">
              {unreadCount} Unread Alerts
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <EmptyState />
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-3xl border transition-all duration-300 ${
                !n.readAt
                  ? "bg-white shadow-xl border-blue-100"
                  : "bg-slate-50 border-transparent opacity-75"
              }`}
            >
              <div
                className="p-5 cursor-pointer flex gap-4"
                onClick={() => handleExpand(n.id, !!n.readAt)}
              >
                <div className="mt-1">{getIcon(n.type, n.payload)}</div>

                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md mb-2 inline-block">
                    {n.type.replace(/_/g, " ")}
                  </span>

                  <h3 className="text-sm font-bold text-slate-800 leading-tight">
                    {renderSummary(n)}
                  </h3>

                  {/* 🛡️ EXPANDED DETAIL PREVIEW (Truth: Rich Metadata) */}
                  {expandedId === n.id && (
                    <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                      {renderDetails(n)}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold mt-3">
                    <Clock size={12} />
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </div>
                </div>
                <div className="self-center text-slate-300">
                  {expandedId === n.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// --- LOGIC HELPERS (No 'any' types used) ---

function renderSummary(n: Notification) {
  const p = n.payload;
  if (n.type === NotificationType.FUND_REQUEST_APPROVED) {
    const payload = p as FundRequestStatusPayload;
    return `₦${(payload.requestedAmount ?? 0).toLocaleString()} approved for ${payload.duid}.`;
  }
  if (n.type === NotificationType.FUND_REQUEST_REJECTED) {
    const payload = p as FundRequestStatusPayload;
    return `Update: Fund request for ${payload.duid} was declined.`;
  }
  if (n.type === NotificationType.PO_AGING_ALERT || n.type === NotificationType.PO_AGING_WARNING) {
    const payload = p as PoAgingAlertPayload;
    return `SLA Alert: ${payload.duid || payload.projectName}`;
  }
  return "System update regarding your active files.";
}

function renderDetails(n: Notification) {
  const p = n.payload;

  const Row = ({
    label,
    val,
    isRed = false,
  }: {
    label: string;
    val?: string | number | null;
    isRed?: boolean;
  }) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">
        {label}
      </span>
      <span
        className={`text-[11px] font-bold truncate ${isRed ? "text-red-600" : "text-slate-800"}`}
      >
        {val ?? "N/A"}
      </span>
    </div>
  );

  // 1. FUND REQUEST STATUS (Approval/Rejection)
  if (
    n.type === NotificationType.FUND_REQUEST_APPROVED ||
    n.type === NotificationType.FUND_REQUEST_REJECTED
  ) {
    const status = p as FundRequestStatusPayload;
    return (
      <>
        <Row label="Project" val={status.projectName || status.projectCode} />
        <Row label="PM" val={status.pm} />
        <Row label="PO" val={status.poNumber} />
        <Row label="PO / Line" val={status.poLineNumber} />
        <Row label="Requested" val={`₦${status.requestedAmount?.toLocaleString()}`} />

        {n.type === NotificationType.FUND_REQUEST_APPROVED ? (
          <>
            <Row label="Contract" val={`₦${status.contractAmount?.toLocaleString()}`} />
            <Row
              label="Remaining"
              val={`₦${status.remainingBalance?.toLocaleString()}`}
              isRed={(status.remainingBalance ?? 0) < 0}
            />
          </>
        ) : (
          <div className="col-span-2">
            <Row label="Rejection Reason" val={status.rejectionReason} isRed />
          </div>
        )}
        <div className="col-span-2">
          <Row label="Description" val={status.itemDescription} />
        </div>
      </>
    );
  }

  // 2. PO AGING ALERTS
  if (n.type === NotificationType.PO_AGING_ALERT || n.type === NotificationType.PO_AGING_WARNING) {
    const alert = p as PoAgingAlertPayload;
    return (
      <>
        <Row label="Days Open" val={`${alert.daysOpen} Days`} isRed />
        <Row label="Limit" val={`${alert.allowedOpenDays} Days`} />
        <Row label="PO Number" val={alert.poNumber} />
        <Row label="PM" val={alert.pm} />
        <div className="col-span-2">
          <Row label="Status Flag" val={alert.agingFlag} isRed={alert.agingFlag === "RED"} />
        </div>
      </>
    );
  }

  // 3. ACCOUNT UPDATES
  if (n.type === NotificationType.ACCOUNT_CREATED) {
    const acc = p as AccountCreatedPayload;
    return (
      <>
        <Row label="Email" val={acc.email} />
        <Row label="Staff ID" val={acc.staffId} />
      </>
    );
  }

  return <Row label="Reference" val="General Notification" />;
}

function getIcon(type: string, payload: Notification["payload"]) {
  // Narrowing the check for Aging Alerts safely
  const isAging =
    type === NotificationType.PO_AGING_ALERT || type === NotificationType.PO_AGING_WARNING;

  if (type === NotificationType.FUND_REQUEST_APPROVED)
    return <CheckCircle2 className="text-emerald-500" size={20} />;
  if (type === NotificationType.FUND_REQUEST_REJECTED)
    return <XCircle className="text-rose-500" size={20} />;

  if (isAging) {
    // Cast to the specific alert type to access agingFlag safely
    const alert = payload as PoAgingAlertPayload;
    return (
      <AlertTriangle
        className={alert.agingFlag === "RED" ? "text-red-600 animate-pulse" : "text-orange-500"}
        size={20}
      />
    );
  }

  return <Info className="text-blue-500" size={20} />;
}

function EmptyState() {
  return (
    <div className="text-center py-24 opacity-30">
      <History className="mx-auto mb-2" size={40} />
      <p className="font-black text-[10px] tracking-widest uppercase text-slate-500">
        Inbox is Clear
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      <p className="font-black text-[9px] uppercase tracking-widest text-slate-400">
        Syncing Inbox...
      </p>
    </div>
  );
}
