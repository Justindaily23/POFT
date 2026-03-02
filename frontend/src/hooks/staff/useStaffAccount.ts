import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import apiClient from "@/api/auth/axios";
import { handleApiError } from "@/utils/fund-request/apiHelpers";
import type { AppAxiosError, EnhancedError } from "@/types/api/api.types";
import type {
  CreateStaffAccountPayload,
  State,
  StaffRole,
} from "@/pages/staff/dto/create-staff-account.dto";

// 1. Define Success Response Types to replace 'any'
export interface CreateStaffResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    tempPassword: string; // Required for your PasswordModal
  };
  staffProfile: {
    // Now TypeScript knows this exists
    staffId: string;
    roleId: string;
    stateId: string;
    isActive: boolean;
  };
  message?: string; // Optional if you decide to return it from NestJS
}

interface CreateRoleResponse {
  id: string;
  name: string;
  code?: string;
}

const ENDPOINTS = {
  ROLES: "/metadata/staff-roles",
  STATES: "/metadata/states",
  CREATE_STAFF: "/user/create-account",
};

export const useStaffAccount = () => {
  const queryClient = useQueryClient();

  // 1. Fetch Staff Roles
  const staffRolesQuery = useQuery<StaffRole[], AppAxiosError>({
    queryKey: ["staff-roles"],
    queryFn: async () => {
      const { data } = await apiClient.get(ENDPOINTS.ROLES);
      return data;
    },
  });

  // 2. Fetch States
  const statesQuery = useQuery<State[], AppAxiosError>({
    queryKey: ["states"],
    queryFn: async () => {
      const { data } = await apiClient.get(ENDPOINTS.STATES);
      return data;
    },
    staleTime: Infinity,
  });

  // 3. Create Staff Account
  // ✅ Fixed: Replaced 'any' with 'CreateStaffResponse'
  const createStaffMutation = useMutation<
    CreateStaffResponse,
    AppAxiosError,
    CreateStaffAccountPayload
  >({
    mutationFn: async (dto) => {
      const { data } = await apiClient.post(ENDPOINTS.CREATE_STAFF, dto);
      return data;
    },
    onSuccess: () => {
      toast.success("Account Created", {
        description: "Staff has been successfully registered.",
      });
    },
    onError: (error: AppAxiosError) => {
      try {
        handleApiError(error);
      } catch (e) {
        const err = e as EnhancedError;
        toast.error("Creation Failed", { description: err.message });
      }
    },
  });

  // 4. Create Role
  // ✅ Fixed: Replaced 'any' with 'CreateRoleResponse'
  const createRoleMutation = useMutation<
    CreateRoleResponse,
    AppAxiosError,
    { name: string; code?: string }
  >({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post(ENDPOINTS.ROLES, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-roles"] });
      toast.success("Role Added", { description: "New staff role is now available." });
    },
    onError: (error: AppAxiosError) => {
      try {
        handleApiError(error);
      } catch (e) {
        const err = e as EnhancedError;
        toast.error("Action Failed", { description: err.message });
      }
    },
  });

  return {
    roles: staffRolesQuery.data ?? [],
    states: statesQuery.data ?? [],
    isLoading: staffRolesQuery.isLoading || statesQuery.isLoading,
    createStaff: createStaffMutation,
    createRole: createRoleMutation,
    isSubmitting: createStaffMutation.isPending || createRoleMutation.isPending,
  };
};
