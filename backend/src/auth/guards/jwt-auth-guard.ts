import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TokenExpiredError } from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<TUser = Record<string, unknown>>(
    err: unknown,
    user: TUser | false,
    info: unknown,
    // _context: ExecutionContext,
  ): TUser {
    if (info instanceof TokenExpiredError) {
      throw new UnauthorizedException({
        code: 'TOKEN_EXPIRED',
        message: 'Token expired',
      });
    }

    if (err || !user) {
      if (err instanceof Error) {
        throw err;
      }
      throw new UnauthorizedException(typeof err === 'string' ? err : undefined);
    }
    return user;
  }
}
