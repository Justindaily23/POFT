// import apiClient from "@/api/axios";
// import { useAuthStore } from "@/features/auth/stores/authStore";
// import { useToast } from "@/hooks/use-toast";
// import { cn } from "@/lib/utils";
// import { Loader2 } from "lucide-react";
// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { useMutation } from "@tanstack/react-query";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { ShieldCheck, Eye, EyeOff } from "lucide-react"; // Enterprise icons

// export default function ResetPasswordPage() {
//     const { clearAuth } = useAuthStore();
//     const navigate = useNavigate();
//     const { toast } = useToast();
//     const [formData, setFormData] = useState({
//         newPassword: "",
//         confirmPassword: "",
//     });

//     // Centralized Mutation logic (Synchronized with NestJS backend)
//     const resetMutation = useMutation({
//         mutationFn: async (newPassword: string) => {
//             // No manual headers needed; axios interceptor handles 'Bearer token'
//             // Payload key 'newPassword' matches your NestJS ResetPasswordDto
//             const { data } = await apiClient.post("auth/reset-password", {
//                 newPassword,
//             });
//             return data;
//         },
//         onSuccess: (data) => {
//             toast({
//                 title: "Success",
//                 description: data.message || "Password updated. Please log in again.",
//             });
//             clearAuth(); // Invalidate old session
//             navigate("/login", { replace: true });
//         },
//         onError: (error: any) => {
//             // 1. Extract message from NestJS response
//             const rawMessage = error.response?.data?.message || "An unexpected error occurred";

//             // 2. Format message (handles strings or arrays from NestJS)
//             const displayMessage = Array.isArray(rawMessage) ? rawMessage.join(", ") : rawMessage;

//             toast({
//                 variant: "destructive", // This makes it the Red Box
//                 title: "Registration Failed",
//                 description: displayMessage,
//             });
//         },
//     });

//     const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         const { name, value } = e.target;
//         setFormData((prev) => ({ ...prev, [name]: value }));
//     };

//     const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();

//         // Client-side safety check
//         if (formData.newPassword !== formData.confirmPassword) {
//             toast({
//                 variant: "destructive",
//                 description: "Passwords do not match",
//             });
//             return;
//         }

//         resetMutation.mutate(formData.newPassword);
//     };

// return (
//   <div className="min-h-screen flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-white to-white px-4">
//     {/* Branding/Logo could go here */}
//     <div className="mb-8 flex items-center gap-2 font-bold text-xl tracking-tighter">
//       <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
//         <ShieldCheck className="h-5 w-5" />
//       </div>
//       <span>Nexus<span className="text-blue-600">Secure</span></span>
//     </div>

//     <Card className="w-full max-w-[400px] shadow-2xl shadow-slate-200/50 border-slate-100/60">
//       <CardHeader className="space-y-1">
//         <CardTitle className="text-2xl text-center tracking-tight">Security Update</CardTitle>
//         <CardDescription className="text-center">
//           Please choose a strong password to protect your account.
//         </CardDescription>
//       </CardHeader>

//       <CardContent>
//         <form onSubmit={handleSubmit} className="space-y-4">
//           <div className="space-y-2">
//             <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">New Password</label>
//             <Input
//               name="newPassword"
//               type="password"
//               placeholder="••••••••"
//               className="bg-slate-50/50 border-slate-200 focus-visible:ring-blue-500"
//             />
//           </div>

//           <div className="space-y-2">
//             <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Confirm New Password</label>
//             <Input
//               name="confirmPassword"
//               type="password"
//               placeholder="••••••••"
//               className="bg-slate-50/50 border-slate-200 focus-visible:ring-blue-500"
//             />
//           </div>

//           <Button
//             className="w-full bg-blue-600 hover:bg-blue-700 h-11 transition-all"
//             disabled={resetMutation.isPending}
//           >
//              {resetMutation.isPending ? <Loader2 className="animate-spin" /> : "Update Password"}
//           </Button>
//         </form>
//       </CardContent>
//     </Card>

//     <p className="mt-6 text-sm text-slate-400">
//       Need help? <a href="#" className="text-blue-600 hover:underline">Contact Security Support</a>
//     </p>
//   </div>
// );
// }

import apiClient from "@/api/axios";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
    const { clearAuth } = useAuthStore();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        newPassword: "",
        confirmPassword: "",
    });

    // Centralized Mutation logic (Synchronized with NestJS backend)
    const resetMutation = useMutation({
        mutationFn: async (newPassword: string) => {
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
            clearAuth();
            navigate("/login", { replace: true });
        },
        onError: (error: any) => {
            const rawMessage = error.response?.data?.message || "An unexpected error occurred";
            const displayMessage = Array.isArray(rawMessage) ? rawMessage.join(", ") : rawMessage;

            toast({
                variant: "destructive",
                title: "Reset Failed",
                description: displayMessage,
            });
        },
    });

    // CRITICAL: Restored this function to handle typing
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

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
        <div className="min-h-screen flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-slate-100 via-white to-white px-4">
            {/* Branding/Logo */}
            <div className="mb-8 flex items-center gap-2 font-bold text-xl tracking-tighter text-slate-900">
                <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                    <ShieldCheck className="h-6 w-6" />
                </div>
                <span>
                    Stecam<span className="text-blue-600">Secure</span>
                </span>
            </div>

            <Card className="w-full max-w-100 shadow-2xl shadow-slate-200/50 border-slate-100/60">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl text-center tracking-tight font-bold">Security Update</CardTitle>
                    <CardDescription className="text-center text-slate-500">
                        Please choose a strong password to protect your account.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">New Password</label>
                            <div className="relative">
                                <Input
                                    name="newPassword"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    placeholder="••••••••"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                    className="h-11 bg-slate-50/50 border-slate-200 focus-visible:ring-blue-500 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Confirm New Password</label>
                            <Input
                                name="confirmPassword"
                                type="password"
                                required
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="h-11 bg-slate-50/50 border-slate-200 focus-visible:ring-blue-500 transition-all"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 h-11 transition-all shadow-md shadow-blue-100 font-semibold"
                            disabled={resetMutation.isPending}
                        >
                            {resetMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                "Update Password"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <p className="mt-8 text-sm text-slate-400">
                Need help?{" "}
                <a href="#" className="text-blue-600 font-medium hover:underline transition-colors">
                    Contact Security Support
                </a>
            </p>
        </div>
    );
}
