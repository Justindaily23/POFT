import { Module } from '@nestjs/common';
import { MaintenanceGuard } from './common/guards/maintenance.guard';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CleanupService } from './cleanup/cleanup.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { BullModule } from '@nestjs/bull';
import { FundRequestsModule } from './fund-requests/fund-requests.module';
import { PoWorkspaceModule } from './po-workspace/po-workspace.module';
import { PoAgingDaysModule } from './po-analytics/po-aging-days.module';
import { MetadataModule } from './metadata/metadata.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { ContractAmendmentsModule } from './contract-amendments/contract-amendments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: { abortEarly: false },
      envFilePath: ['.env', `.env.${process.env.NODE_ENV || 'development'}`],
      cache: true,
    }),

    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get('SMTP_HOST'),
          port: config.get('SMTP_PORT'),
          auth: {
            user: config.get('SMTP_USER'),
            pass: config.get('SMTP_PASS'),
          },
        },
        pool: true,
        maxConnections: 5,
        defaults: {
          from: config.get('SMTP_FROM'),
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
          tls: config.get('REDIS_USE_TLS') === 'true' ? { rejectUnauthorized: false } : undefined,
          connectTimeout: 30_000,
          disconnectTimeout: 2000,
          keepAlive: 30_000,
          maxRetriesPerRequest: null,
          retryStrategy: (times: number) => Math.min(times * 100, 3000),
        },
        settings: {
          stalledInterval: 30_000,
          guardInterval: 5000,
        },
      }),
    }),

    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        // 🔒 E2E / TEST SAFETY GUARD
        if (config.get('NODE_ENV') === 'test') {
          return { ttl: 0 };
        }
        const host = config.get<string>('REDIS_HOST') || 'localhost';
        const port = config.get<number>('REDIS_PORT') || 6379;
        const password = config.get<string>('REDIS_PASSWORD');
        const useTls = config.get('REDIS_USE_TLS') === 'true'; // for Render / Upstash

        const socket = {
          host,
          port,
          tls: useTls ? true : false, // ⚡ boolean only
          reconnectStrategy: (retries: number) => Math.min(retries * 50, 500),
          connectTimeout: 10000,
        };

        return {
          store: await redisStore({
            socket,
            password: password || undefined,
            ttl: 3600,
          }),
        };
      },
    }),
    ContractAmendmentsModule,
    FundRequestsModule,
    NotificationsModule,
    AuthModule,
    UserModule,
    PurchaseOrdersModule,
    PrismaModule,
    ScheduleModule.forRoot(),
    PoWorkspaceModule,
    PoAgingDaysModule,
    MetadataModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    CleanupService,
    {
      provide: APP_GUARD,
      useClass: MaintenanceGuard,
    },
  ],
})
export class AppModule {}
