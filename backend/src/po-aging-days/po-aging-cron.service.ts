import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PoAgingDaysService } from './po-aging-days.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { PoAgingFlag, NotificationType } from '@prisma/client';
import { logger } from 'src/common/logger/logger';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthRole } from '@prisma/client';

// @Injectable()
// export class PoAgingCronService {
//   constructor(
//     private readonly poAgingService: PoAgingDaysService,
//     private readonly notificationsService: NotificationsService,
//     private readonly prisma: PrismaService,
//   ) {}

//   /**
//    * Runs daily at 6AM UTC (adjust timezone if needed)
//    */
//   @Cron(CronExpression.EVERY_DAY_AT_6AM, {
//     name: 'po-aging-notifications',
//     timeZone: 'UTC',
//   })
//   async handlePoAgingNotifications() {
//     logger.info('Starting PO Aging Notifications Cron Job');

//     try {

//     //           // 1️⃣ Fetch all potential recipients once (Admins + PMs)
//     //   const allStaff = await this.prisma.user.findMany({
//     //     where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN, Role.PM] } },
//     //     select: { id: true, email: true, fullName: true, role: true }
//     //   });

//       // 1️⃣ Get all admins once
//       const admins = await this.prisma.user.findMany({
//         where: {
//           role: {
//             in: [Role.ADMIN, Role.SUPER_ADMIN],
//           },
//         },
//         select: {
//           id: true,
//           email: true,
//           fullName: true,
//         },
//       }); // returns [{id, email, fullName}]

//       let cursor: string | undefined;
//       const take = 100;
//       let totalSent = 0;

//       while (true) {
//         // 2️ Fetch PO lines in pages
//         const { data, nextCursor } = await this.poAgingService.getAllPoAgingDays(take, cursor);

//         if (!data.length) break; // Breakso out if no data to fetch

//         for (const line of data) {
//           try {
//             // 3️ Check if we need to notify
//             if (this.shouldNotify(line)) {
//             //                   // 2️ Resolve PM string to a User Object
//             //   const pmUser = pmMap.get(line.pm); // matches PM name string to User ID
//               await this.processSinglePoNotification(line, admins);
//               totalSent++;
//             }
//           } catch (lineError) {
//             logger.error(`Failed PO Line ${line.id}: ${lineError.message}`);
//           }
//         }

//         if (!nextCursor) break;
//         cursor = nextCursor;
//       }

//       logger.info(`PO Aging Cron Job Completed. Total notifications sent: ${totalSent}`);
//     } catch (globalError) {
//       logger.error(`CRITICAL: PO Aging Cron Job failed: ${globalError.message}`);
//     }
//   }

//   /**
//    * Determines if we should notify for this PO line
//    * @param line PO line object
//    */
//   private shouldNotify(line: any): boolean {
//     const flagChanged = line.lastAgingNotifiedFlag !== line.agingFlag; // only once per change
//     const isCritical = line.agingFlag === PoAgingFlag.WARNING || line.agingFlag === PoAgingFlag.RED;

//     return flagChanged && isCritical;
//   }

//   /**
//    * Send notification to admins and PM if possible
//    */
//   private async processSinglePoNotification(line: any, admins: any[]) {
//     // 1️ Construct recipients
//     const pmUser = line.pm ? [{ id: line.pm, email: `${line.pm}@company.com`, fullName: line.pm }] : [];

//     const recipients = [...admins, ...pmUser];

//     // 2️ Prepare payload
//     const daysOpen = Math.max(0, Math.floor((Date.now() - new Date(line.poIssuedDate).getTime()) / 86400000));

//     const payload = {
//       poNumber: line.poNumber,
//       poLineNumber: line.poLineNumber,
//       agingFlag: line.agingFlag,
//       daysOpen,
//       allowedOpenDays: line.allowedOpenDays,
//     };

//     // 3️ Send notifications
//     for (const user of recipients) {
//       await this.notificationsService.createNotification(user.id, NotificationType.PO_AGING_WARNING, payload);
//     }

//     // 4️ Update PO line so we don't notify again until flag changes
//     await this.poAgingService.markAgingNotified(line.id, line.agingFlag);
//   }
// }

@Injectable()
export class PoAgingCronService {
  constructor(
    private readonly poAgingService: PoAgingDaysService,
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
      // 1️ Fetch all potential internal recipients once (Optimization)
      const allInternalUsers = await this.prisma.user.findMany({
        where: { role: { in: [AuthRole.ADMIN, AuthRole.SUPER_ADMIN, AuthRole.USER] } },
        select: { id: true, email: true, fullName: true, role: true },
      });

      // Split into Admins and a PM lookup map (Name -> User object)
      const admins = allInternalUsers.filter((u) => u.role !== AuthRole.USER);
      const pmMap = new Map(allInternalUsers.filter((u) => u.role === AuthRole.USER).map((u) => [u.fullName, u]));

      let cursor: string | undefined;
      const take = 100;
      let totalSent = 0;

      while (true) {
        const { data, nextCursor } = await this.poAgingService.getAllPoAgingDays(take, cursor);
        if (!data.length) break;

        for (const line of data) {
          try {
            if (this.shouldNotify(line)) {
              // 2️ Resolve recipients for THIS specific line
              const pmUser = pmMap.get(line.pm); // Lookup real User ID via PM name string

              // 3️ Deduplicate: Ensure no double-sending if a user has multiple roles
              const recipientMap = new Map();
              admins.forEach((a) => recipientMap.set(a.id, a));
              if (pmUser) recipientMap.set(pmUser.id, pmUser);

              const uniqueRecipients = Array.from(recipientMap.values());

              await this.processSinglePoNotification(line, uniqueRecipients);
              totalSent++;
            }
          } catch (lineError) {
            logger.error(`Failed PO Line ${line.id}: ${lineError.message}`);
          }
        }
        if (!nextCursor) break;
        cursor = nextCursor;
      }
      logger.info(`Job Completed. Total notifications sent: ${totalSent}`);
    } catch (globalError) {
      logger.error(`CRITICAL: Cron Job failed: ${globalError.message}`);
    }
  }

  private shouldNotify(line: any): boolean {
    const isCritical = line.agingFlag === PoAgingFlag.WARNING || line.agingFlag === PoAgingFlag.RED;
    const isNewFlag = line.lastAgingNotifiedFlag !== line.agingFlag;
    return isCritical && isNewFlag;
  }

  private async processSinglePoNotification(line: any, recipients: any[]) {
    const daysOpen = Math.max(0, Math.floor((Date.now() - new Date(line.poIssuedDate).getTime()) / 86400000));

    const payload = {
      poNumber: line.poNumber,
      poLineNumber: line.poLineNumber,
      agingFlag: line.agingFlag,
      daysOpen,
      allowedOpenDays: line.allowedOpenDays,
    };

    // Send to each resolved unique recipient
    for (const user of recipients) {
      await this.notificationsService.createNotification(user.id, NotificationType.PO_AGING_WARNING, payload);
    }

    // Update the DB so we don't notify again until the flag changes
    await this.poAgingService.markAgingNotified(line.id, line.agingFlag);
  }
}
