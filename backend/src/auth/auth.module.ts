import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth-guard';
import type { StringValue } from 'ms';
import { NotificationsModule } from '@/notifications/notifications.module';
import { TokenService } from './token/token.service';
import { SessionService } from './session/session.service';
import { AuthCacheService } from './cache/auth-cache.service';

@Module({
  imports: [
    PassportModule,
    NotificationsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'supersecretkey',
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') || '15m') as StringValue,
        },
      }),
    }),
  ],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    JwtAuthGuard,
    TokenService,
    SessionService,
    AuthCacheService, // still injects 'REDIS_CLIENT' via @Inject — now supplied by the global RedisModule instead
  ],
  exports: [AuthService, JwtAuthGuard],
  controllers: [AuthController],
})
export class AuthModule {}
