// src/hooks/useImportPO.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { importPurchaseOrders } from "@/features/poWorkspace/poWorkspace.api";
import { toast } from "@/hooks/use-toast";

export function useImportPO() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (file: File) => importPurchaseOrders(file),
        onSuccess: (result) => {
            // Invalidate to refresh the table
            queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });

            if (result.status === "SUCCESS") {
                toast({
                    title: "Import Successful",
                    description: `Successfully processed ${result.poSucceeded} POs (${result.linesProcessed} lines).`,
                });
            } else {
                // PARTIAL success (some rows failed)
                toast({
                    variant: "destructive",
                    title: "Import Completed with Errors",
                    description: `${result.poFailed} POs failed to import. See details below.`,
                });
            }
        },
        onError: (error: any) => {
            const message = error?.response?.data?.message || "Connection to server failed";
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: message,
            });
        },
    });
}
