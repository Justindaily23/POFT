import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class SessionService {
  constructor(private prisma: PrismaService) {}

  async upsertSession(data: Prisma.RefreshSessionUpsertArgs) {
    return this.prisma.refreshSession.upsert(data);
  }

  async deleteSession(userId: string, deviceId: string) {
    return this.prisma.refreshSession.deleteMany({ where: { userId, deviceId } });
  }

  async deleteAllSessions(userId: string) {
    return this.prisma.refreshSession.deleteMany({ where: { userId } });
  }

  async findValidSession(deviceId: string) {
    return this.prisma.refreshSession.findFirst({
      where: {
        deviceId,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  }

  async revokeSessions(userId: string, tx: Prisma.TransactionClient) {
    await tx.refreshSession.deleteMany({ where: { userId } });
  }
}
