import { useMutation } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { AxiosError } from "axios";
import { toast } from "sonner";

import apiClient from "@/api/auth/axios";
import { useAuthStore } from "@/stores/authStore";
import { tokenService } from "@/api/auth/tokenService";
import type { LoginRequest, LoginResponse, ApiError } from "@/types/api/api.types";

// Helper to convert "justin faith" to "Justin Faith"
const toTitleCase = (str: string) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const useAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);

  // 2. Identify the "intended destination" or default to "/"
  const from = location.state?.from?.pathname || "/";

  return useMutation<LoginResponse, AxiosError<ApiError>, LoginRequest>({
    mutationFn: async (formData: LoginRequest) => {
      const { data } = await apiClient.post<LoginResponse>("auth/login", formData);
      return data;
    },
    onSuccess: (data) => {
      const { accessToken, ...userData } = data;

      // 🍬 Convert the raw name to Title Case for a professional UI
      const cleanName = toTitleCase(userData.name || "User");

      tokenService.setToken(accessToken);

      setAuth({
        token: accessToken, // Note: Use the destructured accessToken or data.accessToken
        user: {
          id: userData.id,
          email: userData.email,
          role: userData.role,
          name: cleanName, // Stored as "Justin Faith"
          mustChangePassword: userData.mustChangePassword,
        },
      });

      toast.success("Welcome back!", {
        description: `Signed in as ${cleanName}`, // Displays "Justin Faith"
      });

      navigate(from, { replace: true });
    },
    onError: (error) => {
      const rawMessage = error.response?.data?.message;
      const displayMessage = Array.isArray(rawMessage) ? rawMessage.join(". ") : rawMessage;

      toast.error("Authentication Failed", {
        description: displayMessage,
      });
    },
  });
};
