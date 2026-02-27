// src/common/guards/maintenance.guard.ts
import { Injectable, CanActivate, ExecutionContext, ServiceUnavailableException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/decorator';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Bypass check for Test Environment
    if (this.configService.get('NODE_ENV') === 'test') return true;

    // 2. Check if the route is marked as @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 3. If it's Public, let it through regardless of maintenance
    if (isPublic) return true;

    // 4. Check the Maintenance Mode Toggle via ConfigService
    const isMaintenance = this.configService.get<string>('MAINTENANCE_MODE') === 'true';

    if (isMaintenance) {
      throw new ServiceUnavailableException({
        statusCode: 503,
        message: 'System is under maintenance. POFT is coming soon!',
        error: 'Service Unavailable',
      });
    }

    return true;
  }
}
