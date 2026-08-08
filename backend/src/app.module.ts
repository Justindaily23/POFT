import { Module } from '@nestjs/common';
import { MaintenanceGuard } from './common/guards/maintenance.guard';
import { APP_FILTER, APP_GUARD, HttpAdapterHost } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { AuthModule } from './auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { MustChangePasswordGuard } from './auth/guards/must-change-password.gaurd';
import { UserModule } from './user/user.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CleanupService } from './cleanup/cleanup.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { BullModule } from '@nestjs/bullmq';
import { FundRequestsModule } from './fund-requests/fund-requests.module';
import { PoWorkspaceModule } from './po-workspace/po-workspace.module';
import { PoAgingDaysModule } from './po-analytics/po-aging-days.module';
import { MetadataModule } from './metadata/metadata.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { ContractAmendmentsModule } from './contract-amendments/contract-amendments.module';
import { PrismaClientExceptionFilter } from './common/filters/prisma-exception.filter';
import type { StringValue } from 'ms';
import { RedisModule } from './redis/redis.module';
import { getRedisConnectionOptions } from './redis/redis-config.util';

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
     RedisModule,

    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'supersecret',
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') || '15m') as StringValue,
        },
      }),
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
      useFactory: (config: ConfigService) => {
        const { host, port, password, tls } = getRedisConnectionOptions(config);
        return {
          connection: {
            host,
            port,
            password,
            tls,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          },
        };
      },
    }),


    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        if (config.get('NODE_ENV') === 'test') {
          return { ttl: 0 };
        }
        const { host, port, password, tls } = getRedisConnectionOptions(config);
        return {
          store: await redisStore({
            socket: { host, port, tls: !!tls },
            password,
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
    {
      provide: APP_GUARD,
      useClass: MustChangePasswordGuard,
    },
    {
      provide: APP_FILTER,
      useFactory: ({ httpAdapter }: HttpAdapterHost) => {
        return new PrismaClientExceptionFilter(httpAdapter);
      },
      inject: [HttpAdapterHost],
    },
  ],
})
export class AppModule {}


