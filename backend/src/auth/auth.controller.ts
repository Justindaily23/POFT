import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedUser, AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth-guard';
import { Response } from 'express';
import { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';
import { logger } from 'src/common/logger/logger';
import { RolesGuard } from './guards/roles.guard';
import { AuthRole } from '@prisma/client';
import { Roles } from './decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
    @Headers('user-agent') userAgent = 'unknown', // Default value to satisfy string requirement
    @Ip() ip: string,
    @Body('deviceId') deviceId?: string,
  ) {
    const userId = req.user.id;

    if (!userId) {
      logger.error('FAILED LOGIN: User object exists but ID is missing', req.user);
      throw new UnauthorizedException('Authentication failed');
    }

    const authUser: AuthenticatedUser = {
      id: userId,
      role: req.user.role,
      email: req.user.email,
      name: req.user.name,
      mustChangePassword: req.user.mustChangePassword ?? false,
    };

    return this.authService.login(authUser, res, userAgent, ip, deviceId);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.ADMIN, AuthRole.SUPER_ADMIN, AuthRole.USER)
  async logout(@Req() req: RequestWithUser, @Res() res: Response) {
    const userId = req.user.id;

    // FIX: Cast cookies to Record<string, string | undefined> to avoid 'any'
    const cookies = req.cookies as Record<string, string | undefined>;
    const deviceId = cookies?.deviceId ?? 'unknown_device';

    const result = await this.authService.logout(userId, deviceId, res);
    return res.status(200).json(result);
  }

  @Post('refresh')
  async refresh(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
    @Headers('user-agent') userAgent = 'unknown',
    @Ip() ip: string,
  ) {
    const cookies = req.cookies as Record<string, string | undefined>;

    // Use nullish coalescing (??) to ensure they are at least empty strings
    // Or throw an error if they are missing
    const refreshToken = cookies?.refreshToken;
    const deviceId = cookies?.deviceId;

    if (!refreshToken || !deviceId) {
      throw new UnauthorizedException('Missing session identifiers');
    }

    // Now TypeScript is happy because we verified they are not undefined
    return this.authService.refresh(refreshToken, deviceId, res, userAgent, ip);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.ADMIN, AuthRole.SUPER_ADMIN, AuthRole.USER)
  async logoutAll(@Req() req: RequestWithUser, @Res() res: Response) {
    const userId = req.user.id;
    const result = await this.authService.logoutAllDevices(userId, res);
    return res.status(200).json(result);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.ADMIN, AuthRole.SUPER_ADMIN, AuthRole.USER)
  @Post('reset-password')
  async resetPassword(@Req() req: RequestWithUser, @Body() dto: ResetPasswordDto) {
    const userId = req.user.id;
    return this.authService.resetPassword(userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.ADMIN, AuthRole.SUPER_ADMIN, AuthRole.USER)
  @Get('me')
  getCurrentUser(@Req() req: RequestWithUser) {
    const authHeader = req.headers.authorization ?? '';
    return {
      userData: req.user,
      accessToken: authHeader.split(' ')[1] || null,
    };
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }
    // This method needs to be created in your AuthService
    return this.authService.forgotPasswordInitiate(email);
  }

  @Post('reset-password-recovery')
  async resetRecovery(@Body('id') tokenId: string, @Body('token') tokenSecret: string, @Body() dto: ResetPasswordDto) {
    if (!tokenId || !tokenSecret) {
      throw new BadRequestException('Invalid request parameters.');
    }
    return this.authService.resetForgottenPassword(tokenId, tokenSecret, dto);
  }
}
