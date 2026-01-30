// src/hooks/useImportPO.ts
import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { importPurchaseOrders } from "@/features/poWorkspace/poWorkspace.api";
import type { ImportResult } from "@/lib/po-workspace/types";
import { toast } from "@/components/ui/use-toast";

export function useImportPO(): UseMutationResult<ImportResult, any, File, unknown> {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (file: File) => importPurchaseOrders(file),
        onSuccess: (result: ImportResult) => {
            queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });

            // Only show import summary
            toast({
                title: `PO Import complete: ${result.poSucceeded} succeeded, ${result.poFailed} failed.`,
                description: `${result.linesCreated} lines created, ${result.linesUpdated} updated.`,
            });
        },
        onError: (error: any) => {
            console.error("PO Import failed", error);

            // Show error toast
            toast({
                title: "PO Import failed",
                description: error?.message || "Unknown error",
            });
        },
    });
}
