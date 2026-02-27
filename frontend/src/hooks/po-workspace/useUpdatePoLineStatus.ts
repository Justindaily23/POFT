// @/hooks/po-workspace/useUpdatePoLineStatus.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { poWorkspaceApi } from "@/api/po-workspace/poWorkspace.api";
import { AxiosError } from "axios";

export const useUpdatePoLineStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      poWorkspaceApi.updatePoLineStatus(id, status),
    onSuccess: () => {
      // Matches the key used in your main table query
      queryClient.invalidateQueries({ queryKey: ["poWorkspace"] });
    },
    onError: (error: AxiosError<{ message: string | string[] }>) => {
      const serverMsg = error.response?.data?.message;

      // 🛡️ PRODUCTION LOGIC: Read ALL messages if it's an array (NestJS DTO validation)
      const fullMessage = Array.isArray(serverMsg)
        ? serverMsg.join(". ")
        : serverMsg || "Failed to update status";

      toast.error("Update Failed", { description: fullMessage });
    },
  });
};
