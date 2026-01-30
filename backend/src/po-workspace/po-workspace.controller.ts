import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PoWorkspaceService } from './po-workspace.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { PoWorkspaceFilterDto } from './dto/po-workspace-filter.dto';
import { PoWorkspaceResponse } from './dto/po-workspace.response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RoleName } from 'src/auth/eums/role-name.enums';

@Controller('po-workspace')
export class PoWorkspaceController {
  constructor(private readonly service: PoWorkspaceService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  async getWorkspace(@Query() filters: PoWorkspaceFilterDto): Promise<PoWorkspaceResponse> {
    return this.service.getWorkspace(filters);
  }
}
