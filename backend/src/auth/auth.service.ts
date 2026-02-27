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
import { AuthRole, NotificationType } from '@prisma/client';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { logger } from 'src/common/logger/logger';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import ms from 'ms';
import type { StringValue } from 'ms';
import { Response } from 'express';
import { NotificationsService } from '@/notifications/notifications.service';

export interface AuthenticatedUser {
  id: string;
  role: AuthRole;
  email: string;
  name: string;
  mustChangePassword: boolean;
}

export interface JwtPayload {
  sub: string;
  role: AuthRole;
  email: string;
  name: string;
  mustChangePassword?: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
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
      name: user.fullName,
      mustChangePassword: user.mustChangePassword,
    };
  }

  async login(user: AuthenticatedUser, res: Response, userAgent: string, ip: string, deviceId?: string) {
    // Build the JWT payload
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
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
    const refreshTokenTtl = this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN') || '24h';
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
      // 'none' is required for cross-origin (Frontend on port A, Backend on port B)
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none',
      // 'secure: true' is MANDATORY if sameSite is 'none'
      secure: process.env.NODE_ENV === 'production' ? true : true,
      expires: expiresAt,
    });

    // Return as object
    return {
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
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
      name: session.user.fullName,
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
      path: '/', // Scoped path: cookie only sent for refresh calls
      expires: newExpiresAt,
    });

    return { accessToken };
  }
  // Log out one single/current device
  async logout(userId: string, deviceId: string, res: Response) {
    await this.prisma.refreshSession.deleteMany({
      where: { userId, deviceId },
    });

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      path: '/', // Ensure this matches your login/refresh logic exactly
      sameSite: 'lax' as const, // Add this if you used it during login
    };

    res.clearCookie('refreshToken', cookieOptions);
    res.clearCookie('deviceId', { path: '/' }); // Path is usually required here too

    return { message: 'Logged out successfully' };
  }

  // Logout all devices
  async logoutAllDevices(userId: string, res: Response) {
    await this.prisma.refreshSession.deleteMany({
      where: { userId },
    });

    // FIXED: Added path here so it actually clears the cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: true,
      path: '/',
    });

    return { message: 'Logged out from all devices' };
  }

  // FOrced password reset after account creation and inital login

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
      // 1. Update password and remove the force-change flag
      this.prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          mustChangePassword: false,
        },
      }),
      // 2. IMPORTANT: Invalidate all sessions globally after password change
      this.prisma.refreshSession.deleteMany({
        where: { userId },
      }),
    ]);

    return { message: 'Password updated successfully. Please log in again.' };
  }

  // src/auth/auth.service.ts
  async forgotPasswordInitiate(email: string) {
    // 1. SECURITY: Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // 2. ENUMERATION PROTECTION: Don't reveal if email exists
    if (!user) {
      return { message: 'If an account exists with this email, a reset link has been sent.' };
    }

    // 3. GENERATE SECURE TOKEN
    const resetTokenSecret = randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(resetTokenSecret, 12);

    // 4. SET EXPIRY (e.g., 1 hour from now)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // 5. ATOMIC SAVE: Use a transaction to clear old tokens and create a new one
    const resetRecord = await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
      return tx.passwordResetToken.create({
        data: {
          userId: user.id,
          token: hashedToken,
          expiresAt,
        },
      });
    });

    // 6. DISPATCH NOTIFICATION
    // This will hit your NotificationService -> Bull Queue -> Email Processor
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?id=${resetRecord.id}&token=${resetTokenSecret}`;

    await this.notificationsService.notify(user.id, NotificationType.PASSWORD_CHANGED, {
      type: NotificationType.PASSWORD_CHANGED,
      name: user.fullName,
      resetLink: resetUrl,
    });

    return { message: 'If an account exists with this email, a reset link has been sent.' };
  }
  /**
   * SCENARIO 2B: RESET VIA TOKEN (Public Recovery Flow)
   * Optimized for high performance and maximum security.
   */
  async resetForgottenPassword(tokenId: string, tokenSecret: string, dto: ResetPasswordDto) {
    // 1. HIGH-PERFORMANCE LOOKUP
    // We use the ID to find the record instantly in the DB index
    const resetRecord = await this.prisma.passwordResetToken.findUnique({
      where: { id: tokenId },
      include: { user: true },
    });

    // 2. IMMEDIATE VALIDATION
    if (!resetRecord) {
      throw new BadRequestException('Invalid reset link.');
    }

    // 3. EXPIRY CHECK
    if (resetRecord.expiresAt < new Date()) {
      // Cleanup expired token immediately
      await this.prisma.passwordResetToken.delete({ where: { id: tokenId } });
      throw new BadRequestException('Reset link has expired. Please request a new one.');
    }

    // 4. CRYPTOGRAPHIC VERIFICATION
    // Compare the unhashed secret from the email with the hashed version in DB
    const isMatch = await bcrypt.compare(tokenSecret, resetRecord.token);
    if (!isMatch) {
      logger.warn(`SECURITY ALERT: Failed reset attempt for User ID ${resetRecord.userId}`);
      throw new BadRequestException('Invalid reset link.');
    }

    // 5. ATOMIC SECURITY UPDATE (Transaction)
    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    return this.prisma.$transaction(async (tx) => {
      // Update user password and clear the 'mustChangePassword' flag
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: {
          password: hashedPassword,
          mustChangePassword: false,
          // Recommended: Update a 'securityStamp' or 'lastPasswordReset' if you have it
        },
      });

      // CRITICAL: Delete ALL reset tokens for this user (One-time use)
      await tx.passwordResetToken.deleteMany({
        where: { userId: resetRecord.userId },
      });

      // CRITICAL: Invalidate ALL active login sessions (Global Logout)
      await tx.refreshSession.deleteMany({
        where: { userId: resetRecord.userId },
      });

      logger.info(`SUCCESS: Password recovered for User ${resetRecord.user.email}`);
      return { message: 'Password reset successful. You can now log in.' };
    });
  }
}
