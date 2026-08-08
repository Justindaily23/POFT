import { Module } from '@nestjs/common';
import { ContractAmendmentsService } from './contract-amendments.service';
import { ContractAmendmentsController } from './contract-amendments.controller';
import { NotificationsModule } from '../notifications/notifications.module'; // Import your notifications module
import { PoLineFinancialService } from '@/common/financial/po-line-financial.service';

@Module({
  imports: [
    NotificationsModule, // Required so the Service can call this.notificationsService.notify()
  ],
  controllers: [ContractAmendmentsController],
  providers: [ContractAmendmentsService, PoLineFinancialService],
  exports: [ContractAmendmentsService], // Export if other modules need to amend contracts
})
export class ContractAmendmentsModule {}
