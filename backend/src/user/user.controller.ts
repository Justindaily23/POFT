import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { AuthRole } from 'src/auth/enums/auth-name.enums';
import { CreateStaffAccountDto } from './dto/create-staff-account.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('create-account')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AuthRole.SUPER_ADMIN)
  createStaff(@Body() dto: CreateStaffAccountDto) {
    return this.userService.createStaffAccount(dto);
  }

  // // GET /api/v1/auth-roles
  // @Get('auth-roles')
  // getAuthRoles() {
  //   return [
  //     { value: 'USER', label: 'User (Standard)' },
  //     { value: 'ADMIN', label: 'Administrator' },
  //     { value: 'SUPER_ADMIN', label: 'Super Admin' },
  //   ];
  // }

  // // GET /api/v1/staff-roles
  // @Get('staff-roles')
  // async getStaffRoles() {
  //   return this.prisma.staffRole.findMany({
  //     select: { id: true, name: true, code: true }, // code optional for display/use
  //     orderBy: { name: 'asc' },
  //   });
  // }

  // // GET /api/v1/states
  // @Get('states')
  // async getStates() {
  //   return this.prisma.state.findMany({
  //     select: { id: true, name: true, code: true },
  //     orderBy: { name: 'asc' },
  //   });
  // }
}
