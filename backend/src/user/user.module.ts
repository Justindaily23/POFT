import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthModule } from 'src/auth/auth.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { BullModule } from '@nestjs/bull';
import { UserController } from './user.controller';
import { NotificationsModule } from '@/notifications/notifications.module';

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    MailerModule, // You must register the specific queue name here
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
