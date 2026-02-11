import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { MetadataService } from './metadata.service';
import { CreateStaffRoleDto } from './dto/create-staff-role.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AuthRole } from 'src/auth/enums/auth-name.enums';

@Controller('metadata')
@UseGuards(JwtAuthGuard) // base auth
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  // ---------- AUTH ROLES (system-level) ----------

  @Get('auth-roles')
  getAuthRoles() {
    return [
      { value: AuthRole.USER, label: 'User' },
      { value: AuthRole.ADMIN, label: 'Administrator' },
      { value: AuthRole.SUPER_ADMIN, label: 'Super Admin' },
    ];
  }

  // ---------- STAFF ROLES ----------

  @Get('staff-roles')
  getStaffRoles() {
    return this.metadataService.getStaffRoles();
  }

  @Post('staff-roles')
  @UseGuards(RolesGuard)
  @Roles(AuthRole.SUPER_ADMIN)
  createStaffRole(@Body() dto: CreateStaffRoleDto) {
    return this.metadataService.createStaffRole(dto);
  }

  // ---------- STATES ----------

  @Get('states')
  getStates() {
    return this.metadataService.getStates();
  }

  // @Post('states')
  // @UseGuards(RolesGuard)
  // @Roles(AuthRole.SUPER_ADMIN)
  // createState(@Body() dto: CreateStateDto) {
  //   return this.metadataService.createState(dto);
  // }
}
