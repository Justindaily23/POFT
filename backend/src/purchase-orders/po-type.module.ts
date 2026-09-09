import { Module } from '@nestjs/common';
import { PoTypeController } from './po-type.controller';
import { PoTypeService } from './po-type.service';

@Module({
  controllers: [PoTypeController],
  providers: [PoTypeService],
  exports: [PoTypeService],
})
export class PoTypeModule {}