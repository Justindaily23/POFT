import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "sonner";
import { Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { authApi } from "@/api/auth/auth.api";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppAxiosError } from "@/types/api/api.types";

// 1. Unified Validation Schema
const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const { clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  // 2. Standardized Form Hook
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  // 3. Unified Mutation Hook
  const resetMutation = useMutation({
    mutationFn: (data: ResetPasswordValues) => authApi.resetPassword("", data.newPassword),
    onSuccess: () => {
      toast.success("Security Update Successful", {
        description: "Your password has been changed. Please log in again.",
      });
      clearAuth(); // Wipes local state and storage
      navigate("/login", { replace: true });
    },
    onError: (error: AppAxiosError) => {
      const message = error.response?.data?.message || "Failed to update password";
      toast.error("Update Error", { description: Array.isArray(message) ? message[0] : message });
    },
  });

  const onSubmit = (data: ResetPasswordValues) => {
    resetMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 font-sans">
      <Toaster richColors position="top-right" />

      {/* Stecam Ops Branding */}
      <div className="mb-8 flex items-center gap-2 font-bold text-xl text-slate-900 uppercase tracking-tight">
        <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <span>
          Stecam<span className="text-blue-600">Ops</span>
        </span>
      </div>

      <Card className="w-full max-w-100 shadow-xl border-slate-100 rounded-2xl bg-white">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-black text-slate-900">Security Update</CardTitle>
          <CardDescription className="text-slate-500">
            Enter a new secure password for your Stecam account.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* New Password Field */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                New Password
              </label>
              <div className="relative">
                <Input
                  {...register("newPassword")}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-11 rounded-xl border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-300 hover:text-slate-500"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-[10px] font-bold text-red-500 italic">
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Confirm New Password
              </label>
              <Input
                {...register("confirmPassword")}
                type="password"
                placeholder="••••••••"
                className="h-11 rounded-xl border-slate-200"
              />
              {errors.confirmPassword && (
                <p className="text-[10px] font-bold text-red-500 italic">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={resetMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 h-12 font-bold rounded-xl shadow-blue-100"
            >
              {resetMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating Security...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
