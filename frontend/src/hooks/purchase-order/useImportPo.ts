// @/hooks/po-workspace/useImportPO.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { poWorkspaceApi } from "@/api/po-workspace/poWorkspace.api";
import { toast } from "sonner";
import type { AppAxiosError } from "@/types/api/api.types";
import type { ImportResult, PoImportHistoryItem } from "@/types/po-workspace/types";

export function useImportPO() {
  const queryClient = useQueryClient();

  return useMutation<ImportResult, AppAxiosError, File>({
    mutationFn: (file: File) => poWorkspaceApi.importPurchaseOrders(file),
    onSuccess: (result) => {
      // Refresh the history immediately to show the "Pending" row in the sidebar
      queryClient.invalidateQueries({ queryKey: ["po-import-history"] });

      // ACTIVITY 1: Handle the immediate response from the controller
      if (result.status === "PENDING") {
        toast.info("Import Started", {
          description: "Processing your file in the background. Check the Log for updates.",
        });
        return; // Don't show success/error counts yet as they are still 0
      }

      // FALLBACK: Handle if the backend processes small files synchronously
      if (result.status === "SUCCESS") {
        queryClient.invalidateQueries({ queryKey: ["po-workspace"] });
        toast.success("Import Successful", {
          description: `Processed ${result.poSucceeded} POs (${result.linesProcessed} lines).`,
        });
      }
    },
    onError: (error) => {
      const serverMsg = error.response?.data?.message;
      const fullMessage = Array.isArray(serverMsg)
        ? serverMsg.join(". ")
        : serverMsg || "Connection to server failed";

      toast.error("Upload Failed", { description: fullMessage });
    },
  });
}

export function useImportHistory() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["po-import-history"],
    queryFn: () => poWorkspaceApi.getImportHistory(),
    // AUTO-POLLING: If any item is "PENDING", refresh every 3 seconds
    refetchInterval: (query) => {
      const history = query.state.data as PoImportHistoryItem[];
      const isStillProcessing = history?.some((item) => item.status === "PENDING");

      if (!isStillProcessing && history?.length > 0) {
        // Once processing finishes, make sure the main workspace also refreshes
        queryClient.invalidateQueries({ queryKey: ["po-workspace"] });
      }

      return isStillProcessing ? 3000 : false;
    },
  });
}
