// src/fund-requests/fund-requests.controller.ts
import { Controller, Post, Body, Request, UseGuards, Patch, Param, Get } from '@nestjs/common';
import { FundRequestsService, FundRequestWithRelations } from './fund-requests.service';
import { CreateFundRequestDto } from './dto/create-fund-request.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { ApproveFundRequestDto } from './dto/approve-fund-request.dto';
import { FundRequestResponseDto } from './dto/fund-request-response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RoleName } from 'src/auth/eums/role-name.enums';

@Controller('fund-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FundRequestsController {
  constructor(
    private readonly fundRequestsService: FundRequestsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Roles(RoleName.USER) // PM role
  @UseGuards(JwtAuthGuard, RolesGuard)
  async create(@Body() dto: CreateFundRequestDto, @Request() req) {
    const pmId = req.user.id;
    return this.fundRequestsService.createFundRequest(dto, pmId);
  }

  @Patch(':id/approve')
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async approveOrReject(@Param('id') fundRequestId: string, @Body() dto: ApproveFundRequestDto, @Request() req) {
    const adminId = req.user.id;
    return this.fundRequestsService.approveOrRejectFundRequest(fundRequestId, dto, adminId);
  }

  /** Get All for the Table */
  @Get('search')
  async findAll(): Promise<FundRequestResponseDto[]> {
    // Call the service, which handles the mapping internally
    return await this.fundRequestsService.findAll();
  }
}
