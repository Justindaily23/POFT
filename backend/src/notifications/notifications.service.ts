// // src/notifications/notifications.service.ts
// import { Injectable } from '@nestjs/common';
// import { PrismaService } from '../prisma/prisma.service';
// import { NotificationType } from '@prisma/client';

// @Injectable()
// export class NotificationsService {
//   constructor(private prisma: PrismaService) {}

//   /**
//    * Create a notification
//    * @param userId recipient
//    * @param type enum NotificationType
//    * @param payload JSON payload
//    * @param fundRequestId optional FundRequest relation
//    */
//   async createNotification(userId: string, type: NotificationType, payload: object, fundRequestId?: string) {
//     return this.prisma.notification.create({
//       data: {
//         userId,
//         type,
//         payload,
//         fundRequestId: fundRequestId || null,
//       },
//     });
//   }

//   /** Mark a notification as read */
//   async markAsRead(notificationId: string) {
//     return this.prisma.notification.update({
//       where: { id: notificationId },
//       data: { sentAt: new Date() }, // optional: track read/sent
//     });
//   }

//   /** Fetch all notifications for a user */
//   async getUserNotifications(userId: string) {
//     return this.prisma.notification.findMany({
//       where: { userId },
//       orderBy: { createdAt: 'desc' },
//     });
//   }
// }

// src/notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { logger } from 'src/common/logger/logger';
import { FundRequestPayload, AccountCreatedPayload } from './types/notification-payload.interface';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('notifications') private readonly notificationQueue: Queue, // Added Queue
  ) {}

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
  /**
   * Create, Persist, and Dispatch
   * This is the single point of entry for ALL notifications in the app.
   */
  async notify(
    userId: string,
    type: NotificationType,
    payload: FundRequestPayload | AccountCreatedPayload | any,
    fundRequestId?: string,
  ) {
    try {
      // 1. PERSISTENCE: Save to DB (The Source of Truth for In-App Bell)
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          type,
          payload: payload as any,
          fundRequestId: fundRequestId || null,
        },
      });

      // 2. DISPATCH: Add to Bull Queue for background Email/SMS processing
      // We ONLY pass the notificationId to keep the queue light and data fresh
      await this.notificationQueue.add('send-notification', {
        notificationId: notification.id,
      });

      return notification;
    } catch (error) {
      logger.error(`Notification Dispatch Failed: ${error.message}`);
      // We don't throw here to prevent the main business logic (like approving a fund)
      // from failing just because a notification couldn't be queued.
    }
  }

  /** Mark a notification as read (Updates the In-App UI) */
  async markAsRead(notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() }, // Changed from sentAt to better represent User action
    });
  }

  // Mark all notification as read
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
      take: 50, // Best practice for enterprise: limit fetch size
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
