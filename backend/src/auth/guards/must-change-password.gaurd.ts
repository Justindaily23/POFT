import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';
import { IS_PUBLIC_KEY } from 'src/common/decorators/decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { SKIP_PASSWORD_CHECK_KEY } from '../decorators/skip-password-check.decorator';
import { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';

@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<
        RequestWithUser & { path?: string; originalUrl?: string; headers?: Record<string, string | undefined> }
      >();

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const skipPasswordCheck = this.reflector.getAllAndOverride<boolean>(SKIP_PASSWORD_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipPasswordCheck) return true;

    const existingUserMustChangePassword = req.user?.mustChangePassword === true;
    if (existingUserMustChangePassword) {
      throw new ForbiddenException('Password change required before accessing this resource.');
    }

    const authHeader = req.headers?.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;

    if (!token) return true;

    try {
      const payload = await this.jwtService.verifyAsync<{ sub?: string; mustChangePassword?: boolean }>(token);
      if (!payload.sub) return true;

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { mustChangePassword: true, tokenVersion: true, isActive: true },
      });

      if (!user || !user.isActive) return true;

      if (user.mustChangePassword) {
        throw new ForbiddenException('Password change required before accessing this resource.');
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      // 🔧 FIX: don't mask expired/invalid tokens as "must change password"
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException({ code: 'TOKEN_EXPIRED', message: 'Session expired' });
      }
      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Invalid session');
      }

      throw new ForbiddenException('Password change required before accessing this resource.');
    }

    return true;
  }
}
