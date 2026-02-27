import { Module } from '@nestjs/common';
import { PoAnalyticsService } from './po-analytics.service';
import { PoAnalyticsController } from './po-aging-days.controller';
import { PoAgingEvaluatorService } from './po-aging-evaluator.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PmAnalyticsController } from './pm-analytics.controller';
import { NotificationsService } from 'src/notifications/notifications.service';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,

    // 2. IMPORTANT: Register the specific queue name that NotificationsService needs
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],

  providers: [PoAnalyticsService, PoAgingEvaluatorService, NotificationsService],
  controllers: [PoAnalyticsController, PmAnalyticsController],
})
export class PoAgingDaysModule {}
