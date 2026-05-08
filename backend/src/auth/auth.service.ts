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
import { AuthRole, NotificationType, Prisma, User } from '@prisma/client';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { logger } from 'src/common/logger/logger';
import { createHash, randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import ms, { type StringValue } from 'ms';
import { Response } from 'express';
import { NotificationsService } from '@/notifications/notifications.service';
import { JwtSignUser } from './types/jwtSignUser';
import { TokenService } from './token/token.service';
import { SessionService } from './session/session.service';

export interface AuthenticatedUser {
  id: string;
  role: AuthRole;
  email: string;
  name: string;
  tokenVersion: number;
  mustChangePassword: boolean;
}

export interface JwtPayload {
  sub: string;
  role: AuthRole;
  email: string;
  name: string;
  tokenVersion: number;
  mustChangePassword?: boolean;
}

@Injectable()
export class AuthService {
  // private hashToken(token: string): string {
  //   return createHash('sha256').update(token).digest('hex');
  // }
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
  ) {}

  /* ─────────────────────────────────────────────────────────────
     INTERNAL SAFE RESOLVERS (NO BEHAVIOR CHANGE)
     ───────────────────────────────────────────────────────────── */
  private async bumpTokenVersion(userId: string, tx: Prisma.TransactionClient) {
    await tx.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
  }

  /* ───────────────────────────────────────────────────────────── */

  async validateUser(email: string, password: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return null;

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return null;

    return {
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.fullName,
      tokenVersion: user.tokenVersion,
      mustChangePassword: user.mustChangePassword,
    };
  }

  async login(user: AuthenticatedUser, res: Response, userAgent: string, ip: string, deviceId?: string) {
    const freshUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        role: true,
        email: true,
        tokenVersion: true,
        mustChangePassword: true,
      },
    });

    if (!freshUser) {
      throw new UnauthorizedException('Account not available');
    }
    const accessToken = this.tokenService.signAccessToken(freshUser);

    const resolvedDeviceId = deviceId || randomBytes(16).toString('hex');

    res.cookie('deviceId', resolvedDeviceId, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });

    const refreshToken = randomBytes(64).toString('hex');
    const hashedRefreshToken = this.tokenService.hashToken(refreshToken);

    const refreshTtl = this.tokenService.getRefreshTokenExpiry('8hr');
    const expiresAt = new Date(Date.now() + ms(refreshTtl));

    // This handles 1,000 concurrent users without race condition crashes.
    await this.sessionService.upsertSession({
      where: { userId_deviceId: { userId: user.id, deviceId: resolvedDeviceId } },
      update: {
        refreshToken: hashedRefreshToken,
        userAgent,
        ipAddress: ip,
        expiresAt,
        revokedAt: null, // Clear revokedAt if it was previously set
      },
      create: {
        userId: user.id,
        deviceId: resolvedDeviceId,
        refreshToken: hashedRefreshToken,
        userAgent,
        ipAddress: ip,
        expiresAt,
      },
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      path: '/',
      expires: expiresAt,
    });

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
    // 1. Validate inputs early
    if (!refreshToken || !deviceId) {
      logger.warn(`Refresh attempt blocked: Missing ${!refreshToken ? 'token' : 'deviceId'}`);
      throw new UnauthorizedException('Please login again');
    }

    const incomingHash = this.tokenService.hashToken(refreshToken);

    // 2. Strict Session Lookup
    // Optimization: Find the session specifically for this device AND ensure it's not expired
    const session = await this.sessionService.findValidSession(deviceId);

    if (!session) throw new UnauthorizedException();

    // Fetch fresh user authoritatively here to ensure we have the latest tokenVersion and isActive status
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        role: true,
        email: true,
        fullName: true,
        tokenVersion: true,
        mustChangePassword: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }

    // TOKEN VERSION CHECK (Immediate Revocation)
    if (session.user.tokenVersion !== user.tokenVersion) {
      await this.sessionService.deleteSession(user.id, deviceId);

      logger.warn(`Token version mismatch detected for user ${user.id}`);

      throw new UnauthorizedException('Session invalid. Please login again.');
    }

    // FAST: SHA-256 comparison
    if (incomingHash !== session.refreshToken) {
      // Potential theft: Clear all sessions for this device preventing replay attacks.. hehehehhe we keep learning
      // Replay attack is when attacker steals the refresh token and tries to use it multiple times. By deleting the session immediately, we prevent any further use of that stolen token.
      await this.sessionService.deleteSession(session.userId, deviceId);
      logger.error(`Security breach! Token reuse on device: ${deviceId}`);

      throw new UnauthorizedException('Security breach detected');
    }

    //  Generate New Credentials
    const newRefreshToken = randomBytes(64).toString('hex');
    const hashedNewRefreshToken = this.tokenService.hashToken(newRefreshToken);
    const refreshTtl = this.tokenService.getRefreshTokenExpiry('5d');
    const newExpiresAt = new Date(Date.now() + ms(refreshTtl));

    //  Session Update - We update the same session record instead of creating a new one to prevent database bloat and maintain a clean session history.
    await this.prisma.refreshSession.update({
      where: { id: session.id },
      data: {
        refreshToken: hashedNewRefreshToken,
        expiresAt: newExpiresAt,
        userAgent,
        ipAddress: ip,
      },
    });

    // We sign a new access token with the latest user information, including the tokenVersion.
    // This ensures that if the user's tokenVersion has been incremented (e.g., due to a password change or logout), the old access token will be invalidated immediately.
    const accessToken = this.tokenService.signAccessToken(user);

    //  CRITICAL: Cross-Domain Cookie Settings
    // 'none' and 'secure' are MANDATORY for Vercel <-> Render communication
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: true, // Must be true for sameSite: 'none'
      sameSite: 'none',
      path: '/', // Ensures cookie is available for all API routes
      expires: newExpiresAt,
    });

    return { accessToken };
  }

  // Log out one single/current device
  async logout(userId: string, deviceId: string, res: Response) {
    await this.prisma.$transaction(async (tx) => {
      await tx.refreshSession.deleteMany({
        where: { userId, deviceId },
      });

      await this.bumpTokenVersion(userId, tx);
    });

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'none' as const, // Must match your Login/Refresh settings
    };

    // Clear both cookies
    res.clearCookie('refreshToken', cookieOptions);
    res.clearCookie('deviceId', { ...cookieOptions, httpOnly: true });

    return { message: 'Logged out successfully' };
  }

  // Logout all devices (Global Logout)
  async logoutAllDevices(userId: string, res: Response) {
    await this.prisma.$transaction(async (tx) => {
      await tx.refreshSession.deleteMany({ where: { userId } });
      await this.bumpTokenVersion(userId, tx);
    });

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'none' as const,
    };

    res.clearCookie('refreshToken', cookieOptions);
    res.clearCookie('deviceId', { ...cookieOptions, httpOnly: true });

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
    await this.prisma.$transaction(async (tx) => {
      // 1. Update password & increment tokenVersion
      await tx.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          mustChangePassword: false,
          tokenVersion: { increment: 1 }, // This kills all existing Access Tokens
        },
      });
      // 2. Invalidate all Refresh Sessions (passing tx)
      await this.sessionService.revokeSessions(userId, tx);

      // 3. Kill pending reset tokens
      await tx.passwordResetToken.deleteMany({
        where: { userId },
      });
    });

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
    const hashedToken = this.tokenService.hashToken(resetTokenSecret);

    // 4. SET EXPIRY (e.g., 1 hour from now)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // 5. ATOMIC SAVE: Use a transaction to clear old tokens and create a new one
    const resetRecord = await this.prisma.passwordResetToken.upsert({
      where: { userId: user.id }, // Works because of your new @@unique([userId])
      update: {
        token: hashedToken,
        expiresAt,
      },
      create: {
        userId: user.id,
        token: hashedToken,
        expiresAt,
      },
    });
    // 6. DISPATCH NOTIFICATION
    // This will hit your NotificationService -> Bull Queue -> Email Processor
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?id=${resetRecord.id}&token=${resetTokenSecret}`;

    await this.notificationsService.notify(user.id, NotificationType.PASSWORD_RESET, {
      type: NotificationType.PASSWORD_RESET,
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
    // 1. FAST LOOKUP: Uses Primary Key index
    const resetRecord = await this.prisma.passwordResetToken.findUnique({
      where: { id: tokenId },
      include: { user: true },
    });

    // 2. VALIDATION
    if (!resetRecord) {
      throw new BadRequestException('Invalid reset link.');
    }

    // 3. EXPIRY CHECK
    if (resetRecord.expiresAt < new Date()) {
      await this.prisma.passwordResetToken.delete({ where: { id: tokenId } }).catch(() => {});
      throw new BadRequestException('Reset link has expired.');
    }

    // 4. FAST CRYPTOGRAPHIC VERIFICATION (SHA-256)
    // Re-hash the secret from the URL and compare directly
    const incomingHash = this.tokenService.hashToken(tokenSecret);
    if (incomingHash !== resetRecord.token) {
      logger.warn(`SECURITY ALERT: Token mismatch for User ID ${resetRecord.userId}`);
      throw new BadRequestException('Invalid reset link.');
    }

    // 5. HEAVY BCRYPT: Only for the actual new password
    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    // 6. ATOMIC TRANSACTION (Array style is faster for 1,000 users)
    await this.prisma.$transaction(async (tx) => {
      (await tx.user.update({
        where: { id: resetRecord.userId },
        data: {
          password: hashedPassword,
          mustChangePassword: false,
          tokenVersion: { increment: 1 }, // Invalidate all existing refresh tokens immediately
        },
      }),
        await tx.passwordResetToken.deleteMany({
          where: { userId: resetRecord.userId },
        }),
        await this.sessionService.revokeSessions(resetRecord.userId, tx)); // Invalidate all sessions immediately
    });

    logger.info(`SUCCESS: Password recovered for ${resetRecord.user.email}`);
    return { message: 'Password reset successful. You can now log in.' };
  }
}
