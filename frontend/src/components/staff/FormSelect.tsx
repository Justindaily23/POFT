// src/pages/staff/components/FormSelect.tsx
import type { UseFormRegisterReturn, FieldError } from "react-hook-form";

interface FormSelectProps {
  label: string;
  icon: React.ReactNode;
  register: UseFormRegisterReturn;
  error?: FieldError;
  options: { id: string | number; name: string }[];
}

export function FormSelect({ label, icon, register, error, options }: FormSelectProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
        {icon} {label}
      </label>
      <select
        {...register}
        className={`px-4 py-3 rounded-xl border bg-slate-50/50 text-sm font-semibold outline-none transition-all ${
          error ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-indigo-500"
        }`}
      >
        <option value="">Select {label}...</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.name}
          </option>
        ))}
      </select>
      {error && <span className="text-[10px] text-red-500 font-bold">{error.message}</span>}
    </div>
  );
}
