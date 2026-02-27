import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link } from "react-router-dom";
import { authApi } from "@/api/auth/auth.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShieldCheck, ArrowLeft, Mail, Loader2 } from "lucide-react";

// 1. Validation Schema
const forgotSchema = z.object({
  email: z.string().email({ message: "Please enter a valid work email" }),
});

type ForgotPasswordValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  // 2. Setup Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" }, // Ensures the field starts as a string, not undefined
  });

  const onSubmit = async (data: ForgotPasswordValues) => {
    setIsLoading(true);
    try {
      await authApi.forgotPasswordInitiate(data.email);
      setIsSent(true);
      toast.success("Reset link dispatched");
    } catch {
      // Security standard: don't reveal if email exists or not
      setIsSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-100 space-y-6">
        {/* Branding */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
            Stecam Ops
          </h1>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
          {!isSent ? (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">Forgot Password?</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Enter your email and we'll send you a recovery link.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 z-10" />
                    <Input
                      {...register("email")} // ✅ Standard spread now works perfectly
                      type="email"
                      placeholder="name@stecam.com"
                      className="pl-10 h-11 rounded-xl border-slate-200"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[10px] font-bold text-red-500 italic px-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 font-bold rounded-xl"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center py-4 space-y-4">
              <div className="h-14 w-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                <Mail size={28} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Check your Email</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                If an account exists, we've sent a link to your inbox.
              </p>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <Link
              to="/login"
              className="text-sm font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
