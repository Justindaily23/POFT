import { Body, Controller, Header, Headers, Ip, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth-guard';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login endpoint
   * Uses LocalAuthGuard to validate email/password
   */
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Req() req,
    @Res({ passthrough: true }) res: Response,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
    @Body('deviceId') deviceId?: string,
  ) {
    // req.user is populated by the local strategy
    return this.authService.login(req.user, res, userAgent, ip, deviceId);
  }

  @Post('logout')
  logout(@Req() req, @Res() res) {
    const userId = req.user.sub;
    const deviceId = req.cookies.deviceId;
    return this.authService.logout(userId, deviceId, res);
  }

  @Post('logout-all')
  logoutAll(@Req() req, @Res() res) {
    const userId = req.user.sub;
    return this.authService.logoutAllDevices(userId, res);
  }

  @UseGuards(JwtAuthGuard)
  @Post('reset-password')
  async resetPassword(@Req() req, @Body() dto: ResetPasswordDto) {
    const userId = req.user.id;
    return this.authService.resetPassword(userId, dto);
  }
}
