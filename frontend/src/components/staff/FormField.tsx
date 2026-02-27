import type { UseFormRegisterReturn, FieldError } from "react-hook-form";

interface FormFieldProps {
  label: string;
  placeholder?: string;
  error?: FieldError;
  register: UseFormRegisterReturn;
}

export const FormField = ({ label, error, register, placeholder }: FormFieldProps) => (
  <div className="flex flex-col gap-2">
    <label className="text-[10px] font-bold text-slate-400 uppercase">{label}</label>
    <input
      {...register}
      placeholder={placeholder}
      className={`px-4 py-3 rounded-xl border ${error ? "border-red-500" : "border-slate-200"}`}
    />
    {error && <span className="text-[10px] text-red-500">{error.message}</span>}
  </div>
);
