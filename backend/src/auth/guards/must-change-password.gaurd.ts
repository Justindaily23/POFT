import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';

@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const route = req.url;

    // Allow login and reset password without restriction
    if (route === '/auth/login' || route === '/auth/reset-password') return true;

    // Block all other routes if mustChangePassword is true
    return !req.user?.mustChangePassword;
  }
}
