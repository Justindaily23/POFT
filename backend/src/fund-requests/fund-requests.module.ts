import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { FundRequestsService } from './fund-requests.service';
import { FundRequestsController } from './fund-requests.controller';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { FundRequestRepository } from './infrastructure/fund-request.repository';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
    }),
    NotificationsModule,
  ],
  controllers: [FundRequestsController],
  providers: [FundRequestsService, FundRequestRepository],
  exports: [FundRequestsService],
})
export class FundRequestsModule {} // The class body should usually be empty
