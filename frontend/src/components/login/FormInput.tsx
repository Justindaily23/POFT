import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils"; // Uses your existing utility

interface FormInputProps {
  label: string;
  name: string; // Required for your setFormData logic
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string; // For custom enterprise spacing
}

export function FormInput({
  label,
  name,
  type = "text",
  value,
  onChange,
  className,
}: FormInputProps) {
  // Local state to toggle visibility
  const [showPassword, setShowPassword] = useState(false);

  // Logic to determine if we should even show an eye icon
  const isPasswordField = type === "password";

  return (
    <div className={cn("space-y-2", className)}>
      <label className="block text-sm font-semibold text-gray-700 tracking-tight">{label}</label>
      <div className="relative group">
        <input
          name={name}
          // Dynamically switch type based on toggle state
          type={isPasswordField ? (showPassword ? "text" : "password") : type}
          value={value}
          onChange={onChange}
          className={cn(
            "w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition-all",
            "focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm",
            isPasswordField && "pr-10", // Make room for the icon
          )}
          required
        />

        {isPasswordField && (
          <button
            type="button" // Prevents form submission when clicking eye
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors focus:outline-none"
            tabIndex={-1} // Skip tab index for better UX
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
