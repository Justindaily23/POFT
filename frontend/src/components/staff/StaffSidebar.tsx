import type { FC } from "react";
import { Plus, Info, Loader2 } from "lucide-react";

interface StaffSidebarProps {
  roles: { id: string; name: string; code?: string }[];
  newRoleName: string;
  setNewRoleName: (value: string) => void;
  handleAddRole: () => void;
  isCreatingRole: boolean;
  stateCount: number;
}

export const StaffSidebar: FC<StaffSidebarProps> = ({
  roles,
  newRoleName,
  setNewRoleName,
  handleAddRole,
  isCreatingRole,
  stateCount,
}) => {
  return (
    <div className="lg:col-span-4 space-y-6">
      {/* Add New Role Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Plus size={16} className="text-indigo-600" /> Manage Job Roles
        </h2>
        <div className="flex gap-2">
          <input
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            placeholder="e.g. Project Manager"
            className="flex-1 px-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleAddRole}
            disabled={isCreatingRole}
            className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:bg-slate-300"
          >
            {isCreatingRole ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          </button>
        </div>

        <div className="mt-4 max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          {roles.map((role) => (
            <div
              key={role.id}
              className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 flex justify-between"
            >
              {role.name}
              <span className="text-indigo-600 opacity-60">{role.code}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Regional Info Card */}
      <div className="bg-indigo-900 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200">
        <div className="flex items-center gap-2 mb-3 opacity-80">
          <Info size={14} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Regional Sync</span>
        </div>
        <p className="text-xs leading-relaxed text-indigo-100">
          The system is currently synced with <strong>{stateCount}</strong> Nigerian states. States
          are managed via system seeds for data integrity.
        </p>
      </div>
    </div>
  );
};
