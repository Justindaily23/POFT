import { useState } from "react";
import { useAuth } from "@/hooks/auth/useAuth";
import { FormInput } from "./FormInput";
import { Logo } from "../utility/Logo";
import type { AppAxiosError } from "@/types/api/api.types";
import { Link } from "react-router-dom";
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const { mutate, isPending, isError, error } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({ email, password, remember });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormInput
        label="Email"
        type="email"
        name="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <FormInput
        label="Password"
        type="password"
        name="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="mr-2 cursor-pointer"
          />
          Remember account
        </label>
        <Link
          to="/forgot-password"
          className="text-blue-500 hover:underline p-4 text-xs font-bold uppercase tracking-tighter"
        >
          Reset Password
        </Link>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Logging in..." : "Login"}
      </button>

      {/* ✅ FIXED: Type-safe error message extraction */}
      {isError && (
        <p className="text-sm text-red-600 text-center animate-in fade-in duration-200">
          {(error as AppAxiosError)?.response?.data?.message}
        </p>
      )}

      <div className="flex justify-center mt-6">
        <Logo size="sm" className="opacity-100" />
      </div>
    </form>
  );
}
