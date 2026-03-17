import { Module } from '@nestjs/common';
import { PoImportService } from './import/po-import.service';
import { PoImportController } from './import/po-import.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { BullModule } from '@nestjs/bull';
import { PoImportProcessor } from './import/po-import.processor';

@Module({
  imports: [
    // ✅ Add this here to make the 'po-imports' queue available to your service
    BullModule.registerQueue({
      name: 'po-imports',
    }),
  ],
  controllers: [PoImportController, PurchaseOrdersController],
  providers: [PoImportService, PurchaseOrdersService, PoImportProcessor],
  exports: [PoImportService],
})
export class PurchaseOrdersModule {}
