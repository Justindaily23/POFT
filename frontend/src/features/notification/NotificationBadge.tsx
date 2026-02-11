import { useQuery } from "@tanstack/react-query";
import { notificationApi } from "./notification.api";
import { Bell } from "lucide-react";

export function NotificationBadge() {
    const { data: count } = useQuery({
        queryKey: ["unreadCount"],
        queryFn: notificationApi.getUnreadCount,
        refetchInterval: 60000, // Update badge every minute
    });

    return (
        <div className="relative p-2">
            <Bell className="h-6 w-6 text-slate-600" />
            {count > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                    {count > 9 ? "9+" : count}
                </span>
            )}
        </div>
    );
}
