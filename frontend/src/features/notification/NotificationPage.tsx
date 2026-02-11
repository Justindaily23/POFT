import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "./notification.api";
import { CheckCircle2, XCircle, Bell, Clock, ArrowRight, Wallet, Loader2, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function NotificationPage() {
    const queryClient = useQueryClient();

    // 1. Fetch Notifications
    const { data: notifications, isLoading } = useQuery({
        queryKey: ["notifications"],
        queryFn: notificationApi.getNotifications,
    });

    // 2. Mark Single as Read
    const markReadMutation = useMutation({
        mutationFn: notificationApi.markAsRead,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    });

    // 3. Mark All as Read
    const markAllReadMutation = useMutation({
        mutationFn: notificationApi.markAllAsRead,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    });

    const getIcon = (type: string) => {
        switch (type) {
            case "FUND_REQUEST_APPROVED":
                return <CheckCircle2 className="text-green-500 h-5 w-5" />;
            case "FUND_REQUEST_REJECTED":
                return <XCircle className="text-red-500 h-5 w-5" />;
            case "FUND_REQUEST_CREATED":
                return <Wallet className="text-blue-500 h-5 w-5" />;
            default:
                return <Bell className="text-slate-400 h-5 w-5" />;
        }
    };

    // Calculate unread count safely
    const unreadCount = notifications?.filter((n: any) => !n.readAt).length || 0;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="font-bold text-xs uppercase tracking-widest">Updating Feed...</p>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto p-5 pb-28 pt-10 space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <header className="flex justify-between items-end">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-slate-900">Notifications</h1>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-md uppercase tracking-tighter">
                            {unreadCount} New
                        </span>
                    </div>
                </div>

                {unreadCount > 0 && (
                    <button
                        onClick={() => markAllReadMutation.mutate()}
                        className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                    >
                        <CheckCheck className="h-3 w-3" />
                        Mark all as read
                    </button>
                )}
            </header>

            <div className="space-y-3">
                {/* SAFE EMPTY STATE CHECK */}
                {(!notifications || notifications.length === 0) && (
                    <div className="text-center py-20 text-slate-300">
                        <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bell className="h-10 w-10 opacity-20" />
                        </div>
                        <p className="font-black uppercase text-[10px] tracking-[0.2em]">All caught up!</p>
                    </div>
                )}

                {notifications?.map((n: any) => (
                    <div
                        key={n.id}
                        onClick={() => !n.readAt && markReadMutation.mutate(n.id)}
                        className={`group p-5 rounded-4x1 border transition-all active:scale-[0.98] flex gap-4 cursor-pointer ${
                            !n.readAt
                                ? "bg-white border-blue-100 shadow-xl shadow-blue-900/5"
                                : "bg-slate-50/50 border-transparent opacity-60"
                        }`}
                    >
                        <div className="mt-1 shrink-0">{getIcon(n.type)}</div>

                        <div className="flex-1 space-y-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">
                                    {n.type.replace(/_/g, " ")}
                                </p>
                                {!n.readAt && <span className="h-2 w-2 bg-blue-600 rounded-full animate-pulse shrink-0 ml-2" />}
                            </div>

                            <p className="text-sm font-bold text-slate-800 leading-tight">
                                {n.type === "FUND_REQUEST_APPROVED" && `₦${n.payload.approvedAmount?.toLocaleString()} has been approved.`}
                                {n.type === "FUND_REQUEST_REJECTED" && `Request rejected: ${n.payload.reason}`}
                                {n.type === "FUND_REQUEST_CREATED" && `New request for ${n.payload.duid} requires review.`}
                            </p>

                            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 pt-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                            </div>
                        </div>

                        <ArrowRight className="h-4 w-4 text-slate-300 self-center group-hover:translate-x-1 transition-transform shrink-0" />
                    </div>
                ))}
            </div>
        </div>
    );
}
