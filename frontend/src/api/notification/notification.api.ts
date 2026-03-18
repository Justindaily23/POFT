import apiClient from "../auth/axios";
import type { Notification } from "../../types/notification/notification.types";

export const notificationApi = {
  getNotifications: async (): Promise<Notification[]> => {
    try {
      const res = await apiClient.get<Notification[]>("/notifications");
      // Ensure we always return an array
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.error("Failed to fetch notifications", err);
      return [];
    }
  },

  getUnreadCount: async (): Promise<number> => {
    try {
      const res = await apiClient.get<number>("/notifications/unread-count");
      return typeof res.data === "number" ? res.data : 0;
    } catch (err) {
      console.error("Failed to fetch unread count", err);
      return 0;
    }
  },

  markAsRead: async (id: string): Promise<void> => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
    } catch (err) {
      console.error(`Failed to mark notification ${id} as read`, err);
    }
  },

  markAllAsRead: async (): Promise<void> => {
    try {
      await apiClient.patch("/notifications/read-all");
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    }
  },
};
