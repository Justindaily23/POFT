import { Module } from '@nestjs/common';
import { PoAgingDaysService } from './po-aging-days.service';
import { PoAgingDaysController } from './po-aging-days.controller';
import { PoAgingEvaluatorService } from './po-agin-evaluator.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],

  providers: [PoAgingDaysService, PoAgingEvaluatorService],
  controllers: [PoAgingDaysController],
})
export class PoAgingDaysModule {}
