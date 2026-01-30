import apiClient from "@/api/axios";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query"; // 1. Add TanStack Query

export default function ResetPasswordPage() {
    const { clearAuth } = useAuthStore();
    const navigate = useNavigate();
    const { toast } = useToast(); // 2. Fix useToast call

    const [formData, setFormData] = useState({
        newPassword: "",
        confirmPassword: "",
    });

    // 3. Centralized Mutation logic (Synchronized with NestJS backend)
    const resetMutation = useMutation({
        mutationFn: async (newPassword: string) => {
            // No manual headers needed; axios interceptor handles 'Bearer token'
            // Payload key 'newPassword' matches your NestJS ResetPasswordDto
            const { data } = await apiClient.post("auth/reset-password", {
                newPassword,
            });
            return data;
        },
        onSuccess: (data) => {
            toast({
                title: "Success",
                description: data.message || "Password updated. Please log in again.",
            });
            clearAuth(); // Invalidate old session
            navigate("/login", { replace: true });
        },
        onError: (err: any) => {
            toast({
                variant: "destructive",
                title: "Reset Failed",
                description: err.response?.data?.message || "Failed to reset password",
            });
        },
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Client-side safety check
        if (formData.newPassword !== formData.confirmPassword) {
            toast({
                variant: "destructive",
                description: "Passwords do not match",
            });
            return;
        }

        resetMutation.mutate(formData.newPassword);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md bg-white rounded-lg shadow-sm p-8">
                <h2 className="text-2xl font-semibold text-gray-900 text-center mb-6">Reset Password</h2>

                <form className="space-y-5" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                            New Password
                        </label>
                        <input
                            id="newPassword"
                            name="newPassword" // Changed to match state
                            type="password"
                            required
                            value={formData.newPassword}
                            onChange={handleChange}
                            className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                            Confirm Password
                        </label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            required
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                    </div>

                    {/* Server Error Message from NestJS */}
                    {resetMutation.isError && (
                        <div className="rounded-md bg-red-50 border border-red-200 p-3">
                            <p className="text-sm text-red-600">
                                {(resetMutation.error as any)?.response?.data?.message || "An error occurred"}
                            </p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={resetMutation.isPending}
                        className={cn(
                            "w-full flex items-center justify-center px-4 py-2.5 rounded-md text-sm font-medium",
                            "bg-blue-600 text-white hover:bg-blue-700",
                            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                            "transition-colors duration-200",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                        )}
                    >
                        {resetMutation.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Resetting...
                            </>
                        ) : (
                            "Reset Password"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
