import { FileSpreadsheet, Building2, LogOut } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { getInitials, toTitleCase } from "@/lib/utils";
import apiClient from "@/api/auth/axios";
import { tokenService } from "@/api/auth/tokenService";

export function Header() {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // 1. Call your NestJS logout endpoint to clear HttpOnly cookies
      // Assuming your base URL is configured, or use the full path
      await apiClient.post("/auth/logout", {}, { withCredentials: true });
    } catch (error) {
      console.warn("Backend logout failed", error);
    } finally {
      // 2. Always clear local state and redirect even if backend call fails
      clearAuth();
      tokenService.clearToken(); // Ensure this is called!
      navigate("/login");
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-card/90 backdrop-blur-md border-b border-border shadow-sm">
      <div className="px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-[13px] font-bold text-blue-950 leading-none">
                PO Finance Tracking
              </h1>
              <p className="text-[11px] text-blue-950 mt-0.5 uppercase tracking-wider font-medium">
                Purchase Order Workspace
              </p>
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-8 text-[14px] font-extrabold text-blue-900 tracking-tight">
          <NavLink
            to="/analytics"
            className={({ isActive }) =>
              isActive
                ? "border-b-2 border-primary py-3 -mb-2.75"
                : "hover:text-primary transition-colors py-3"
            }
          >
            Analytics
          </NavLink>
          <NavLink
            to="/workspace"
            className={({ isActive }) =>
              isActive
                ? "border-b-2 border-primary py-3 -mb-2.75"
                : "hover:text-primary transition-colors py-3"
            }
          >
            Workspace
          </NavLink>
          <NavLink
            to="/create-account"
            className={({ isActive }) =>
              isActive
                ? "border-b-2 border-primary py-3 -mb-2.75"
                : "hover:text-primary transition-colors py-3"
            }
          >
            Create Account
          </NavLink>
          <NavLink
            to="/admin/fund-requests"
            className={({ isActive }) =>
              isActive
                ? " border-b-2 border-primary py-3 -mb-2.75"
                : "hover:text-primary transition-colors py-3"
            }
          >
            Fund Request
          </NavLink>
          {/* Replace <ImportPOButton /> with this: */}
          <NavLink
            to="/workspace/import"
            className={({ isActive }) =>
              isActive
                ? "border-b-2 border-primary py-3 -mb-2.75 text-primary"
                : "hover:text-primary transition-colors py-3 flex items-center gap-1.5"
            }
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Import POs
          </NavLink>
        </nav>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-500 uppercase tracking-wider">
            <Building2 className="h-3.5 w-3.5" />
            <span>Stecam Ops</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-full bg-secondary border border-border flex items-center justify-center text-[10px] font-bold text-foreground">
              {getInitials(user?.role)}
            </div>
            <span className="text-[12px] font-bold text-cyan-950 tracking-tight">
              {user?.name && (
                <span className="text-[12px] font-bold text-cyan-950 tracking-tight">
                  {toTitleCase(user.name)}
                </span>
              )}{" "}
            </span>

            {/* EXPLICIT LOGOUT BUTTON */}
            <button
              onClick={handleLogout}
              className="ml-2 flex items-center gap-1.5 px-2.5 py-1 rounded border border-red-100 bg-red-50/30 text-red-600 hover:bg-red-600 hover:text-white transition-all duration-200 shadow-sm"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="text-[10px] font-black uppercase tracking-tighter">Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
