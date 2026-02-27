import { Controller, Post, Body, Request as Req, UseGuards } from '@nestjs/common';
import { ContractAmendmentsService } from './contract-amendments.service';
import { CreateContractAmendmentDto } from './dto/create-contract-amendment.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AuthRole } from 'src/auth/enums/auth-name.enums';
// Import your shared interface
import { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';

@Controller('contract-amendments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContractAmendmentsController {
  constructor(private readonly contractAmendmentsService: ContractAmendmentsService) {}

  @Post()
  @Roles(AuthRole.SUPER_ADMIN)
  async create(@Body() dto: CreateContractAmendmentDto, @Req() req: RequestWithUser) {
    // Use .sub from your JwtPayload interface
    return this.contractAmendmentsService.createAmendment(dto, req.user.id);
  }
}
