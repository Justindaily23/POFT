import { Link } from "react-router-dom";
import { Zap, BarChart3, ArrowRight, Clock, PlusCircle } from "lucide-react";

const PmPoftLandingPage = () => {
  return (
    <div className="animate-in fade-in duration-500">
      {/* --- Hero Section --- */}
      <section className="bg-white px-6 py-10 shadow-sm">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-600">
          Operations Dashboard
        </p>
        <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-slate-900">
          Tracking Excellence for <span className="text-blue-600">Stecam Nigeria</span>
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-slate-500">
          Manage process operations and financial flows with real-time verification and automated
          trade logs.
        </p>
        <Link
          to="/pm/fund-request/new"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 font-medium text-white shadow-md transition-all hover:bg-slate-800 active:scale-[0.98]"
        >
          Create Fund Request <PlusCircle size={18} />
        </Link>
      </section>

      {/* --- Grid Section --- */}
      <section className="grid grid-cols-2 gap-3 px-5 py-8">
        <Link
          to="/pm/po-aging-days-mobile"
          className="col-span-2 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm active:bg-slate-50"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-orange-50 p-3 text-orange-600">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">PO Aging</h3>
              <p className="text-xs text-slate-500">Monitor pending operations</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-300" />
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-blue-600">
            <Zap size={20} />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Instant Verif</h3>
          <p className="text-[11px] text-slate-500">POF confirmation</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-indigo-600">
            <BarChart3 size={20} />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Analytics</h3>
          <p className="text-[11px] text-slate-500">Market trends</p>
        </div>
      </section>

      <footer className="px-6 py-4 text-center">
        <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
          Owned by Stecam Nigeria Limited
        </p>
      </footer>
    </div>
  );
};

export default PmPoftLandingPage;
