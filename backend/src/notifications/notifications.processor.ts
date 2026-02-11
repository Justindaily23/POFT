// // src/notifications/notifications.processor.ts
// import { Process, Processor } from '@nestjs/bull';
// import { Job } from 'bull';
// import { PrismaService } from '../prisma/prisma.service';
// import { NotificationType, Prisma } from '@prisma/client';
// import nodemailer from 'nodemailer';
// import { logger } from 'src/common/logger/logger';

// @Processor('notifications')
// export class NotificationsProcessor {
//   private transporter;

//   constructor(private prisma: PrismaService) {
//     // Initialize SMTP transporter once with pooling
//     this.transporter = nodemailer.createTransport({
//       host: process.env.SMTP_HOST,
//       port: Number(process.env.SMTP_PORT),
//       secure: Number(process.env.SMTP_PORT) === 465,
//       auth: {
//         user: process.env.SMTP_USER,
//         pass: process.env.SMTP_PASS,
//       },
//       pool: true,
//       maxConnections: 5,
//       maxMessages: 100,
//     });
//   }

//   @Process('send-notification') // 1. Match the name
//   async handleNotification(job: Job) {
//     const { userId, type, payload } = job.data; // 2. Destructure what the service actually sends

//     // If you don't want to save to DB first, you can just send the mail:
//     if (type === 'ACCOUNT_CREATED') {
//       const { subject, text, html } = this.composeEmail({
//         type,
//         payload,
//         user: { email: payload.email }, // Mock the user object for your composeEmail function
//       } as any);

//       try {
//         await this.transporter.sendMail({
//           from: process.env.SMTP_FROM,
//           to: payload.email,
//           subject,
//           text,
//           html,
//         });
//         logger.info(`Email sent to ${payload.email}`);
//       } catch (err) {
//         logger.error(`Mailtrap Error: ${err.message}`);
//         throw err;
//       }
//     }
//   }

//   // Fully type-safe composeEmail function with payload validation
//   private composeEmail(notification: Prisma.NotificationGetPayload<{ include: { user: true } }>): {
//     subject: string;
//     text?: string;
//     html?: string;
//   } {
//     let subject = '';
//     let text: string | undefined;
//     let html: string | undefined;

//     switch (notification.type) {
//       case NotificationType.FUND_REQUEST_CREATED:
//         subject = 'New Fund Request Created';
//         text = `A new fund request has been created:\n\n${JSON.stringify(notification.payload, null, 2)}`;
//         html = `<p>A new fund request has been created:</p><pre>${JSON.stringify(notification.payload, null, 2)}</pre>`;
//         break;

//       case NotificationType.FUND_REQUEST_APPROVED:
//         subject = 'Your Fund Request Approved';
//         text = `Your fund request has been approved:\n\n${JSON.stringify(notification.payload, null, 2)}`;
//         html = `<p>Your fund request has been approved:</p><pre>${JSON.stringify(notification.payload, null, 2)}</pre>`;
//         break;

//       case NotificationType.FUND_REQUEST_REJECTED:
//         subject = 'Your Fund Request Rejected';
//         text = `Your fund request was rejected:\n\n${JSON.stringify(notification.payload, null, 2)}`;
//         html = `<p>Your fund request was rejected:</p><pre>${JSON.stringify(notification.payload, null, 2)}</pre>`;
//         break;

//       case NotificationType.CONTRACT_AMENDED:
//         subject = 'PO Line Contract Amended';
//         text = `A contract amendment occurred:\n\n${JSON.stringify(notification.payload, null, 2)}`;
//         html = `<p>A contract amendment occurred:</p><pre>${JSON.stringify(notification.payload, null, 2)}</pre>`;
//         break;

//       case NotificationType.PO_AGING_WARNING:
//         if (!notification.payload || typeof notification.payload !== 'object' || Array.isArray(notification.payload)) {
//           logger.warn(`PO Aging notification ${notification.id} has invalid payload`);
//           break;
//         }

//         const poPayload = notification.payload as {
//           poNumber: string;
//           poLineNumber: string;
//           agingFlag: string;
//           daysOpen: number;
//           allowedOpenDays: number;
//         };

//         subject = `PO Aging Alert: ${poPayload.poNumber}`;
//         text =
//           `PO Line ${poPayload.poLineNumber} has reached an aging status of ${poPayload.agingFlag}.\n` +
//           `Days Open: ${poPayload.daysOpen}\nAllowed Open Days: ${poPayload.allowedOpenDays}`;
//         html =
//           `<p>PO Line <strong>${poPayload.poLineNumber}</strong> has reached an aging status of <strong>${poPayload.agingFlag}</strong>.</p>` +
//           `<p>Days Open: ${poPayload.daysOpen}<br>Allowed Open Days: ${poPayload.allowedOpenDays}</p>`;
//         break;

//       case NotificationType.ACCOUNT_CREATED:
//         if (
//           !notification.payload ||
//           typeof notification.payload !== 'object' ||
//           !('tempPassword' in notification.payload)
//         ) {
//           logger.warn(`ACCOUNT_CREATED notification ${notification.id} missing tempPassword`);
//           break;
//         }

//         subject = 'Your Account Has Been Created';
//         const tempPassword = (notification.payload as any).tempPassword;
//         text = `Welcome!\nYour temporary password is: ${tempPassword}\nPlease login to reset your password.`;
//         html = `<p>Welcome!</p><p>Your temporary password is: <strong>${tempPassword}</strong></p><p>Please login to reset your password.</p>`;
//         break;

//       default:
//         logger.warn(`Unknown notification type: ${notification.type}`);
//         break;
//     }

//     return { subject, text, html };
//   }
// }

// src/notifications/notifications.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, Prisma } from '@prisma/client';
import nodemailer, { Transporter } from 'nodemailer';
import { logger } from 'src/common/logger/logger';
import { EmailTemplates } from './templates/email-templates';

@Processor('notifications')
export class NotificationsProcessor {
  private transporter: Transporter;

  constructor(private prisma: PrismaService) {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      pool: true,
      maxConnections: 5,
    });
  }

  @Process('send-notification')
  async handleNotification(job: Job<{ notificationId: string }>) {
    const { notificationId } = job.data;

    // let notificationData: any;
    // let recipientEmail: string;

    // 1. STRATEGY: Database-Backed (The new enterprise way for Fund Requests)
    //  Fetch the notification and user email
    // 1. Fetch the notification and user email
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: { user: true },
    });

    if (!notification || !notification.user?.email) {
      logger.warn(`Job ${job.id} skipped: Notification not found or no email.`);
      return;
    }

    // 3. Resolve the template from our Registry
    const templateBuilder = EmailTemplates[notification.type];
    if (!templateBuilder) {
      logger.error(`No email template defined for type: ${notification.type}`);
      return;
    }

    // 3. Generate Content
    const { subject, html } = templateBuilder(notification.payload);

    try {
      // await this.transporter.sendMail({
      //   from: process.env.SMTP_FROM,
      //   to: notification.user.email,
      //   subject,
      //   html,
      // });

      // 5. Update Status: Email successfully left the server
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { sentAt: new Date() },
      });

      logger.info(`Email [${notification.type}] sent to ${notification.user.email}`);
    } catch (err) {
      logger.error(`Mail Error: ${err.message}`);
      throw err; // Bull will automatically retry
    }
  }
}
