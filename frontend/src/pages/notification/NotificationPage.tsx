import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "@/api/notification/notification.api";
import {
  CheckCircle2,
  XCircle,
  Bell,
  Clock,
  ArrowRight,
  Wallet,
  Loader2,
  CheckCheck,
  AlertTriangle,
  History,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Notification } from "../../types/notification/notification.types";

export default function NotificationPage() {
  const queryClient = useQueryClient();

  // 1. FETCH DATA (Truth: Scoped to current PM)
  const { data, isLoading, isFetching } = useQuery<Notification[], Error>({
    queryKey: ["notifications"],
    queryFn: notificationApi.getNotifications,
    refetchInterval: 30_000, // 🛡️ Finance Refresh: 30s
  });

  const notifications: Notification[] = Array.isArray(data) ? data : [];
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  // 2. MUTATIONS (Truth: Immediate Badge Update)
  const markReadMutation = useMutation<void, Error, string>({
    mutationFn: notificationApi.markAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllReadMutation = useMutation<void, Error>({
    mutationFn: notificationApi.markAllAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  // 3. ICON LOGIC (Truth: Visual Priority)
  const getIcon = (type: string) => {
    switch (type) {
      case "FUND_REQUEST_APPROVED":
        return <CheckCircle2 className="text-emerald-500 h-5 w-5" />;
      case "FUND_REQUEST_REJECTED":
        return <XCircle className="text-rose-500 h-5 w-5" />;
      case "FUND_REQUEST_CREATED":
        return <Wallet className="text-indigo-500 h-5 w-5" />;
      case "PO_AGING_ALERT": // 🛡️ Critical PO Aging Alert
        return <AlertTriangle className="text-orange-500 h-5 w-5 animate-pulse" />;
      default:
        return <Bell className="text-slate-400 h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="font-black text-[10px] uppercase tracking-widest">Syncing Inbox...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-28">
      {/* HEADER */}
      <header className="sticky top-0 bg-[#F8FAFC]/80 backdrop-blur-md z-10 py-3 mb-4 border-b border-slate-200 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Inbox</h1>
          {unreadCount > 0 && (
            <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 active:bg-blue-100 transition-colors"
          >
            <CheckCheck size={14} /> Clear All
          </button>
        )}
      </header>

      <div className="space-y-3">
        {notifications.length === 0 && (
          <div className="text-center py-32 text-slate-300">
            <div className="bg-white border border-slate-100 shadow-sm w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <History className="h-8 w-8 opacity-20" />
            </div>
            <p className="font-black text-[10px] tracking-widest uppercase">No Recent Alerts</p>
          </div>
        )}

        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => !n.readAt && markReadMutation.mutate(n.id)}
            className={`group p-4 rounded-2xl border transition-all flex gap-4 cursor-pointer relative overflow-hidden ${
              !n.readAt
                ? "bg-white border-blue-100 shadow-lg shadow-blue-500/5"
                : "bg-slate-50 border-transparent opacity-60"
            }`}
          >
            {/* Unread Indicator Bar */}
            {!n.readAt && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />}

            <div className="mt-1 shrink-0">{getIcon(n.type)}</div>

            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex justify-between items-start">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {n.type.replace(/_/g, " ")}
                </p>
                {isFetching && !n.readAt && (
                  <Loader2 size={10} className="animate-spin text-blue-400" />
                )}
              </div>

              {/* DYNAMIC MESSAGE LOGIC (Truth: Contextual Information) */}
              <p className="text-sm font-bold text-slate-800 leading-snug">
                {n.type === "FUND_REQUEST_APPROVED" &&
                  `₦${n.payload?.approvedAmount?.toLocaleString()} has been approved for disbursement.`}
                {n.type === "FUND_REQUEST_REJECTED" &&
                  `Fund request declined: ${n.payload?.reason}`}
                {n.type === "FUND_REQUEST_CREATED" &&
                  `New request for DUID ${n.payload?.duid} successfully submitted.`}

                {/* 🛡️ PO AGING ALERT LOGIC */}
                {n.type === "PO_AGING_ALERT" && (
                  <span className="flex flex-col gap-1">
                    <span>
                      {n.payload?.duid}: SLA Alert ({n.payload?.status})
                    </span>
                    <span className="text-[10px] font-black text-red-600 uppercase">
                      Overdue by {n.payload?.daysOpen} Days
                    </span>
                  </span>
                )}
              </p>

              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 pt-1">
                <Clock size={12} className="opacity-50" />
                {n.createdAt && formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
              </div>
            </div>

            <ArrowRight
              size={16}
              className="text-slate-300 self-center group-hover:translate-x-1 transition-transform"
            />
          </div>
        ))}

        {isFetching && notifications.length > 0 && (
          <div className="flex justify-center py-4">
            <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest animate-pulse">
              Refreshing Data...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
