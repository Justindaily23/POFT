import apiClient from "./axios";
import { tokenService } from "./tokenService";
import { useAuthStore } from "@/stores/authStore";

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

/**
 * Type-safe interface for the 'getCurrentUser' response
 * matches the AuthUser interface in your store.
 */
interface CurrentUserResponse {
  userData: {
    id: string;
    email: string;
    role: "SUPER_ADMIN" | "ADMIN" | "USER";
    name: string;
    mustChangePassword: boolean;
  };
  accessToken?: string;
}

export const authApi = {
  login: async (data: LoginRequest & { deviceId?: string }): Promise<LoginResponse> => {
    tokenService.clearToken();
    const response = await apiClient.post<LoginResponse>("/auth/login", data);
    const loginData = response.data;

    if (loginData.accessToken) {
      tokenService.setToken(loginData.accessToken);
    }

    return loginData;
  },

  /**
   * ✅ PRODUCTION LOGOUT
   * Ensures backend session is killed AND local state/storage is wiped.
   * Uses 'finally' to guarantee the user is logged out of the UI
   * even if the server is unreachable.
   */
  logout: async (): Promise<void> => {
    try {
      await apiClient.post("/auth/logout");
    } catch (error: unknown) {
      // Logic for logging the error if needed, without using 'any'
      console.error("Logout request failed:", error);
    } finally {
      // 1. Clear the Access Token from the token service
      tokenService.clearToken();

      // 2. Clear Zustand State & Persisted LocalStorage
      // Accesses the store state directly from outside a React component
      const store = useAuthStore.getState();
      store.clearAuth();

      // 3. Final safety cleanup of all possible storage keys
      localStorage.removeItem("token");
      localStorage.removeItem("auth-storage");

      // 4. Force a hard redirect to ensure all memory is cleared
      window.location.href = "/login";
    }
  },

  // frontend/src/api/auth/auth.api.ts

  resetPassword: async (newPassword: string): Promise<{ message: string }> => {
    // 1. No userId needed in arguments (Backend gets it from the Token)
    // 2. ONLY send newPassword in the body to satisfy the DTO
    const response = await apiClient.post("/auth/reset-password", {
      newPassword,
    });
    return response.data;
  },

  getCurrentUser: async (): Promise<CurrentUserResponse> => {
    const response = await apiClient.get<CurrentUserResponse>("/auth/me");
    return response.data;
  },

  forgotPasswordInitiate: async (email: string): Promise<{ message: string }> => {
    const response = await apiClient.post("/auth/forgot-password", { email });
    return response.data;
  },

  recoveryReset: async (
    id: string,
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> => {
    const response = await apiClient.post("/auth/reset-password-recovery", {
      id,
      token,
      newPassword,
    });
    return response.data;
  },
};
