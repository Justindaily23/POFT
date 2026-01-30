import apiClient from "./axios";

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    id: string;
    email: string;
    accessToken: string;
    role: "SUPER_ADMIN" | "ADMIN" | "PM" | "USER";
    mustChangePassword: boolean;
}

export const authApi = {
    login: async (data: LoginRequest & { deviceId?: string }): Promise<LoginResponse> => {
        const response = await apiClient.post("/auth/login", data);
        return response.data;
    },

    logout: async () => {
        await apiClient.post("/auth/logout");
        localStorage.removeItem("token");
    },

    resetPassword: async (oldPassword: string, newPassword: string) => {
        const response = await apiClient.post("/auth/reset-password", {
            oldPassword,
            newPassword,
        });
        return response.data;
    },

    getCurrentUser: async () => {
        const response = await apiClient.get("api/v1/auth/me");
        return response.data;
    },
};
