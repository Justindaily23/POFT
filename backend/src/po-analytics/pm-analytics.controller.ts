import { Controller, Get, Query, Req, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AuthRole } from '@prisma/client'; // Use your Prisma AuthRole
import { PoAnalyticsService } from './po-analytics.service';
import { PoAgingFilterDto } from './dto/po-filter.dto';
import { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';
import {
  PoAgingDashboardResponse,
  PoAgingDaysPaginatedResponse,
  PoAgingDuidCardsPaginatedResponse,
} from './po-analytics-types/poAgingDaysResponse.type';

@Controller('pm-analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AuthRole.USER) // Scoped to Project Managers (USER role in your schema)
export class PmAnalyticsController {
  constructor(private readonly poAnalyticsService: PoAnalyticsService) {}
  /**
   * MOBILE KPI DASHBOARD (Bento Grid Data)
   * Automatically scoped to the logged-in PM's staffId
   */
  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  async getPmDashboard(
    @Req() req: RequestWithUser,
    @Query() filters: PoAgingFilterDto,
  ): Promise<PoAgingDashboardResponse> {
    const dashboard = await this.poAnalyticsService.getDashboardAnalytics(filters, req.user.id);

    return {
      kpis: {
        totalPOs: dashboard.kpis.totalPOs, // ✅ ADDED: Unique count of POs
        invoicedPOs: dashboard.kpis.invoicedPOs, // ✅ KEPT: Workflow tracking
        notInvoicedPOs: dashboard.kpis.notInvoicedPOs, // ✅ KEPT: Workflow tracking
        invoiceRate: dashboard.kpis.invoiceRate,
        avgPoAgingDays: dashboard.kpis.avgPoAgingDays, // ✅ KEPT: Aging metric
        totalPOLines: dashboard.kpis.totalPOLines,
        criticalAgedPos: dashboard.kpis.criticalAgedPos,
        // ✂️ REMOVED: Financial totals have been stripped out from global metrics
      },
      duids: dashboard.duids, // ✅ PERFECT: Card items still hold their internal financial totals safely!
      topCriticalProjects: dashboard.topCriticalProjects || [],
      nextCursor: null,
    };
  }

  /**
   * MOBILE AGING LIST (Infinite Scroll Data)
   * Automatically scoped to the logged-in PM's staffId
   */
  @Get('aging-list')
  async getPmAgingList(
    @Req() req: RequestWithUser,
    @Query() filters: PoAgingFilterDto,
  ): Promise<PoAgingDaysPaginatedResponse> {
    // Ensure numeric pagination from mobile is handled
    filters.take = filters.take ? Number(filters.take) : 20;

    return await this.poAnalyticsService.getAllPoAgingDays(filters, req.user.id);
  }

  /**
   * 🌟 PARALLEL TEST ROUTE (New Pre-Grouped Hierarchical Card Method)
   * Prevents jumping status severities mid-scroll on the frontend.
   * Hit this via: GET /pm-analytics/aging-list-v2
   */
  @Get('aging-list-v2')
  @HttpCode(HttpStatus.OK)
  async getPmAgingListV2(
    @Req() req: RequestWithUser,
    @Query() filters: PoAgingFilterDto,
  ): Promise<PoAgingDuidCardsPaginatedResponse> {
    filters.page = filters.page ? Number(filters.page) : 1;
    filters.take = filters.take ? Number(filters.take) : 15;

    return await this.poAnalyticsService.getPaginatedDuidCards(filters, req.user.id);
  }
}
