// src/notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a notification
   * @param userId recipient
   * @param type enum NotificationType
   * @param payload JSON payload
   * @param fundRequestId optional FundRequest relation
   */
  async createNotification(userId: string, type: NotificationType, payload: object, fundRequestId?: string) {
    return this.prisma.notification.create({
      data: {
        userId,
        type,
        payload,
        fundRequestId: fundRequestId || null,
      },
    });
  }

  /** Mark a notification as read */
  async markAsRead(notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { sentAt: new Date() }, // optional: track read/sent
    });
  }

  /** Fetch all notifications for a user */
  async getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
