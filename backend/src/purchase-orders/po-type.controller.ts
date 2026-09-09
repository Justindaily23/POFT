import { Controller, Get, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { PoTypeService } from './po-type.service';
import { CreatePoTypeDto } from './dto/create-po-type.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth-guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { AuthRole } from '@prisma/client';

@Controller('po-types')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PoTypeController {
  constructor(private readonly poTypeService: PoTypeService) {}

  @Get()
  findAll() {
    return this.poTypeService.findAll();
  }

  @Post()
  @Roles(AuthRole.ADMIN, AuthRole.SUPER_ADMIN)
  create(@Body() dto: CreatePoTypeDto) {
    return this.poTypeService.create(dto);
  }

  @Patch(':id/deactivate')
  @Roles(AuthRole.ADMIN, AuthRole.SUPER_ADMIN)
  deactivate(@Param('id') id: string) {
    return this.poTypeService.deactivate(id);
  }
}