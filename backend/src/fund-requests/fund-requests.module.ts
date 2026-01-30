import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { FundRequestsService } from './fund-requests.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  providers: [FundRequestsService],
  exports: [FundRequestsService],
})
export class FundRequestsModule {} // The class body should usually be empty
