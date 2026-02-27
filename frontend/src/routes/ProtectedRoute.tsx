import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Loader2 } from "lucide-react";
import type { RoleName } from "@/enums/roles"; // Import your official Role enum

interface ProtectedRouteProps {
  children?: React.ReactNode;
  /**
   * ✅ Fixed: Using RoleName type instead of generic string[]
   * to align with Stecam Ops permission levels.
   */
  allowedRoles?: RoleName[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isInitialLoading, user } = useAuthStore();
  const location = useLocation();

  // 1. THE SHIELD: Wait for session verification.
  if (isInitialLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-white font-sans">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
          Verifying Stecam Session...
        </span>
      </div>
    );
  }

  // 2. AUTH CHECK: Redirect to login.
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. ROLE CHECK: Verify permissions.
  if (allowedRoles && user) {
    // If the user's role isn't in the allowed list, redirect.
    if (!allowedRoles.includes(user.role)) {
      // PRO TIP: You can redirect to "/" which will then trigger
      // the RoleBasedRedirect logic we wrote in App.tsx
      return <Navigate to="/" replace />;
    }
  }

  // 4. DUAL RENDERING: Children or Outlet
  return children ? <>{children}</> : <Outlet />;
}
