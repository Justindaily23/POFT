import { AuthRole } from '@prisma/client';

export class StaffAccountResponseDto {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: AuthRole;
    tempPassword?: string; // only if you want to return the temp password
  };
  staffProfile: {
    staffId: string;
    roleId: string;
    stateId: string;
    isActive: boolean;
  };
}
