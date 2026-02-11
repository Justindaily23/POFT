import apiClient from "@/api/axios";
import type { AdminFundRequestFilters, FundRequestResponseDto } from "./fundRequest.type";
import type { CreateFundRequestInput } from "./schema";
import { tokenService } from "@/api/tokenService";

export const fundRequestApi = {
  searchByDuidOrPoNumber: async (query: string): Promise<FundRequestResponseDto[]> => {
    if (!query.trim()) return []; // Don't search if string is empty

    const response = await apiClient.get("/fund-requests/search", {
      params: { query: query.trim() }, // Using params object is cleaner for encoding
    });
    return response.data;
  },

  submitRequest: async (data: CreateFundRequestInput): Promise<FundRequestResponseDto> => {
    // We adjust the endpoint here
    const token = tokenService.getToken();
    console.log("Token being sent:", token);

    const response = await apiClient.post("/fund-requests/submit", data);
    return response.data;
  },

  // Add the call to get summary data for a specific PO line
  getLineSummary: async (
    poLineNumber: string,
  ): Promise<{ totalApproved: number; contractAmount: number }> => {
    // This endpoint must exist on your backend
    const response = await apiClient.get(`/po-summary/${poLineNumber}`);
    return response.data;
  },

  getRequestsByDuidAndPoLine: async (PoLineId: string): Promise<FundRequestResponseDto[]> => {
    const response = await apiClient.get(`/fund-requests/history/${PoLineId}`);
    return response.data;
  },

  // Fetch all fund requests for PM / USER
  getAllPmRequests: async (): Promise<FundRequestResponseDto[]> => {
    const response = await apiClient.get("/fund-requests");
    return response.data;
  },

  approve: async (fundRequestId: string): Promise<FundRequestResponseDto> => {
    const response = await apiClient.post(`/fund-requests/${fundRequestId}/approve`);
    return response.data;
  },

  reject: async (fundRequestId: string, reason: string): Promise<FundRequestResponseDto> => {
    const response = await apiClient.post(`/fund-requests/${fundRequestId}/reject`, {
      rejectionReason: reason,
    });
    return response.data;
  },

  getAllAdminRequests: async (): Promise<FundRequestResponseDto[]> => {
    const response = await apiClient.get("/admin/fund-requests");
    return response.data;
  },

  /**
   * Fetch all admin fund requests with optional filters
   */
  fetchAdminFundRequests: async (
    filters?: AdminFundRequestFilters,
  ): Promise<FundRequestResponseDto[]> => {
    const query = new URLSearchParams();

    if (filters?.search) query.append("search", filters.search);
    if (filters?.status) query.append("status", filters.status);

    // Use Optional Chaining (?.) to prevent crashes
    if (filters?.startDate) {
      query.append("startDate", filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      query.append("endDate", filters.endDate.toISOString());
    }

    const { data } = await apiClient.get<FundRequestResponseDto[]>("/fund-requests", {
      params: filters,
    });

    return data;
  },
};
