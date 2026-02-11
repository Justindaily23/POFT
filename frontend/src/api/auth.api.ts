import apiClient from "./axios";
import { tokenService } from "./tokenService";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  id: string;
  email: string;
  accessToken: string;
  role: "SUPER_ADMIN" | "ADMIN" | "USER";
  mustChangePassword: boolean;
}

export const authApi = {
  login: async (data: LoginRequest & { deviceId?: string }): Promise<LoginResponse> => {
    tokenService.clearToken(); // clear old token first
    const response = await apiClient.post("/auth/login", data);
    const loginData = response.data;

    // Save the accessToken for future requests
    if (loginData.accessToken) {
      tokenService.setToken(loginData.accessToken);
    }

    return loginData;
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
    const response = await apiClient.get("/auth/me");
    return response.data;
  },
};
