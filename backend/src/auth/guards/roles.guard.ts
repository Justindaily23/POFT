import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthRole } from '@prisma/client'; // Prisma enum
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<AuthRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    // Get the current user from request
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.role) return false; // <-- user.role is the enum directly

    // Check if user's role is included in allowed roles
    return requiredRoles.includes(user.role);
  }
}
