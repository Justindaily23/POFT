import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AuthRole } from 'src/auth/enums/auth-name.enums';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { PrismaService } from 'src/prisma/prisma.service';
import { PoAgingDaysService } from './po-aging-days.service';
import { PoAgingDaysPaginatedResponse } from './poAgingTypes/poAgingDaysResponse.type';

@Controller('po-aging-days')
export class PoAgingDaysController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly poAgingDaysService: PoAgingDaysService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.SUPER_ADMIN, AuthRole.ADMIN)
  async getPoAgingDays(): Promise<PoAgingDaysPaginatedResponse> {
    return await this.poAgingDaysService.getAllPoAgingDays();
  }
}
