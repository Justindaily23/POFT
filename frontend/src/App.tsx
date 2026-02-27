import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { authApi } from "./api/auth/auth.api";
import { Toaster as SonnerToaster } from "sonner";
import { Loader2 } from "lucide-react";

// Pages & Layouts
import Maintenance from "./pages/app/Maintenance";
import LoginPage from "@/pages/login/LoginPage";
import ResetPasswordRecoveryPage from "./pages/password/ResetPasswordRecoveryPage";
import ForgotPasswordPage from "./pages/password/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/password/ResetPasswordPage";
import POFinancialWorkspace from "@/pages/po-workspace/PoWorkspacePage";
import RootLayout from "@/components/layout";
import { AdminLayout } from "./components/layout/AdminLayout";
import CreateStaffAccountPage from "./pages/staff/CreateStaffAccountPage";
import NotificationPage from "./pages/notification/NotificationPage";
import { tokenService } from "./api/auth/tokenService";
import AdminFundRequestDashboard from "./components/fund-request/AdminFundRequestDashboard";
import PmPoftLandingPage from "./pages/landing/PmlandingPage";
import PmLayout from "./pages/landing/PmLayout";
import PmFundRequestPage from "./pages/fund-request/PmFundRequestPage";
import { AdminPoAnalyticsPage } from "./pages/po-analytics/AdminPoAnalyticsPage";
import PmPoAnalyticsPage from "./pages/po-analytics/PmPoAnalyticsPage";
import PoImportPage from "./pages/purchase-order/PoImportPage";

// Types
import type { AuthUser, AxiosMaintenanceError } from "./types/api/api.types";

function App() {
  const { isAuthenticated, user, isInitialLoading, setAuth, clearAuth, finishLoading } =
    useAuthStore();

  // 🛡️ Explicitly typed boolean state
  const [isMaintenance, setIsMaintenance] = useState<boolean>(false);

  useEffect(() => {
    const loadUser = async () => {
      const publicPaths = ["/login", "/forgot-password", "/reset-password-recovery"];
      if (publicPaths.includes(window.location.pathname)) {
        finishLoading();
        return;
      }

      const token = useAuthStore.getState().token || tokenService.getToken();
      if (!token) {
        finishLoading();
        return;
      }

      try {
        const { userData, accessToken } = await authApi.getCurrentUser();
        setAuth({ token: accessToken || token, user: userData });
      } catch (error: unknown) {
        // 🟢 Type guard for maintenance status
        const err = error as AxiosMaintenanceError;

        if (err.response?.status === 503) {
          setIsMaintenance(true);
          return;
        }

        clearAuth();
        tokenService.clearToken();
      } finally {
        finishLoading();
      }
    };
    loadUser();
  }, [setAuth, clearAuth, finishLoading]);

  // 1. Check Maintenance First
  if (isMaintenance) {
    return <Maintenance />;
  }

  // 2. Check Initial Load
  if (isInitialLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="font-bold text-[10px] uppercase tracking-widest text-slate-400">
          Synchronizing Stecam Ops...
        </p>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password-recovery" element={<ResetPasswordRecoveryPage />} />

        {/* ADMIN AREA */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
              <RootLayout />
            </ProtectedRoute>
          }
        >
          <Route element={<AdminLayout />}>
            <Route path="/workspace" element={<POFinancialWorkspace />} />
            <Route path="/workspace/import" element={<PoImportPage />} />
            <Route path="/admin/fund-requests" element={<AdminFundRequestDashboard />} />
            <Route path="/analytics" element={<AdminPoAnalyticsPage userRole="ADMIN" />} />
            <Route path="/create-account" element={<CreateStaffAccountPage />} />
            <Route path="/admin/profile" element={<ResetPasswordPage />} />
          </Route>
        </Route>

        {/* PM / USER AREA */}
        <Route
          path="/pm"
          element={
            <ProtectedRoute allowedRoles={["USER"]}>
              <PmLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<PmPoftLandingPage />} />
          <Route path="notifications" element={<NotificationPage />} />
          <Route path="fund-request/new" element={<PmFundRequestPage />} />
          <Route path="po-aging-days-mobile" element={<PmPoAnalyticsPage />} />
          <Route path="profile" element={<ResetPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RoleBasedRedirect user={user} />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <SonnerToaster richColors position="top-right" duration={8000} closeButton />
    </>
  );
}

/**
 * REDIRECTION LOGIC
 */
function RoleBasedRedirect({ user }: { user: AuthUser | null }) {
  if (!user) return <Navigate to="/login" replace />;

  if (user.mustChangePassword) {
    const isPmSide = user.role === "USER";
    return isPmSide ? (
      <Navigate to="/pm/profile" replace />
    ) : (
      <Navigate to="/reset-password" replace />
    );
  }

  switch (user.role) {
    case "SUPER_ADMIN":
    case "ADMIN":
      return <Navigate to="/workspace" replace />;
    case "USER":
      return <Navigate to="/pm" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

export default App;
