import { Body, Controller, Get, Headers, Ip, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth-guard';
import { Response } from 'express';
import { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
    @Body('deviceId') deviceId?: string,
  ) {
    // Map the user object and ensure mustChangePassword is a strict boolean
    const authUser = {
      ...req.user,
      id: req.user.sub,
      mustChangePassword: req.user.mustChangePassword ?? false, // Fixes the undefined error
    };

    return this.authService.login(authUser, res, userAgent, ip, deviceId);
  }

  @Post('logout')
  logout(@Req() req: RequestWithUser, @Res() res: Response) {
    const userId = req.user.sub;
    const deviceId = req.cookies?.deviceId; // Added optional chaining for safety
    return this.authService.logout(userId, deviceId, res);
  }

  @Post('logout-all')
  logoutAll(@Req() req: RequestWithUser, @Res() res: Response) {
    const userId = req.user.sub;
    return this.authService.logoutAllDevices(userId, res);
  }

  @UseGuards(JwtAuthGuard)
  @Post('reset-password')
  async resetPassword(@Req() req: RequestWithUser, @Body() dto: ResetPasswordDto) {
    const userId = req.user.sub; // Changed .id to .sub to match your JwtPayload
    return this.authService.resetPassword(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getCurrentUser(@Req() req: RequestWithUser) {
    return {
      userData: req.user,
      accessToken: req.headers.authorization?.split(' ')[1],
    };
  }
}
