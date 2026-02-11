import { useState } from "react";
import { useAuth } from "@/hooks/useAuth"; // Use the hook we linked to your Store
import { FormInput } from "./FormInput";
import { Logo } from "../utility/Logo";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  // Destructure from useAuth hook (which returns the useMutation object)
  const { mutate, isPending, isError, error } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // This triggers the logic in useAuth.ts:
    // 1. API Call -> 2. Update Store -> 3. Navigate to "/"
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
            className="mr-2"
          />
          Remember account
        </label>
        <a href="/reset-password" className="text-blue-500 hover:underline p-4">
          Reset Password
        </a>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Logging in..." : "Login"}
      </button>

      {/* Use the server error message if it exists */}
      {isError && (
        <p className="text-sm text-red-600 text-center">
          {(error as any)?.response?.data?.message || "Login failed"}
        </p>
      )}

      {/* Tiny logo beneath form */}
      <div className="flex justify-center mt-6">
        <Logo size="sm" className="opacity-100" />
      </div>
    </form>
  );
}
