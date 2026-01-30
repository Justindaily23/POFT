import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { logger } from 'src/common/logger/logger';

@Injectable()
export class CleanupService {
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR) // runs every hour
  async handleExpiredSessions() {
    const deleted = await this.prisma.refreshSession.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    logger.info(`Deleted ${deleted.count} expired refresh sessions`);
  }
}
