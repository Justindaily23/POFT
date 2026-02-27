import { Controller, Get, Query, Req, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AuthRole } from '@prisma/client'; // Use your Prisma AuthRole
import { PoAnalyticsService } from './po-analytics.service';
import { PoAgingFilterDto } from './dto/po-filter.dto';
import { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';
import { PoAgingDashboardResponse, PoAgingDaysPaginatedResponse } from './po-analytics-types/poAgingDaysResponse.type';

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
        invoicedPOs: dashboard.kpis.invoicedPOs,
        notInvoicedPOs: dashboard.kpis.notInvoicedPOs,
        invoiceRate: dashboard.kpis.invoiceRate,
        avgPoAgingDays: dashboard.kpis.avgPoAgingDays,
        totalPOLines: dashboard.kpis.totalPOLines, // ✅ Added for DTO completeness
      },
      duids: dashboard.duids,
      // 🛡️ THE FIX: Pass the critical projects from the service to the frontend
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
}
