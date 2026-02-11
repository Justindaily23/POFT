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
// Import your shared interface
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

  @Get('history/:poLineId')
  async getHistory(@Param('poLineId') poLineId: string) {
    return this.fundRequestsService.getFundRequestHistory(poLineId);
  }

  @Post('submit')
  @Roles(AuthRole.USER) // PM role
  async create(@Body() dto: CreateFundRequestDto, @Req() req: RequestWithUser) {
    const userId = req.user.sub; // Changed .id to .sub
    return this.fundRequestsService.createFundRequest(dto, userId);
  }

  @Get()
  @Roles(AuthRole.SUPER_ADMIN)
  async getFundRequest(@Req() req: RequestWithUser): Promise<FundRequestResponseDto[]> {
    const userId = req.user.sub; // Changed .userId to .sub
    return this.fundRequestsService.getFundRequestHistory(userId);
  }

  @Patch(':id/approve')
  @Roles(AuthRole.SUPER_ADMIN)
  async approveOrReject(
    @Param('id') fundRequestId: string,
    @Body() dto: ApproveFundRequestDto,
    @Req() req: RequestWithUser,
  ) {
    const adminId = req.user.sub; // Changed .id to .sub
    return this.fundRequestsService.approveOrRejectFundRequest(fundRequestId, dto, adminId);
  }
}
