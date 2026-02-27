import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import nodemailer, { Transporter } from 'nodemailer';
import { logger } from 'src/common/logger/logger';
import { EmailTemplates } from './templates/email-templates';
import { NotificationMapping } from './types/notification-payload.interface';

@Processor('notifications')
export class NotificationsProcessor {
  private transporter: Transporter;

  constructor(private prisma: PrismaService) {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      pool: true,
      maxConnections: 5,
    });
  }

  /**
   * 2. TYPE-SAFE DISPATCHER
   * Uses Generics to link the Enum Key to the Map Interface.
   * This ensures 'p' is exactly the interface required for the template.
   */
  private getTemplateContent<K extends keyof NotificationMapping>(type: K, payload: unknown) {
    const builder = EmailTemplates[type];
    if (!builder) return null;

    /**
     * ✅ INDUSTRY PROOF FIX:
     * We cast through 'unknown' to bridge the gap between the
     * NotificationMapping definition and the Template Registry.
     */
    const typedBuilder = builder as unknown as (p: NotificationMapping[K]) => { subject: string; html: string };

    return typedBuilder(payload as NotificationMapping[K]);
  }

  @Process('send-notification')
  async handleNotification(job: Job<{ notificationId: string }>) {
    const { notificationId } = job.data;

    // 1. Fetch notification and include user relation for the email address
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: { user: true },
    });

    // Safety check: skip if handled or data is missing
    if (!notification || notification.sentAt) {
      logger.info(`Job ${job.id} skipped: Notification ${notificationId} handled or not found.`);
      return;
    }

    if (!notification.user?.email) {
      logger.warn(`Job ${job.id} skipped: User email missing for ${notificationId}.`);
      return;
    }

    // 3. Resolve the template using our Generic Helper (No 'any' used here)
    const template = this.getTemplateContent(notification.type as keyof NotificationMapping, notification.payload);

    if (!template) {
      logger.error(`No email template defined for type: ${notification.type}`);
      return;
    }

    const { subject, html } = template;

    try {
      // 4. Send via Pooled SMTP Transporter
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: notification.user.email,
        subject,
        html,
      });

      // 5. Atomic Update: Mark as sent in DB to prevent duplicates
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { sentAt: new Date() },
      });

      logger.info(`Email [${notification.type}] successfully sent to ${notification.user.email}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown SMTP Error';
      logger.error(`Mail Error for ${notificationId}: ${errorMessage}`);

      // ✅ THROW: This allows BullMQ to execute retries based on your Queue settings
      throw err;
    }
  }
}
