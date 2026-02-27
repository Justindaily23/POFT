import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, Prisma } from '@prisma/client';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { logger } from 'src/common/logger/logger';
import { AllNotificationPayloads } from './types/notification-payload.interface';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('notifications') private readonly notificationQueue: Queue,
  ) {}

  /**
   * Internal method for direct DB creation if needed
   */
  async createNotification(
    userId: string,
    type: NotificationType,
    payload: AllNotificationPayloads,
    fundRequestId?: string,
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        type,
        payload: payload as unknown as Prisma.InputJsonValue,
        fundRequestId: fundRequestId || null,
      },
    });
  }

  /**
   * Create, Persist, and Dispatch
   * This is the single point of entry for ALL notifications in the app.
   */
  async notify(
    userId: string,
    type: NotificationType,
    payload: AllNotificationPayloads, // Removed 'any' and redundant types
    fundRequestId?: string,
  ) {
    try {
      // 1. PERSISTENCE: Save to DB (The Source of Truth for In-App Bell)
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          type,
          // FIX: Cast to unknown then InputJsonValue to resolve 'Unsafe assignment'
          payload: payload as unknown as Prisma.InputJsonValue,
          fundRequestId: fundRequestId || null,
        },
      });

      // 2. DISPATCH: Add to Bull Queue for background Email/SMS processing
      await this.notificationQueue.add('send-notification', {
        notificationId: notification.id,
      });

      return notification;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Notification Dispatch Failed: ${message}`);
      // Return null or handle gracefully so business logic isn't interrupted
      return null;
    }
  }

  /** Mark a notification as read (Updates the In-App UI) */
  async markAsRead(notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  /** Mark all notifications as read for a specific user */
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  /** Fetch all notifications for a user (For the Notification Page) */
  async getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /** Get unread count (For the Notification Bell Badge) */
  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        readAt: null,
      },
    });
  }
}
