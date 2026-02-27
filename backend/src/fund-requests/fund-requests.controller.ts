import { Controller, Post, Body, Request as Req, UseGuards, Patch, Param, Get, Query } from '@nestjs/common';
import { FundRequestsService } from './fund-requests.service';
import { CreateFundRequestDto } from './dto/create-fund-request.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { ApproveFundRequestDto } from './dto/approve-fund-request.dto';
import { AuthRole } from 'src/auth/enums/auth-name.enums';
import { POLineSearchResponseDto } from './dto/po-search-response.dto';
import { FundRequestResponseDto } from './dto/fund-request-response.dto';
import { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';

@Controller('fund-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FundRequestsController {
  constructor(private readonly fundRequestsService: FundRequestsService) {}

  @Get('search')
  async search(@Query('query') query: string): Promise<POLineSearchResponseDto[]> {
    if (!query) return [];
    return this.fundRequestsService.fetchFundRequestData(query);
  }

  // For PMs: fetch their own history
  @Get('history')
  @Roles(AuthRole.USER)
  async getUserHistory(
    @Req() req: RequestWithUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string, // Query params are strings by default
  ) {
    const userId = req.user.id;

    // Convert limit to number safely, default to 20
    const take = limit ? parseInt(limit, 10) : 20;

    return this.fundRequestsService.getFundRequestHistory(userId, take, cursor);
  }

  @Get('history/:poLineId')
  getHistory(@Param('poLineId') poLineId: string) {
    return this.fundRequestsService.getFundRequestHistory(poLineId);
  }

  //   // Optionally: history by PO line
  // @Get('po-line/:poLineId')
  // async getHistoryByPoLine(@Param('poLineId') poLineId: string) {
  //   return this.fundRequestsService.getFundRequestHistoryByPoLine(poLineId);
  // }

  @Post('submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.USER) // PM role
  create(@Body() dto: CreateFundRequestDto, @Req() req: RequestWithUser) {
    const userId = req.user.id; // Changed .id to .sub
    return this.fundRequestsService.createFundRequest(dto, userId);
  }

  // For Admins: fetch all fund requests
  @Get('admin')
  @Roles(AuthRole.SUPER_ADMIN)
  async getAllFundRequests(
    @Query('query') query?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('cursor') cursor?: string, // 🟢 Added
    @Query('limit') limit?: string, // 🟢 Added
  ): Promise<{ data: FundRequestResponseDto[]; nextCursor: string | null }> {
    // 🟢 Updated return type
    const take = limit ? parseInt(limit, 10) : 20;

    return this.fundRequestsService.getAllFundRequests({ query, status, fromDate, toDate }, take, cursor);
  }

  @Patch(':id/action')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.SUPER_ADMIN)
  approveOrReject(@Param('id') fundRequestId: string, @Body() dto: ApproveFundRequestDto, @Req() req: RequestWithUser) {
    const adminId = req.user.id; // Changed .id to .sub
    return this.fundRequestsService.approveOrRejectFundRequest(fundRequestId, dto, adminId);
  }
}
