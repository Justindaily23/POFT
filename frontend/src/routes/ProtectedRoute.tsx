// // import { Navigate } from "react-router-dom";
// // //import { useAuthStore } from "@/features/auth/stores/authStore";
// // import { useAuthStore } from "@/features/auth/stores/authStore";

// // interface ProtectedRouteProps {
// //     children: React.ReactNode;
// //     allowedRoles?: string[];
// // }

// // export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
// //     const { isAuthenticated, isInitialLoading, user } = useAuthStore();

// //     // 1. Wait for verification.
// //     // This is the "Gate" that stops the refresh-to-login jump.
// //     if (isInitialLoading) {
// //         return null;
// //     }

// //     // 2. Only after loading is finished, check if authenticated.
// //     if (!isAuthenticated) {
// //         return <Navigate to="/login" replace />;
// //     }

// //     // 3. If roles are required, ensure user data has arrived.
// //     if (allowedRoles) {
// //         if (!user) return null; // Wait for user object to populate
// //         if (!allowedRoles.includes(user.role)) {
// //             return <Navigate to="/unauthorized" replace />;
// //         }
// //     }

// //     return <>{children}</>;
// // }

// import { Navigate, useLocation } from "react-router-dom";
// import { useAuthStore } from "@/features/auth/stores/authStore";
// import { Loader2 } from "lucide-react"; // Or any spinner component

// interface ProtectedRouteProps {
//   children: React.ReactNode;
//   allowedRoles?: string[];
// }

// export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
//   const { isAuthenticated, isInitialLoading, user } = useAuthStore();
//   const location = useLocation();

//   // 1. THE SHIELD: Wait for the session verification useEffect to finish.
//   // If we are still loading, show a spinner instead of redirecting.
//   if (isInitialLoading) {
//     return (
//       <div className="flex h-screen w-screen items-center justify-center">
//         <Loader2 className="h-8 w-8 animate-spin text-primary" />
//         <span className="ml-2 text-sm font-medium">Verifying session...</span>
//       </div>
//     );
//   }

//   // 2. AUTH CHECK: Only redirect if loading is DONE and we definitely aren't logged in.
//   if (!isAuthenticated) {
//     // state: { from: location } allows us to send the user back to where they were after login
//     return <Navigate to="/login" state={{ from: location }} replace />;
//   }

//   // 3. ROLE CHECK: Ensure user data is present if roles are restricted.
//   if (allowedRoles) {
//     // If isAuthenticated is true but user object hasn't arrived, keep spinning
//     if (!user) {
//       return null;
//     }

//     if (!allowedRoles.includes(user.role)) {
//       return <Navigate to="/unauthorized" replace />;
//     }
//   }

//   // 4. ACCESS GRANTED
//   return <>{children}</>;
// }

import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  /**
   * '?' makes children optional to fix the TS error:
   * "Property 'children' is missing in type '{}' but required"
   */
  children?: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isInitialLoading, user } = useAuthStore();
  const location = useLocation();

  // 1. THE SHIELD: Wait for the session verification to finish.
  // This prevents the infinite redirect loop during app initialization.
  if (isInitialLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mt-2 text-sm font-medium text-muted-foreground">Verifying session...</span>
      </div>
    );
  }

  // 2. AUTH CHECK: Redirect to login if definitely not authenticated.
  if (!isAuthenticated) {
    // state: { from: location } allows the Login page to redirect back here after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. ROLE CHECK: Verify permissions if roles are restricted.
  if (allowedRoles) {
    // If authenticated but user data hasn't arrived yet, wait.
    if (!user) {
      return null;
    }

    if (!allowedRoles.includes(user.role)) {
      // Ensure you have an '/unauthorized' route in your App.tsx Routes
      return <Navigate to="/unauthorized" replace />;
    }
  }

  /**
   * 4. DUAL RENDERING LOGIC:
   * - If children are passed (e.g. <ProtectedRoute><Component /></ProtectedRoute>), render them.
   * - If no children (e.g. <Route element={<ProtectedRoute />} />), render the Outlet.
   */
  return children ? <>{children}</> : <Outlet />;
}
