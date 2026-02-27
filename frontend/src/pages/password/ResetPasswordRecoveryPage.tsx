import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/api/auth/auth.api";
import { toast, Toaster } from "sonner";
import { ShieldCheck, Lock, CheckCircle2, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { AppAxiosError } from "@/types/api/api.types";

// 1. Validation Schema
const recoverySchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RecoveryValues = z.infer<typeof recoverySchema>;

export default function ResetPasswordRecoveryPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const tokenId = searchParams.get("id");
  const tokenSecret = searchParams.get("token");

  // 2. Standardized Form Hook
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RecoveryValues>({
    resolver: zodResolver(recoverySchema),
  });

  // ✅ "Eat" the refs to avoid the Function Component Warning
  const { ref: _pRef, ...passwordProps } = register("password");
  const { ref: _cpRef, ...confirmProps } = register("confirmPassword");

  // 3. Standardized Mutation Hook
  const recoveryMutation = useMutation({
    mutationFn: (data: RecoveryValues) => {
      if (!tokenId || !tokenSecret) throw new Error("Invalid reset link");
      return authApi.recoveryReset(tokenId, tokenSecret, data.password);
    },
    onSuccess: () => {
      toast.success("Security Restored", {
        description: "Your password has been updated. You can now log in.",
      });
    },
    onError: (error: AppAxiosError | Error) => {
      const message = (error as AppAxiosError).response?.data?.message || error.message;
      toast.error("Recovery Failed", {
        description: Array.isArray(message) ? message.join(", ") : message,
      });
    },
  });

  const onSubmit = (data: RecoveryValues) => {
    recoveryMutation.mutate(data);
  };

  if (recoveryMutation.isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <Toaster richColors position="top-right" />
        <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl text-center space-y-6 border border-slate-100">
          <div className="h-16 w-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-900">All Set!</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Your password has been successfully updated. Your account is now secure.
          </p>
          <Button
            onClick={() => navigate("/login")}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            Go to Login <ArrowRight size={18} />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans text-slate-900">
      <Toaster richColors position="top-right" />
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 mb-4">
          <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">Stecam Ops</h1>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Recovery Reset</h2>
          <p className="text-xs text-slate-500 mb-6 font-medium">
            Please enter a strong new password for your account.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-300 z-10" />
                <Input
                  {...passwordProps}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 h-11 rounded-xl border-slate-200 focus-visible:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-300 hover:text-slate-500"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[10px] font-bold text-red-500 italic">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-300 z-10" />
                <Input
                  {...confirmProps}
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-11 rounded-xl border-slate-200 focus-visible:ring-blue-600"
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-[10px] font-bold text-red-500 italic">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={recoveryMutation.isPending}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-100 rounded-xl transition-all"
            >
              {recoveryMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying Token...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
