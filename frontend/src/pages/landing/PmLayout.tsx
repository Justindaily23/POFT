import { useState } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Home,
  Layers,
  User,
  Menu,
  Bell,
  PlusCircle,
  X,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { notificationApi } from "@/api/notification/notification.api";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/api/auth/auth.api";
import { getInitials, toTitleCase, formatRole } from "@/lib/utils"; // Added formatRole
import type { Notification } from "@/types/notification/notification.types";

const navItems = [
  { label: "Home", icon: <Home size={22} />, path: "/pm" },
  { label: "Analytics", icon: <Layers size={22} />, path: "/pm/po-aging-days-mobile" },
  { label: "New Request", icon: <PlusCircle size={22} />, path: "/pm/fund-request/new" },
  { label: "Profile", icon: <User size={22} />, path: "/pm/profile" },
];

const PmLayout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationApi.getNotifications,
    refetchInterval: 30_000,
    retry: 1,
  });

  const notifications: Notification[] = Array.isArray(data) ? data : [];
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const isNavActive = (path: string) =>
    location.pathname === path || (path !== "/pm" && location.pathname.startsWith(path));

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearAuth();
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 font-sans text-[#1E293B]">
      {/* --- MENU DRAWER --- */}
      <div
        className={`fixed inset-0 z-100 transition-all duration-300 ${
          isMenuOpen ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <div
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setIsMenuOpen(false)}
        />

        <aside
          className={`absolute right-0 h-full w-70 bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
            isMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Profile Header in Drawer */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-blue-200">
                {getInitials(user?.name || "PM")}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold text-slate-900 truncate w-32">
                  {toTitleCase(user?.name || "User")}
                </span>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                  {formatRole(user?.role)} {/* Changed to use formatRole */}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-2 bg-white rounded-full border border-slate-200 shadow-sm"
            >
              <X size={18} className="text-slate-400" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Navigation
            </p>
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                  isNavActive(item.path)
                    ? "bg-blue-600 text-white shadow-md shadow-blue-100"
                    : "text-slate-600 active:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-4">
                  {item.icon}
                  <span className="font-bold text-sm">{item.label}</span>
                </div>
                <ChevronRight
                  size={16}
                  className={isNavActive(item.path) ? "text-white/50" : "text-slate-300"}
                />
              </Link>
            ))}
          </nav>

          {/* Explicit Logout Button */}
          <div className="p-6 border-t border-slate-100 bg-slate-50/30">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-red-50 p-4 font-black text-red-600 border border-red-100 active:bg-red-600 active:text-white transition-all shadow-sm group"
            >
              <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
              <span className="uppercase text-xs tracking-wider">Log Out Session</span>
            </button>
          </div>
        </aside>
      </div>

      {/* --- HEADER --- */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white/90 px-5 py-3 backdrop-blur-lg">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <ShieldCheck size={20} />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Stecam Nigeria Ltd
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/pm/notifications"
            className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 flex h-3 w-3 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
              </span>
            )}
          </Link>

          <button
            onClick={() => setIsMenuOpen(true)}
            className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 transition-colors active:scale-90"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      <main className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <Outlet />
      </main>

      {/* --- BOTTOM NAV --- */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-slate-200 bg-white/95 px-2 pb-6 pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.04)] backdrop-blur-md">
        {navItems.map((item) => {
          const active = isNavActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                active ? "text-blue-600 -translate-y-0.5" : "text-slate-400"
              }`}
            >
              <div className={active ? "scale-110 transition-transform" : ""}>{item.icon}</div>
              <span className={`text-[10px] ${active ? "font-black" : "font-medium"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default PmLayout;
