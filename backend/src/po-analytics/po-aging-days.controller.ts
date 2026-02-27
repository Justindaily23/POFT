import { Controller, Get, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AuthRole } from 'src/auth/enums/auth-name.enums';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { PoAnalyticsService } from './po-analytics.service';
import { PoAgingDaysPaginatedResponse } from './po-analytics-types/poAgingDaysResponse.type';
import { PoAgingFilterDto } from './dto/po-filter.dto';

@Controller('analytics')
export class PoAnalyticsController {
  constructor(private readonly poAnalyticsService: PoAnalyticsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.SUPER_ADMIN, AuthRole.ADMIN)
  async getPoAgingDays(
    @Query() filters: PoAgingFilterDto, // 👈 Captures all search/filter/pagination params
  ): Promise<PoAgingDaysPaginatedResponse> {
    // Ensure numeric types are handled if not using ValidationPipe transform
    filters.take = filters.take ? Number(filters.take) : 50;

    return this.poAnalyticsService.getAllPoAgingDays(filters);
  }

  @Get('kpis')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.ADMIN, AuthRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getDashboard(@Query() filters: PoAgingFilterDto) {
    return await this.poAnalyticsService.getDashboardAnalytics(filters);
  }
}
