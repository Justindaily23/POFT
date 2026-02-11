// src/contract-amendments/contract-amendments.controller.ts
import { Controller, Post, Body, Request, UseGuards } from '@nestjs/common';
import { ContractAmendmentsService } from './contract-amendments.service';
import { CreateContractAmendmentDto } from './dto/create-contract-amendment.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AuthRole } from 'src/auth/enums/auth-name.enums';

@Controller('contract-amendments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContractAmendmentsController {
  constructor(private readonly contractAmendmentsService: ContractAmendmentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.SUPER_ADMIN, AuthRole.ADMIN)
  async create(@Body() dto: CreateContractAmendmentDto, @Request() req) {
    return this.contractAmendmentsService.createAmendment(dto, req.user.id);
  }
}
