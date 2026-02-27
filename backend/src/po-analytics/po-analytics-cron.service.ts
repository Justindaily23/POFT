import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PoAnalyticsService } from './po-analytics.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { PoAgingFlag, NotificationType, AuthRole, User } from '@prisma/client';
import { logger } from 'src/common/logger/logger';
import { PrismaService } from 'src/prisma/prisma.service';
import { PoAgingDaysResponse, PoAgingDaysPaginatedResponse } from './po-analytics-types/poAgingDaysResponse.type';

@Injectable()
export class PoAgingCronService {
  constructor(
    private readonly poAgingService: PoAnalyticsService,
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM, {
    name: 'po-aging-notifications',
    timeZone: 'UTC',
  })
  async handlePoAgingNotifications() {
    logger.info('Starting PO Aging Notifications Cron Job');

    try {
      const allInternalUsers = await this.prisma.user.findMany({
        where: { role: { in: [AuthRole.ADMIN, AuthRole.SUPER_ADMIN, AuthRole.USER] } },
        select: { id: true, email: true, fullName: true, role: true },
      });

      const admins = allInternalUsers.filter((u) => u.role !== AuthRole.USER);
      // ✅ Explicitly type the Map to satisfy strict rules
      const pmMap = new Map<string, Partial<User>>(
        allInternalUsers.filter((u) => u.role === AuthRole.USER).map((u) => [u.fullName, u]),
      );

      let cursor: string | undefined;
      const take = 100;
      let totalSent = 0;

      while (true) {
        // ✅ Strictly typed result
        const result: PoAgingDaysPaginatedResponse = await this.poAgingService.getAllPoAgingDays({ take, cursor });
        const { data, nextCursor } = result;

        if (!data || !data.length) break;

        for (const line of data) {
          try {
            if (this.shouldNotify(line)) {
              const pmUser = pmMap.get(line.pm);

              const recipientMap = new Map<string, Partial<User>>();
              admins.forEach((a) => recipientMap.set(a.id, a));
              if (pmUser && pmUser.id) recipientMap.set(pmUser.id, pmUser);

              const uniqueRecipients = Array.from(recipientMap.values());

              await this.processSinglePoNotification(line, uniqueRecipients);
              totalSent++;
            }
          } catch (lineError: unknown) {
            // ✅ Type-safe error handling
            const msg = lineError instanceof Error ? lineError.message : 'Unknown Error';
            logger.error(`Failed PO Line ${line.id}: ${msg}`);
          }
        }
        if (!nextCursor) break;
        cursor = nextCursor;
      }
      logger.info(`Job Completed. Total notifications sent: ${totalSent}`);
    } catch (globalError: unknown) {
      // ✅ Type-safe error handling
      const msg = globalError instanceof Error ? globalError.message : 'Unknown Global Error';
      logger.error(`CRITICAL: Cron Job failed: ${msg}`);
    }
  }

  // ✅ 1. Update the check to ONLY notify on RED
  // PoAgingCronService.ts

  private shouldNotify(line: PoAgingDaysResponse): boolean {
    // TypeScript will now allow this because PoAgingDaysResponse uses PoAgingFlag
    const isCritical = line.agingFlag === PoAgingFlag.RED;
    const hasNotifiedRed = line.lastAgingNotifiedFlag === PoAgingFlag.RED;

    return isCritical && !hasNotifiedRed;
  }

  private async processSinglePoNotification(line: PoAgingDaysResponse, recipients: Partial<User>[]) {
    const daysOpen = Math.max(0, Math.floor((Date.now() - line.poIssuedDate.getTime()) / 86400000));

    // Ensure these keys match what your RED alert email template expects!
    const payload = {
      duid: line.duid,
      projectName: line.projectName,
      status: line.agingFlag, // "RED"
      daysOpen,
    };

    for (const user of recipients) {
      if (user.id) {
        // ✅ Triggering the BullMQ Queue via .notify()
        await this.notificationsService.notify(user.id, NotificationType.PO_AGING_ALERT, payload);
      }
    }

    // ✅ Mark it so we don't notify RED again for this line
    await this.poAgingService.markAgingNotified(line.id, line.agingFlag);
  }
}
