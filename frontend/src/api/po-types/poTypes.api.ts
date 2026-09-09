import apiClient from "@/api/auth/axios";

export interface PoType {
  id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreatePoTypeRequest {
  name: string;
  description: string;
}

export const poTypesApi = {
  getAll: async (): Promise<PoType[]> => {
    const response = await apiClient.get<PoType[]>("/po-types");
    return response.data;
  },

  create: async (data: CreatePoTypeRequest): Promise<PoType> => {
    const response = await apiClient.post<PoType>("/po-types", data);
    return response.data;
  },

  deactivate: async (id: string): Promise<PoType> => {
    const response = await apiClient.patch<PoType>(`/po-types/${id}/deactivate`);
    return response.data;
  },
};