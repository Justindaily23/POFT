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
      // redis: {
      //   host: process.env.REDIS_HOST || 'localhost',
      //   port: Number(process.env.REDIS_PORT) || 6379,
      // },
    }),
  ],
  providers: [NotificationsService, NotificationsProcessor],
  exports: [NotificationsService],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
