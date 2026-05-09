import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { JwtSignUser } from '../types/jwtSignUser';
import ms, { type StringValue } from 'ms';

@Injectable()
export class TokenService {
  constructor(
    private jwt: JwtService,
    private configService: ConfigService,
  ) {}

  hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  generateRefreshToken() {
    return randomBytes(64).toString('hex');
  }

  signAccessToken(user: JwtSignUser) {
    return this.jwt.sign({
      sub: user.id,
      role: user.role,
      email: user.email,
      tokenVersion: user.tokenVersion,
      mustChangePassword: user.mustChangePassword ?? false,
    });
  }

  getRefreshTokenExpiry(defaultValue: StringValue): StringValue {
    return (this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN') ?? defaultValue) as StringValue;
  }

  getAccessTokenExpiry(): StringValue {
    return (this.configService.get<string>('JWT_EXPIRES_IN') ?? '15m') as StringValue;
  }
}
