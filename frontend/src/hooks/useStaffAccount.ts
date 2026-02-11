import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/axios";
import { useToast } from "@/hooks/use-toast";
import type { CreateStaffAccountPayload, State, StaffRole } from "@/features/staffs/dto/create-staff-account.dto";

const ENDPOINTS = {
    ROLES: "/metadata/staff-roles",
    STATES: "/metadata/states",
    CREATE_STAFF: "/user/create-account",
};

export const useStaffAccount = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // 1. Fetch Staff Roles (Dynamic)
    const staffRolesQuery = useQuery<StaffRole[]>({
        queryKey: ["staff-roles"],
        queryFn: async () => (await apiClient.get(ENDPOINTS.ROLES)).data,
    });

    // 2. Fetch States (Static/Seeded)
    const statesQuery = useQuery<State[]>({
        queryKey: ["states"],
        queryFn: async () => (await apiClient.get(ENDPOINTS.STATES)).data,
        staleTime: Infinity, // Since states never change, don't refetch often
    });

    // 3. Create Staff Account
    const createStaffMutation = useMutation({
        mutationFn: async (dto: CreateStaffAccountPayload) => {
            const { data } = await apiClient.post(ENDPOINTS.CREATE_STAFF, dto);
            return data;
        },
        onSuccess: () => {
            toast({ title: "Account Created", description: "Staff has been successfully registered." });
        },
        onError: (error: any) => {
            toast({
                variant: "destructive",
                title: "Creation Failed",
                description: error.response?.data?.message || "Could not create account",
            });
        },
    });

    // 4. Create Role (The only dynamic metadata left)
    const createRoleMutation = useMutation({
        mutationFn: async ({ name, code }: { name: string; code?: string }) => {
            const { data } = await apiClient.post(ENDPOINTS.ROLES, { name, code });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["staff-roles"] });
            toast({ title: "Role Added", description: "New staff role is now available." });
        },
        onError: (error: any) => {
            toast({
                variant: "destructive",
                title: "Action Failed",
                description: error.response?.data?.message || "Check your internet connection",
            });
        },
    });

    return {
        roles: staffRolesQuery.data ?? [],
        states: statesQuery.data ?? [],
        isLoading: staffRolesQuery.isLoading || statesQuery.isLoading,
        createStaff: createStaffMutation,
        createRole: createRoleMutation, // Renamed from createMetadata
        isSubmitting: createStaffMutation.isPending || createRoleMutation.isPending,
    };
};
