import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { FundRequestsService } from './fund-requests.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { FundRequestsController } from './fund-requests.controller';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
    }),
    NotificationsModule,
  ],
  controllers: [FundRequestsController],
  providers: [FundRequestsService, NotificationsService],
  exports: [FundRequestsService],
})
export class FundRequestsModule {} // The class body should usually be empty
