import { SetMetadata } from '@nestjs/common';
import { AuthRole } from '@prisma/client';
// Define a constant key to store roles metadata
// Custom decorator to assign roles to a route handler or controller
// Usage: @Roles(Role.ADMIN, Role.USER)
// This will attach the roles array to the route metadata, which can later be
// accessed in guards (like a RolesGuard) to restrict access based on user role
export const ROLES_KEY = 'roles';
export const Roles = (...roles: AuthRole[]) => SetMetadata(ROLES_KEY, roles);
