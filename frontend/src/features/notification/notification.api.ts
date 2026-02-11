import axios from "axios";

export const notificationApi = {
    // Fetch all notifications for the logged-in user
    getNotifications: () => axios.get("/notifications").then((res) => res.data),

    // Get the unread count for the badge
    getUnreadCount: () => axios.get("/notifications/unread-count").then((res) => res.data),

    // Mark a specific notification as read
    markAsRead: (id: string) => axios.patch(`/notifications/${id}/read`),

    // Enterprise feature: Mark all as read
    markAllAsRead: () => axios.patch("/notifications/read-all"),
};
