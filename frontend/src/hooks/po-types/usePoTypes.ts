import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { poTypesApi, type CreatePoTypeRequest } from "@/api/po-types/poTypes.api";
import { toast } from "sonner";
import type { AppAxiosError } from "@/types/api/api.types";

export function usePoTypes() {
  return useQuery({
    queryKey: ["po-types"],
    queryFn: poTypesApi.getAll,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePoType() {
  const queryClient = useQueryClient();

  return useMutation<ReturnType<typeof poTypesApi.create> extends Promise<infer T> ? T : never, AppAxiosError, CreatePoTypeRequest>({
    mutationFn: poTypesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["po-types"] });
      toast.success("PO Type added");
    },
    onError: (error) => {
      const message = error.response?.data?.message || "Failed to add PO Type";
      toast.error("Error", { description: Array.isArray(message) ? message.join(". ") : message });
    },
  });
}

export function useDeactivatePoType() {
  const queryClient = useQueryClient();

  return useMutation<void, AppAxiosError, string>({
    mutationFn: (id: string) => poTypesApi.deactivate(id).then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["po-types"] });
      toast.success("PO Type deactivated");
    },
    onError: (error) => {
      const message = error.response?.data?.message || "Failed to deactivate PO Type";
      toast.error("Error", { description: Array.isArray(message) ? message.join(". ") : message });
    },
  });
}