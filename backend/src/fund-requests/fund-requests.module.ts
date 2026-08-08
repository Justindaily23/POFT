import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { FundRequestsService } from './fund-requests.service';
import { FundRequestsController } from './fund-requests.controller';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { FundRequestRepository } from './infrastructure/fund-request.repository';
import { PoLineFinancialService } from '@/common/financial/po-line-financial.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
    }),
    NotificationsModule,
  ],
  controllers: [FundRequestsController],
  providers: [FundRequestsService, FundRequestRepository, PoLineFinancialService],
  exports: [FundRequestsService],
})
export class FundRequestsModule {} // The class body should usually be empty
