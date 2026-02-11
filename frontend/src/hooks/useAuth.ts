import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import apiClient from "@/api/axios";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { useToast } from "@/hooks/use-toast";
import { tokenService } from "@/api/tokenService";

export const useAuth = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const setAuth = useAuthStore((state) => state.setAuth);

    return useMutation({
        mutationFn: async (formData: any) => {
            // NestJS: returns { id, role, email, mustChangePassword, accessToken }
            const { data } = await apiClient.post("auth/login", formData);
            return data;
        },
        onSuccess: (data) => {
            // 1. Map backend response to store
            // 1. Destructure to separate the token from the rest of the user data
            // This removes 'accessToken' so it isn't passed inside the 'user' object
            const { accessToken, ...userData } = data;

            tokenService.setToken(accessToken);

            setAuth({
                token: data.accessToken, // Matches NestJS 'accessToken'
                user: {
                    id: userData.id,
                    email: userData.email,
                    role: userData.role,
                    mustChangePassword: userData.mustChangePassword,
                },
            });

            // 2. SIMPLIFY: Just go to the root!
            // App.tsx is already watching the "/" path with RoleBasedRedirect.
            // It will see the new 'role' in the store and send the user to the right place.
            navigate("/", { replace: true });
        },
        onError: (error: any) => {
            // 1. Get the raw message (could be a string OR an array of strings)
            const rawMessage = error.response?.data?.message || "Login failed";

            // 2. Convert to a string so the Toast can actually display it
            const displayMessage = Array.isArray(rawMessage)
                ? rawMessage[0] // Take the first error (e.g., "Email is required")
                : rawMessage;

            toast({
                variant: "destructive",
                title: "Authentication Failed",
                description: displayMessage, // Now it will show!
            });
        },
    });
};
