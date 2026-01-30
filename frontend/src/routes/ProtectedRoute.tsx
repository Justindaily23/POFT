import { Navigate } from "react-router-dom";
//import { useAuthStore } from "@/features/auth/stores/authStore";
import { useAuthStore } from "@/features/auth/stores/authStore";

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { isAuthenticated, isInitialLoading, user } = useAuthStore();

    // 1. Wait for verification.
    // This is the "Gate" that stops the refresh-to-login jump.
    if (isInitialLoading) {
        return null;
    }

    // 2. Only after loading is finished, check if authenticated.
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // 3. If roles are required, ensure user data has arrived.
    if (allowedRoles) {
        if (!user) return null; // Wait for user object to populate
        if (!allowedRoles.includes(user.role)) {
            return <Navigate to="/unauthorized" replace />;
        }
    }

    return <>{children}</>;
}
