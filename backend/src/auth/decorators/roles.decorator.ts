// Import SetMetadata from NestJS to attach custom metadata to route handlers
import { SetMetadata } from '@nestjs/common';

import { RoleName } from '../eums/role-name.enums';

// Define a constant key to store roles metadata
export const ROLES_KEY = 'roles';

// Custom decorator to assign roles to a route handler or controller
// Usage: @Roles(Role.ADMIN, Role.USER)
// This will attach the roles array to the route metadata, which can later be
// accessed in guards (like a RolesGuard) to restrict access based on user role
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
