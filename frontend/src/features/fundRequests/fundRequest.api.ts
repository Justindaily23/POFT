import apiClient from "@/api/axios";
import type { FundRequestResponse } from "./fundRequest.type";
import type { CreateFundRequestInput, FundRequest } from "./fundRequest.schema";

export const fundRequestApi = {
    // Make fund request
    // create: async (data: FundRequestData): Promise<FundRequestResponse> => {
    //     const response = await apiClient.post("/fund-requests", data);
    //     return response.data;
    // },

    submitRequest: async (data: CreateFundRequestInput): Promise<FundRequest> => {
        // We adjust the endpoint here
        const response = await apiClient.post("/fund-requests", data);
        return response.data;
    },

    // Add the call to get summary data for a specific PO line
    getLineSummary: async (poLineNumber: string): Promise<{ totalApproved: number; contractAmount: number }> => {
        // This endpoint must exist on your backend
        const response = await apiClient.get(`/api/po-summary/${poLineNumber}`);
        return response.data;
    },

    getRequestsByDuidAndPoLine: async (duid: string, poLineNumber: string): Promise<FundRequest[]> => {
        const response = await apiClient.get(`/fund-requests/history?duid=${duid}&poLineNumber=${poLineNumber}`);
        return response.data;
    },

    // Fetch all fund requests for PM / USER
    getAllPmRequests: async (): Promise<FundRequestResponse[]> => {
        const response = await apiClient.get("/fund-requests");
        return response.data;
    },

    // Fetch by DUID or PO Number (for search)
    searchByDuidOrPoNumber: async (query: string): Promise<FundRequestResponse[]> => {
        const response = await apiClient.get(`/fund-requests/search?query=${query}`);
        return response.data;
    },

    approve: async (fundRequestId: string): Promise<FundRequestResponse> => {
        const response = await apiClient.post(`/fund-requests/${fundRequestId}/approve`);
        return response.data;
    },

    reject: async (fundRequestId: string, reason: string): Promise<FundRequestResponse> => {
        const response = await apiClient.post(`/fund_requests/${fundRequestId}/reject`, { rejectionReason: reason });
        return response.data;
    },

    getAllAdminRequests: async (): Promise<FundRequestResponse[]> => {
        const response = await apiClient.get("/admin/fund-requests");
        return response.data;
    },
};
