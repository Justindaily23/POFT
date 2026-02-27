// src/pages/Maintenance.tsx
import { ShieldCheck } from "lucide-react";

export default function Maintenance() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="bg-blue-50 p-4 rounded-full">
            <ShieldCheck className="h-12 w-12 text-blue-600" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
            System <span className="text-blue-600">Initializing</span>
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Project Operations and Finance Tracking is currently undergoing final verification.
            We'll be live shortly.
          </p>
        </div>
        <div className="pt-4 border-t border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
            Stecam Nigeria Limited — v1.0.0 Online
          </span>
        </div>
      </div>
    </div>
  );
}
