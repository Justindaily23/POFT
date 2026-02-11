import { Link, useLocation, Outlet } from "react-router-dom";
import { ShieldCheck, Home, Layers, User, Menu, Bell, PlusCircle } from "lucide-react";

const PmLayout = () => {
  const location = useLocation();

  const navItems = [
    { label: "Home", icon: <Home size={22} />, path: "/pm" },
    { label: "Assets", icon: <Layers size={22} />, path: "/pm/po-aging-days-mobile" },
    { label: "New Request", icon: <PlusCircle size={22} />, path: "/pm/fund-request/new" },
    { label: "Profile", icon: <User size={22} />, path: "/reset-password" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans text-[#1E293B]">
      {/* --- STATIC HEADER --- */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white/90 px-5 py-3 backdrop-blur-lg">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <ShieldCheck size={20} />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">POFT</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/notification"
            className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
          >
            <Bell size={20} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
          </Link>
          <button className="rounded-full bg-slate-100 p-2 text-slate-600">
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* --- DYNAMIC CONTENT (Pages switch here) --- */}
      <main>
        <Outlet />
      </main>

      {/* --- STATIC NAVIGATION --- */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-slate-200 bg-white/95 px-2 pb-6 pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.04)] backdrop-blur-md">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 transition-colors ${
                isActive ? "text-blue-600" : "text-slate-400"
              }`}
            >
              <div className={isActive ? "scale-110 transition-transform" : ""}>{item.icon}</div>
              <span className={`text-[10px] ${isActive ? "font-bold" : "font-medium"}`}>
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
