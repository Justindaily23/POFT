// src/features/staff/types/create-staff-account.dto.ts
export interface CreateStaffAccountPayload {
    user: {
        email: string;
        fullName: string;
        phoneNumber?: string;
        role: "USER" | "ADMIN" | "SUPER_ADMIN";
    };

    staffRoleId: string;
    stateId: string;
}

// src/features/staff/types/state.ts
export interface State {
    id: string;
    name: string;
    createdAt: string;
}

// src/features/staff/types/staff-role.ts
export interface StaffRole {
    id: string;
    name: string;
    code: string;
    createdAt: string;
}
