import { Module } from '@nestjs/common';
import { PoImportService } from './import/po-import.service';
import { PoImportController } from './import/po-import.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrdersController } from './purchase-orders.controller';

@Module({
  controllers: [PoImportController, PurchaseOrdersController],
  providers: [PoImportService, PurchaseOrdersService],
  exports: [PoImportService],
})
export class PurchaseOrdersModule {}
