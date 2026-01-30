// src/notifications/notifications.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import nodemailer from 'nodemailer';

@Processor('notifications')
export class NotificationsProcessor {
  constructor(private prisma: PrismaService) {}

  @Process()
  async handleNotification(job: Job) {
    const { notificationId } = job.data;

    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: { fundRequest: true },
    });

    if (!notification) return;

    const user = await this.prisma.user.findUnique({ where: { id: notification.userId } });
    if (!user?.email) return;

    // Compose email
    let subject = '';
    let text = '';
    switch (notification.type) {
      case NotificationType.FUND_REQUEST_CREATED:
        subject = 'New Fund Request Created';
        text = `A new fund request has been created:\n\n${JSON.stringify(notification.payload, null, 2)}`;
        break;
      case NotificationType.FUND_REQUEST_APPROVED:
        subject = 'Your Fund Request Approved';
        text = `Your fund request has been approved:\n\n${JSON.stringify(notification.payload, null, 2)}`;
        break;
      case NotificationType.FUND_REQUEST_REJECTED:
        subject = 'Your Fund Request Rejected';
        text = `Your fund request was rejected:\n\n${JSON.stringify(notification.payload, null, 2)}`;
        break;
      case NotificationType.CONTRACT_AMENDED:
        subject = 'PO Line Contract Amended';
        text = `A contract amendment occurred:\n\n${JSON.stringify(notification.payload, null, 2)}`;
        break;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@stecam.com',
      to: user.email,
      subject,
      text,
    });

    await this.prisma.notification.update({
      where: { id: notification.id },
      data: { sentAt: new Date() },
    });
  }
}
