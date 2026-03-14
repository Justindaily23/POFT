// src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { NotificationsService } from './notifications.service';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
      // ✅ RATE LIMITER: Prevents Mailtrap/Production SMTP from crashing
      limiter: {
        max: 5, // Process only 2 jobs...
        duration: 5000, // ...every 5 seconds (Stay safe within Mailtrap's 5/10s limit)
      },
      // ✅ RETRY STRATEGY: Crucial for Production reliability
      defaultJobOptions: {
        attempts: 5, // Retry 5 times if the mail server is temporarily down
        backoff: {
          type: 'exponential',
          delay: 5000, // Wait 2s, 4s, 8s, 16s... before retrying
        },
        removeOnComplete: true, // Clean up successful jobs to save Redis memory
      },
    }),
  ],
  providers: [NotificationsService, NotificationsProcessor],
  exports: [NotificationsService],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
