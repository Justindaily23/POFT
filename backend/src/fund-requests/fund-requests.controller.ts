// src/fund-requests/fund-requests.controller.ts
import { Controller, Post, Body, Request, UseGuards, Patch, Param, Get, Query } from '@nestjs/common';
import { FundRequestsService } from './fund-requests.service';
import { CreateFundRequestDto } from './dto/create-fund-request.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { ApproveFundRequestDto } from './dto/approve-fund-request.dto';
import { AuthRole } from 'src/auth/enums/auth-name.enums';
import { POLineSearchResponseDto } from './dto/po-search-response.dto';
import { FundRequestResponseDto } from './dto/fund-request-response.dto';

@Controller('fund-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FundRequestsController {
  constructor(private readonly fundRequestsService: FundRequestsService) {}

  @Get('search')
  async search(@Query('query') query: string): Promise<POLineSearchResponseDto[]> {
    if (!query) return [];
    return this.fundRequestsService.fetchFundRequestData(query);
  }
  // src/fund-requests/fund-requests.controller.ts

  @Get('history/:poLineId')
  async getHistory(@Param('poLineId') poLineId: string) {
    // Pass these identifiers to your service to fetch the history
    return this.fundRequestsService.getFundRequestHistory(poLineId);
  }

  @Post('submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.USER) // PM role
  async create(@Body() dto: CreateFundRequestDto, @Request() req) {
    console.log(req.user); // Should log { id, role }

    const userId = req.user.id;
    return this.fundRequestsService.createFundRequest(dto, userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.SUPER_ADMIN)
  @Get('history')
  async getFundRequest(@Request() req): Promise<FundRequestResponseDto[]> {
    // req.user is populated by your JwtStrategy/Guard
    const userId = req.user.userId;

    return this.fundRequestsService.getFundRequestHistory(userId);
  }

  @Patch(':id/approve')
  @Roles(AuthRole.SUPER_ADMIN)
  // @UseGuards(JwtAuthGuard, RolesGuard)
  async approveOrReject(@Param('id') fundRequestId: string, @Body() dto: ApproveFundRequestDto, @Request() req) {
    const adminId = req.user.id;
    return this.fundRequestsService.approveOrRejectFundRequest(fundRequestId, dto, adminId);
  }

  /** Get All for the Table */
  // @Get('search')
  // async findAll(): Promise<FundRequestResponseDto[]> {
  //   // Call the service, which handles the mapping internally
  //   return await this.fundRequestsService.findAll();
  // }
}
