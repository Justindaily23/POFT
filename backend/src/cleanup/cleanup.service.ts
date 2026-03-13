import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { logger } from 'src/common/logger/logger';

@Injectable()
export class CleanupService {
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM) // runs every day at 2 AM
  async handleExpiredSessions() {
    const deleted = await this.prisma.refreshSession.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    logger.info(`Deleted ${deleted.count} expired refresh sessions`);
  }
}
