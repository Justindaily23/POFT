// src/pages/staff/components/PasswordModal.tsx
import { CheckCircle2, Copy, Check } from "lucide-react";
import { useState } from "react";

interface PasswordModalProps {
  staffId: string;
  password: string;
  onClose: () => void;
}

export function PasswordModal({ staffId, password, onClose }: PasswordModalProps) {
  const [copiedField, setCopiedField] = useState<"id" | "pass" | null>(null);

  const copyToClipboard = (text: string, field: "id" | "pass") => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Credentials Generated</h3>
          <p className="text-xs text-slate-500 mt-2">Securely copy these account details.</p>

          <div className="mt-6 space-y-4">
            {/* STAFF ID ROW */}
            <div className="text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Staff ID
              </label>
              <div className="mt-1 p-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-between">
                <code className="text-sm font-bold text-slate-700 tracking-wider">{staffId}</code>
                <button
                  onClick={() => copyToClipboard(staffId, "id")}
                  className={`p-2 rounded-lg transition-all ${copiedField === "id" ? "bg-green-50 text-green-600" : "hover:bg-white text-slate-400"}`}
                >
                  {copiedField === "id" ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            {/* PASSWORD ROW */}
            <div className="text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Temporary Password
              </label>
              <div className="mt-1 p-3 bg-indigo-50/50 border-2 border-dashed border-indigo-100 rounded-2xl flex items-center justify-between">
                <code className="text-lg font-black text-indigo-600 tracking-widest">
                  {password}
                </code>
                <button
                  onClick={() => copyToClipboard(password, "pass")}
                  className={`p-2 rounded-lg transition-all ${copiedField === "pass" ? "bg-indigo-600 text-white shadow-md" : "hover:bg-white text-indigo-400"}`}
                >
                  {copiedField === "pass" ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="mt-8 w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
          >
            Close & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
