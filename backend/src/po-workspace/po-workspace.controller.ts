import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { PoWorkspaceService } from './po-workspace.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { PoWorkspaceFilterDto } from './dto/po-workspace-filter.dto';
import { PoWorkspaceResponse } from './dto/po-workspace.response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AuthRole } from 'src/auth/enums/auth-name.enums';
import { UpdatePoLineStatusDto } from './dto/update-po-line-status.dto';

@Controller('po-workspace')
export class PoWorkspaceController {
  constructor(private readonly service: PoWorkspaceService) {}

  @Get('types')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.SUPER_ADMIN, AuthRole.ADMIN)
  getPoTypes() {
    // This will return an array of { id, code, name }
    return this.service.getPoTypes();
  }

  @Get()
  @Roles(AuthRole.SUPER_ADMIN, AuthRole.ADMIN)
  getWorkspace(@Query() filters: PoWorkspaceFilterDto): Promise<PoWorkspaceResponse> {
    return this.service.getWorkspace(filters);
  }

  @Patch('po-line/:id/status')
  @Roles(AuthRole.ADMIN, AuthRole.SUPER_ADMIN) // Custom decorator you likely have
  @UseGuards(JwtAuthGuard, RolesGuard)
  updateStatus(@Param('id') id: string, @Body() dto: UpdatePoLineStatusDto) {
    return this.service.updatePoLineStatus(id, dto.status);
  }
}
