// @/api/po-workspace/index.ts
import apiClient from "@/api/auth/axios";
import type {
  FilterState,
  PurchaseOrderLine,
  FinancialMetrics,
  ImportResult,
  PoImportHistoryItem,
} from "@/types/po-workspace/types";

export const poWorkspaceApi = {
  // 1. Fetch main table data
  getWorkSpaceData: async (filters: FilterState) => {
    const response = await apiClient.get<{
      data: PurchaseOrderLine[];
      metrics: FinancialMetrics;
      totalCount: number;
      nextCursor: string | null;
    }>("/po-workspace", { params: filters });
    return response.data;
  },

  // 2. Update status (Admin/Super Admin only)
  updatePoLineStatus: async (id: string, status: string) => {
    const response = await apiClient.patch(`/po-workspace/po-line/${id}/status`, {
      status,
    });
    return response.data;
  },

  // 3. Import functionality
  importPurchaseOrders: async (file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<ImportResult>("/purchase-orders/import", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  },

  // 4. Fetch Import History (New)
  getImportHistory: async (limit = 50): Promise<PoImportHistoryItem[]> => {
    const { data } = await apiClient.get<PoImportHistoryItem[]>("/purchase-orders/history", {
      params: { limit },
    });
    return data;
  },
};
