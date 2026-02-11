import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
import { authApi } from "@/api/auth.api";

// Components & Layouts
import LoginPage from "@/features/login/LoginPage";
import ResetPasswordPage from "@/features/login/ResetPasswordPage";
import POFinancialWorkspace from "@/features/poWorkspace/PoWorkspacePage";
import RootLayout from "@/components/layout";
import PmRequestPage from "./features/fundRequests/pms/PmFundRequestPage";
import { AdminLayout } from "./components/layout/AdminLayout";
import PoAgingDaysDesktop from "./features/poAgingDays/PoAgingDaysDesktop";
import PoAgingDaysMobile from "./features/poAgingDays/PoAgingDaysMobile";
import CreateStaffAccountPage from "./features/staffs/CreateStaffAccountPage";
import NotificationPage from "./features/notification/NotificationPage";
import { tokenService } from "./api/tokenService";
import AdminFundRequestDashboard from "./features/fundRequests/admins/AdminFundRequestDashboard";

function App() {
  const { isAuthenticated, user, isInitialLoading, setAuth, clearAuth, finishLoading } =
    useAuthStore();

  useEffect(() => {
    const loadUser = async () => {
      //      const token = useAuthStore.getState().token;
      const token = useAuthStore.getState().token || tokenService.getToken();

      if (!token) {
        finishLoading();
        return;
      }
      try {
        const { userData, accessToken } = await authApi.getCurrentUser();
        setAuth({ token: accessToken || token, user: userData });
      } catch (error) {
        clearAuth();
      } finally {
        finishLoading();
      }
    };
    loadUser();
  }, [setAuth, clearAuth, finishLoading]);

  // 1. THE GLOBAL GUARD: Stops the "Race Condition" loop
  if (isInitialLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
        />

        {/* 2. ADMIN AREA (Uses RootLayout + AdminLayout) */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
              <RootLayout />
            </ProtectedRoute>
          }
        >
          <Route element={<AdminLayout />}>
            <Route path="/workspace" element={<POFinancialWorkspace />} />
            <Route path="/admin/fund-requests" element={<AdminFundRequestDashboard />} />
            <Route
              path="/po-aging-days"
              element={<PoAgingDaysDesktop userRole="ADMIN" currentPmId="PM001" />}
            />
            <Route path="/create-account" element={<CreateStaffAccountPage />} />
          </Route>
        </Route>

        {/* 3. PM / USER AREA (Fixed Routing) */}
        <Route
          path="/pm"
          element={
            <ProtectedRoute allowedRoles={["PM", "USER"]}>
              <RootLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<div>PM Dashboard</div>} />
          <Route
            path="po-aging-days-mobile"
            element={<PoAgingDaysMobile currentPmId="PM001" currentPmName="John Doe" />}
          />
        </Route>

        {/* 4. SHARED PROTECTED ROUTES */}
        <Route element={<ProtectedRoute />}>
          <Route path="/fund-request/new" element={<PmRequestPage />} />
          <Route path="/notification" element={<NotificationPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* 5. ROOT REDIRECTOR */}
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
      <Toaster />
    </>
  );
}

/**
 * REDIRECTION LOGIC
 */
function RoleBasedRedirect({ user }: { user: any }) {
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/reset-password" replace />;

  switch (user.role) {
    case "SUPER_ADMIN":
    case "ADMIN":
      return <Navigate to="/workspace" replace />;
    case "PM":
    case "USER":
      return <Navigate to="/pm" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

export default App;
