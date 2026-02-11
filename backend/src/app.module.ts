import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CleanupService } from './cleanup/cleanup.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { ContractAmendmentsService } from './contract-amendments/contract-amendments.service';
import { BullModule } from '@nestjs/bull';
import { FundRequestsModule } from './fund-requests/fund-requests.module';
import { PoWorkspaceModule } from './po-workspace/po-workspace.module';
import { PoAgingDaysModule } from './po-aging-days/po-aging-days.module';
import { MetadataModule } from './metadata/metadata.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes config available globally
      load: [configuration], // Load configuration
      validationSchema, // Apply validation schema on start up
      validationOptions: {
        abortEarly: false, // Report all validation errors and not just the first one
      },
      envFilePath: ['.env', `.env.${process.env.NODE_ENV || 'development'}`], // Load environment variables from .env file based on NODE_ENV
      cache: true, // Cache the configuration to improve performance
    }),
    // Configure MailerModule here
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get('MAIL_HOST'),
          port: config.get('MAIL_PORT'),
          auth: {
            user: config.get('MAIL_USER'),
            pass: config.get('MAIL_PASS'),
          },
        },
        defaults: {
          from: '"Finance System" <noreply@fitflexnaija.ng>',
        },
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT') || 6379,
          password: config.get('REDIS_PASSWORD'),
          db: config.get<number>('REDIS_DB') || 0,
          tls: {
            rejectUnauthorized: false,
          },
          maxRetriesPerRequest: null,
        },
      }),
    }),
    BullModule.registerQueue({
      name: 'notifications',
    }),

    FundRequestsModule,
    NotificationsModule,
    AuthModule,
    UserModule,
    PurchaseOrdersModule,
    PrismaModule,
    ScheduleModule.forRoot(),
    PoWorkspaceModule,
    PoAgingDaysModule,
    MetadataModule, // enabels cron jobs
  ],
  controllers: [AppController],
  providers: [AppService, CleanupService, ContractAmendmentsService],
})
export class AppModule {}
