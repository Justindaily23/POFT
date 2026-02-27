// // @/hooks/po-workspace/useImportPO.ts
// import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// import { poWorkspaceApi } from "@/api/po-workspace/poWorkspace.api";
// import { toast } from "sonner";
// import type { AppAxiosError } from "@/types/api/api.types";
// import type { PoImportHistoryItem } from "@/types/po-workspace/types";

// // Define the shape of your successful import result
// interface ImportSuccessResult {
//   status: string;
//   poSucceeded: number;
//   poFailed: number;
//   linesProcessed: number;
//   errors?: string[];
// }

// export function useImportPO() {
//   const queryClient = useQueryClient();

//   // Passing generics: <ResponseData, ErrorType, VariablesType>
//   return useMutation<ImportSuccessResult, AppAxiosError, File>({
//     mutationFn: (file: File) => poWorkspaceApi.importPurchaseOrders(file),
//     onSuccess: (result) => {
//       queryClient.invalidateQueries({ queryKey: ["po-workspace"] });

//       if (result.status === "SUCCESS") {
//         toast.success("Import Successful", {
//           description: `Processed ${result.poSucceeded} POs (${result.linesProcessed} lines).`,
//         });
//       } else {
//         const errorDetail = result.errors?.length
//           ? result.errors.slice(0, 2).join(", ") + (result.errors.length > 2 ? "..." : "")
//           : `${result.poFailed} POs failed validation.`;

//         toast.warning("Import Completed with Issues", {
//           description: errorDetail,
//           duration: 5000,
//         });
//       }
//     },
//     onError: (error) => {
//       // ✅ Removed 'any'. Now 'error' is typed as AppAxiosError
//       const serverMsg = error.response?.data?.message;
//       const fullMessage = Array.isArray(serverMsg)
//         ? serverMsg.join(". ")
//         : serverMsg || "Connection to server failed";

//       toast.error("Upload Failed", { description: fullMessage });
//     },
//   });
// }

// // @/hooks/purchase-order/useImportHistory.ts
// export function useImportHistory() {
//   return useQuery<PoImportHistoryItem[]>({
//     queryKey: ["po-import-history"],
//     queryFn: () => poWorkspaceApi.getImportHistory(),
//   });
// }

// @/hooks/po-workspace/useImportPO.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { poWorkspaceApi } from "@/api/po-workspace/poWorkspace.api";
import { toast } from "sonner";
import type { AppAxiosError } from "@/types/api/api.types";
import type { ImportResult } from "@/types/po-workspace/types"; // Use the shared type

export function useImportPO() {
  const queryClient = useQueryClient();

  return useMutation<ImportResult, AppAxiosError, File>({
    mutationFn: (file: File) => poWorkspaceApi.importPurchaseOrders(file),
    onSuccess: (result) => {
      // Refresh both the main workspace and the sidebar history
      queryClient.invalidateQueries({ queryKey: ["po-workspace"] });
      queryClient.invalidateQueries({ queryKey: ["po-import-history"] });

      if (result.status === "SUCCESS") {
        toast.success("Import Successful", {
          description: `Processed ${result.poSucceeded} POs (${result.linesProcessed} lines).`,
        });
      } else {
        const errorDetail = result.errors?.length
          ? result.errors.slice(0, 2).join(", ") + (result.errors.length > 2 ? "..." : "")
          : `${result.poFailed} POs failed validation.`;

        toast.warning("Import Completed with Issues", {
          description: errorDetail,
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
  return useQuery({
    queryKey: ["po-import-history"],
    queryFn: () => poWorkspaceApi.getImportHistory(),
    // TypeScript automatically knows the result is PoImportHistoryItem[]
    // because of your API definition.
  });
}
