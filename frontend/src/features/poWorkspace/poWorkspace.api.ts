import apiClient from "@/api/axios";
import type { FilterState, PurchaseOrderLine, FinancialMetrics, ImportResult } from "@/lib/po-workspace/types";

export const poWorkspaceApi = {
    getWorkSpaceData: async (filters: FilterState) => {
        const response = await apiClient.get<{
            data: PurchaseOrderLine[];
            metrics: FinancialMetrics;
            totalCount: number;
        }>("/po-workspace", { params: filters });
        return response.data;
    },
};

export const importPurchaseOrders = async (file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<ImportResult>("/purchase-orders/import", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return response.data; // ✅ unwrap Axios response
};
