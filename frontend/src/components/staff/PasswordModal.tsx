// src/pages/staff/components/PasswordModal.tsx
import { CheckCircle2, Copy } from "lucide-react";

export function PasswordModal({ password, onClose }: { password: string; onClose: () => void }) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(password);
    // You could add a small "Copied!" toast here too
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Credentials Generated</h3>
          <p className="text-xs text-slate-500 mt-2">Copy this temporary password.</p>
          <div className="mt-6 p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-between">
            <code className="text-xl font-black text-indigo-600 tracking-widest">{password}</code>
            <button
              onClick={copyToClipboard}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <Copy size={18} className="text-slate-400" />
            </button>
          </div>
          <button
            onClick={onClose}
            className="mt-8 w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest"
          >
            Close & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
