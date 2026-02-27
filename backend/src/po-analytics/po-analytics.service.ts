import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { PoLineStatus, PoAgingFlag, Prisma, NotificationType } from '@prisma/client';
import { aggregatePoAgingDashboard } from './po-aging-aggregator';
import { PoAgingFilterDto } from './dto/po-filter.dto';
import {
  PoAgingDashboardResponse,
  PoAgingDaysPaginatedResponse,
  PoAgingLineDto,
  PoLineWithRelations,
} from './po-analytics-types/poAgingDaysResponse.type';
import { PoAgingEvaluatorService } from './po-aging-evaluator.service';
import { logger } from 'src/common/logger/logger';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class PoAnalyticsService {
  private readonly CACHE_PREFIX = 'po_dashboard_';

  constructor(
    private readonly prisma: PrismaService,
    private readonly agingEvaluator: PoAgingEvaluatorService,
    private readonly notificationsService: NotificationsService,

    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Build Prisma WHERE clause for filtering PurchaseOrderLines
   */
  private async buildWhere(query: PoAgingFilterDto, userId?: string): Promise<Prisma.PurchaseOrderLineWhereInput> {
    const {
      searchPM,
      searchDUID,
      searchPONumber,
      searchProjectCode,
      searchProjectName,
      agingFlag,
      invoiceStatus,
      dateMode,
      rangeStart,
      rangeEnd,
      startDate,
      endDate,
      poType,
      year,
      month,
      day,
    } = query;

    const conditions: Prisma.PurchaseOrderLineWhereInput[] = [];

    // --- 1. CONSOLIDATED DATE LOGIC ---
    if (dateMode !== 'all') {
      const effectiveStart = rangeStart || startDate;
      const effectiveEnd = rangeEnd || endDate;

      if (effectiveStart && effectiveEnd) {
        const dStart = new Date(effectiveStart);
        const dEnd = new Date(effectiveEnd);
        dEnd.setHours(23, 59, 59, 999);

        if (!isNaN(dStart.getTime()) && !isNaN(dEnd.getTime())) {
          conditions.push({ poIssuedDate: { gte: dStart, lte: dEnd } });
        }
      } else if (year) {
        // ✅ PRODUCTION FIX: Explicitly cast and handle numbers to avoid "Unsafe arithmetic"
        const m = month ? Number(month) : 0;
        const d = day ? Number(day) : 1;

        const start = new Date(year, m > 0 ? m - 1 : 0, d);
        const end = day
          ? new Date(year, m > 0 ? m - 1 : 0, d, 23, 59, 59)
          : m > 0
            ? new Date(year, m, 0, 23, 59, 59)
            : new Date(year, 11, 31, 23, 59, 59);

        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          conditions.push({ poIssuedDate: { gte: start, lte: end } });
        }
      }
    }

    // --- 2. USER/PM SCOPING ---
    if (userId) {
      const profile = await this.prisma.staffProfile.findUnique({
        where: { userId },
        select: { staffId: true },
      });
      if (!profile) throw new NotFoundException('No staff profile found.');
      conditions.push({ pmId: profile.staffId });
    } else if (searchPM) {
      conditions.push({ pm: { contains: searchPM, mode: 'insensitive' } });
    }

    // --- 3. SEARCH FILTERS ---
    // Optional chaining and Prisma Where types are safe here
    if (searchDUID) conditions.push({ purchaseOrder: { duid: { contains: searchDUID, mode: 'insensitive' } } });
    if (searchPONumber)
      conditions.push({ purchaseOrder: { poNumber: { contains: searchPONumber, mode: 'insensitive' } } });
    if (searchProjectCode)
      conditions.push({ purchaseOrder: { projectCode: { contains: searchProjectCode, mode: 'insensitive' } } });
    if (searchProjectName)
      conditions.push({ purchaseOrder: { projectName: { contains: searchProjectName, mode: 'insensitive' } } });

    // --- 4. STATUS & TYPE ---
    // Ensure we cast 'all' checks correctly to avoid Enum mismatches
    if (agingFlag && agingFlag !== 'all') conditions.push({ agingFlag: agingFlag });
    if (invoiceStatus && invoiceStatus !== 'all') conditions.push({ poLineStatus: invoiceStatus });
    if (poType && poType !== 'all') conditions.push({ poType: { code: poType } });

    return { AND: conditions };
  }

  /**
   * Dashboard analytics with total database truth and background sync
   */
  async getDashboardAnalytics(query: PoAgingFilterDto, userId?: string): Promise<PoAgingDashboardResponse> {
    const cacheKey = `${this.CACHE_PREFIX}${userId || 'ADMIN'}_${JSON.stringify(query)}`;

    const cached = await this.cacheManager.get<PoAgingDashboardResponse>(cacheKey);
    if (cached) return cached;

    const where = await this.buildWhere(query, userId);

    // ✅ NORMALIZE AND: Prevents 'Symbol.iterator' error on Prisma Union types
    const baseAND = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];

    // Fetch counts and full record set in parallel for speed
    // FIX 192: Explicitly cast 'lines' to PoLineWithRelations[]
    const [total, invoiced, lines] = await Promise.all([
      this.prisma.purchaseOrderLine.count({ where }),
      this.prisma.purchaseOrderLine.count({
        where: { AND: [...baseAND, { poLineStatus: PoLineStatus.INVOICED }] },
      }),
      this.prisma.purchaseOrderLine.findMany({
        where,
        include: {
          purchaseOrder: true,
          poType: { select: { code: true } },
        },
      }) as Promise<PoLineWithRelations[]>, // ✅ Casting here fixes member access errors
    ]);

    // FIX 75: Ensure invoiced and total are handled as numbers for arithmetic
    const invoiceRate = total > 0 ? (Number(invoiced) / Number(total)) * 100 : 0;

    // Throttled background update - FIX: type-safe error handling
    this.runBackgroundSync(lines).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Unknown sync error';
      logger.error('Background Aging Sync failed', msg);
    });

    const dtoLines = lines.map((line) => this.mapToDto(line));
    const aggregated = aggregatePoAgingDashboard(dtoLines);

    const result: PoAgingDashboardResponse = {
      kpis: {
        ...aggregated.kpis,
        totalPOLines: total,
        invoicedPOs: invoiced,
        notInvoicedPOs: total - invoiced,
        invoiceRate,
      },
      topCriticalProjects: aggregated.topCriticalProjects,
      duids: aggregated.duids,
      nextCursor: null,
    };

    await this.cacheManager.set(cacheKey, result, 3600);
    return result;
  }

  /**
   * Paginated PO Aging Days View
   */
  async getAllPoAgingDays(query: PoAgingFilterDto, userId?: string): Promise<PoAgingDaysPaginatedResponse> {
    const where = await this.buildWhere(query, userId);

    // FIX 49: Destructure safely by ensuring 'take' is a number
    const take = Number(query.take) || 30;

    const lines = await (this.prisma.purchaseOrderLine.findMany({
      where,
      take,
      ...(query.cursor && { skip: 1, cursor: { id: query.cursor } }),
      include: {
        purchaseOrder: true,
        poType: { select: { code: true } },
      },
      orderBy: { poIssuedDate: 'desc' },
    }) as Promise<PoLineWithRelations[]>); // ✅ Casting here

    return {
      data: lines.map((line) => this.mapToDto(line)),
      nextCursor: lines.length === take ? lines[lines.length - 1].id : null,
    };
  }

  /**
   * Safe mapping from Prisma result to DTO
   */
  private mapToDto(line: PoLineWithRelations): PoAgingLineDto {
    // Pass as 'any' because evaluator handles null poIssuedDate internally
    const evalResult = this.agingEvaluator.evaluate(line);

    return {
      id: line.id,
      duid: line.purchaseOrder?.duid ?? 'N/A',
      poNumber: line.purchaseOrder?.poNumber ?? 'N/A',
      prNumber: line.purchaseOrder?.prNumber ?? 'N/A',
      projectCode: line.purchaseOrder?.projectCode ?? 'N/A',
      projectName: line.purchaseOrder?.projectName ?? 'N/A',
      pm: line.pm ?? 'N/A',
      pmId: line.pmId ?? 'N/A',
      poLineNumber: line.poLineNumber ?? '0',
      poType: line.poType?.code ?? 'N/A',
      // DTO requires Date; fallback to current date if missing to prevent UI crash
      poIssuedDate: line.poIssuedDate ?? new Date(),
      poInvoiceDate: line.poInvoiceDate ?? null,
      allowedOpenDays: evalResult.allowedOpenDays,
      numberOfDaysOpen: evalResult.daysOpen,
      agingFlag: evalResult.agingFlag,
      itemCode: line.itemCode ?? 'N/A',
      poLineAmount: Number(line.poLineAmount) || 0,
      itemDescription: line.itemDescription ?? 'N/A',
      poInvoiceStatus: line.poLineStatus,
    };
  }

  /**
   * Throttled background sync using p-limit (Max 5 concurrent DB updates)
   */
  private async runBackgroundSync(lines: PoLineWithRelations[]): Promise<void> {
    const CONCURRENCY_LIMIT = 5;

    // Process in chunks of 5 to protect Prisma connection pool
    for (let i = 0; i < lines.length; i += CONCURRENCY_LIMIT) {
      const chunk = lines.slice(i, i + CONCURRENCY_LIMIT);

      await Promise.all(
        chunk.map(async (line) => {
          try {
            const evalResult = this.agingEvaluator.evaluate(line);

            const isRed = evalResult.agingFlag === PoAgingFlag.RED;
            const alreadyNotifiedRed = (line.lastAgingNotifiedFlag as string) === PoAgingFlag.RED;

            if (isRed && !alreadyNotifiedRed) {
              const profile = await this.prisma.staffProfile.findUnique({
                where: { staffId: line.pmId || '' },
                select: { userId: true },
              });

              if (profile?.userId) {
                await this.notificationsService.notify(profile.userId, NotificationType.PO_AGING_ALERT, {
                  duid: line.purchaseOrder?.duid || 'N/A',
                  projectName: line.purchaseOrder?.projectName || 'N/A',
                  status: PoAgingFlag.RED,
                  daysOpen: evalResult.daysOpen,
                });

                await this.markAgingNotified(line.id, PoAgingFlag.RED);
              }
            }

            if (line.agingFlag !== evalResult.agingFlag) {
              await this.prisma.purchaseOrderLine.update({
                where: { id: line.id },
                data: { agingFlag: evalResult.agingFlag },
              });
            }
          } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`[BackgroundSync] Failed for line ${line.id}: ${msg}`);
          }
        }),
      );
    }
  }

  /**
   * Mark Aging Notification as sent
   */
  async markAgingNotified(lineId: string, flag: PoAgingFlag) {
    try {
      return await this.prisma.purchaseOrderLine.update({
        where: { id: lineId },
        data: { lastAgingNotifiedFlag: flag },
      });
    } catch (error: unknown) {
      // ✅ FIX: Type guard to safely access .stack or .message
      const stack = error instanceof Error ? error.stack : 'No stack trace';

      logger.error(`Failed to mark notification for ${lineId}`, stack);

      // Re-throw the original error to maintain existing app behavior
      throw error;
    }
  }
}
