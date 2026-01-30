import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster"; // Ensure this matches your folder structure
import LoginPage from "@/features/login/LoginPage";
import ResetPasswordPage from "@/features/login/ResetPasswordPage";
import POFinancialWorkspace from "@/features/poWorkspace/PoWorkspacePage";
import RootLayout from "@/components/layout";
import { authApi } from "@/api/auth.api";
import PmRequestPage from "./features/fundRequests/pms/PmFundRequestPage";
import AdminFundRequestDashboard from "./features/fundRequests/admins/adminFundRequestDashboard";
import { AdminLayout } from "./components/layout/AdminLayout";

function App() {
    const { isAuthenticated, user, setAuth, clearAuth } = useAuthStore();

    /**
     * INITIAL PERSISTENCE:
     * When the app starts, check if a token exists and fetch the user.
     * This ensures the user stays logged in after a page refresh.
     */
    useEffect(() => {
        const loadUser = async () => {
            const token = useAuthStore.getState().token;

            if (!token) {
                useAuthStore.getState().finishLoading();
                return;
            }

            try {
                // This API call must use your axios apiClient with the interceptor
                const { userData, accessToken } = await authApi.getCurrentUser();
                setAuth({ token: accessToken, user: userData });
            } catch (error) {
                console.error("Session verification failed:", error);
                clearAuth(); // This clears localStorage and state
            } finally {
                // CRITICAL: This allows ProtectedRoute to finally render
                useAuthStore.getState().finishLoading();
            }
        };

        loadUser();
    }, [setAuth, clearAuth]);

    return (
        <>
            <Routes>
                {/* PUBLIC ROUTES */}
                <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />

                {/* Admin Desktop Dashboard 
                <Route path="/admin/fund-requests" element={<AdminFundRequestDashboard />} />
                <Route path="/fund-request/new" element={<PmRequestPage />} />
                */}
                {/* 1. ADMIN ONLY AREA */}
                <Route
                    element={
                        <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
                            <RootLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route element={<AdminLayout />}>
                        <Route path="/admin/fund-requests" element={<AdminFundRequestDashboard />} />
                        <Route path="/fund-request/new" element={<PmRequestPage />} />
                        <Route path="/workspace" element={<POFinancialWorkspace />} />
                        <Route path="/admin" element={<div>Admin Dashboard</div>} />
                    </Route>
                </Route>

                {/* PM  */}
                <Route
                    path="/pm"
                    element={
                        <ProtectedRoute allowedRoles={["PM", "USER"]}>
                            <div>PM Dashboard</div>
                        </ProtectedRoute>
                    }
                />

                {/* 3. SECURITY: RESET PASSWORD */}
                <Route
                    path="/reset-password"
                    element={
                        <ProtectedRoute>
                            <ResetPasswordPage />
                        </ProtectedRoute>
                    }
                />

                {/* 4. ROOT REDIRECTOR */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <RoleBasedRedirect user={user} />
                        </ProtectedRoute>
                    }
                />

                {/* 404/FALLBACK */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* GLOBAL FEEDBACK: Required for useToast() to display popups */}
            <Toaster />
        </>
    );
}

/**
 * REDIRECTION LOGIC
 * Links roles from NestJS to React Router paths.
 */
interface RoleRedirectProps {
    user: { role?: string; mustChangePassword?: boolean } | null;
}

function RoleBasedRedirect({ user }: RoleRedirectProps) {
    // Access the loading state to prevent premature redirection
    const isInitialLoading = useAuthStore((state) => state.isInitialLoading);

    // 1. If we are still verifying the token, DO NOT redirect
    if (isInitialLoading) return null;

    // 2. Only redirect to login if we are CERTAIN there is no user
    if (!user) return <Navigate to="/login" replace />;

    // 3. Force Reset if required by Backend
    if (user.mustChangePassword) {
        return <Navigate to="/reset-password" replace />;
    }

    // 4. Role-based paths
    const role = user.role;
    switch (role) {
        case "SUPER_ADMIN":
        case "ADMIN":
            return <Navigate to="/workspace" replace />;
        case "PM":
        case "USER":
            return <Navigate to="/pm" replace />;
        default:
            console.warn("Unknown role detected:", role);
            return <Navigate to="/login" replace />;
    }
}

export default App;
