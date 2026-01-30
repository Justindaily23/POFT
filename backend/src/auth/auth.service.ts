import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { logger } from 'src/common/logger/logger';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import ms from 'ms';
import type { StringValue } from 'ms';
import { Response } from 'express';

export interface AuthenticatedUser {
  id: string;
  role: Role;
  email: string;
  mustChangePassword: boolean;
}

export interface JwtPayload {
  sub: string;
  role: Role;
  email: string;
  mustChangePassword?: Boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) return null;

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return null;

    return {
      id: user.id,
      role: user.role,
      email: user.email,
      mustChangePassword: user.mustChangePassword,
    };
  }

  async login(user: AuthenticatedUser, res: Response, userAgent: string, ip: string, deviceId?: string) {
    // Build the JWT payload
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      email: user.email,
      mustChangePassword: user.mustChangePassword,
    };

    // Sign the jwt
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') as StringValue,
    });

    // Deviced id cookie backed
    const resolvedDeviceId = deviceId || randomBytes(16).toString('hex');

    res.cookie('deviceId', resolvedDeviceId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
    });

    // Generate refresh token and hash it
    const refreshToken = randomBytes(64).toString('hex');
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);

    // Calculate expiry date
    const refreshTokenTtl = this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN') || '5d';
    const expiresAt = new Date(Date.now() + ms(refreshTokenTtl as StringValue));

    //Ensure one session per device
    await this.prisma.refreshSession.deleteMany({
      where: { userId: user.id, deviceId: resolvedDeviceId },
    });

    // Create new refresh session
    await this.prisma.refreshSession.create({
      data: {
        userId: user.id,
        deviceId: resolvedDeviceId,
        refreshToken: hashedRefreshToken,
        userAgent,
        ipAddress: ip,
        expiresAt,
      },
    });

    // Set refresh cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      expires: expiresAt,
    });

    // Return as object
    return {
      id: user.id,
      role: user.role,
      email: user.email,
      mustChangePassword: user.mustChangePassword,
      accessToken,
    };
  }

  async refresh(refreshToken: string, deviceId: string, res: Response, userAgent: string, ip: string) {
    if (!refreshToken || !deviceId) {
      logger.warn('Refresh token or device ID missing in refresh request');
      throw new UnauthorizedException();
    }

    // 1. Find session by device and ensure it hasn't expired
    const session = await this.prisma.refreshSession.findFirst({
      where: {
        deviceId,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!session) {
      logger.warn('No valid refresh session found for device ID during token refresh');
      throw new UnauthorizedException('Session expired, Please log in again.');
    }

    // 2. Compare refresh token (Security: Uses Bcrypt for hashed comparison)
    const isValid = await bcrypt.compare(refreshToken, session.refreshToken);

    if (!isValid) {
      // ENTERPRISE "NUCLEAR OPTION": Potential Token Reuse Detected
      // If the token doesn't match, it means it might have been stolen and used already.
      // We revoke ALL sessions for this user to be safe.
      await this.prisma.refreshSession.deleteMany({
        where: { userId: session.userId },
      });
      logger.error(`Potential refresh token reuse detected for user ID: ${session.userId}`);
      throw new UnauthorizedException(' Please log in again.');
    }

    // 3. Rotate refresh token (Generate brand new pair)
    const newRefreshToken = randomBytes(64).toString('hex');
    const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 12);

    // Calculate expiry date
    const refreshTokenTtl = this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN') || '5d';
    const newExpiresAt = new Date(Date.now() + ms(refreshTokenTtl as StringValue));

    // Update the existing session with new data (Rotation)
    await this.prisma.refreshSession.update({
      where: { id: session.id },
      data: {
        refreshToken: hashedNewRefreshToken,
        expiresAt: newExpiresAt,
        userAgent,
        ipAddress: ip,
      },
    });

    // 4. Generate new access token
    const payload: JwtPayload = {
      sub: session.user.id,
      role: session.user.role,
      email: session.user.email,
      mustChangePassword: session.user.mustChangePassword,
    };

    const accessToken = this.jwtService.sign(payload, {
      // Cast to StringValue to resolve the Overload error
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') as StringValue,
    });

    // 5. Update cookie with Strict Enterprise Security
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: true, // Always true for 2026 production
      sameSite: 'strict', // Upgraded for Financial Workspace
      path: '/api/v1/auth/refresh', // Scoped path: cookie only sent for refresh calls
      expires: newExpiresAt,
    });

    return { accessToken };
  }

  // Log out one single/current device
  async logout(userId: string, deviceId: string, res: Response) {
    await this.prisma.refreshSession.deleteMany({
      where: { userId, deviceId },
    });

    res.clearCookie('refreshToken', { httpOnly: true, secure: true });
    return { message: 'Logged out successfully' };
  }

  // Logout all devices
  async logoutAllDevices(userId: string, res: Response) {
    await this.prisma.refreshSession.deleteMany({
      where: { userId },
    });

    res.clearCookie('refreshToken', { httpOnly: true, secure: true });
    return { message: 'Logged out from all devices' };
  }

  async resetPassword(userId: string, dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      logger.warn(`User with Id: ${userId} does not exist for password reset`);
      throw new NotFoundException('Sorry! You are not recognized');
    }

    // Optional: enforce forced-reset-only access
    if (!user.mustChangePassword) {
      throw new ForbiddenException('Password reset not required');
    }

    // Compare new password with the inital one generated
    const isSamePassword = await bcrypt.compare(dto.newPassword, user.password);
    if (isSamePassword) {
      logger.info(`UserID ${userId} attemtpted same password reset`);
      throw new BadRequestException('New password cannot be same as the temporary');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.$transaction([
      //  Update password + unlock account
      this.prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          mustChangePassword: false,
        },
      }),

      //  Invalidate all refresh sessions
      this.prisma.refreshSession.deleteMany({
        where: { userId },
      }),
    ]);

    return {
      message: 'Password reset successful. Please login again.',
    };
  }
}
