import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthModule } from 'src/auth/auth.module';
import { BullModule } from '@nestjs/bullmq';
import { UserController } from './user.controller';
import { NotificationsModule } from '@/notifications/notifications.module';

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
