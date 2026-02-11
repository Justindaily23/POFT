import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { RoleName } from "@/enums/roles";

interface AuthUser {
  id: string;
  email: string;
  role: RoleName;
  mustChangePassword: boolean;
}
interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialLoading: boolean; // NEW
  setAuth: (payload: { token: string; user: AuthUser }) => void;
  clearAuth: () => void;
  finishLoading: () => void; // NEW
}
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isInitialLoading: true, // Always start true to block ProtectedRoute

      setAuth: ({ token, user }) => {
        set({
          token,
          user,
          isAuthenticated: true,
          isInitialLoading: false,
        });
      },

      clearAuth: () => {
        set({ user: null, token: null, isAuthenticated: false, isInitialLoading: false });
        //localStorage.removeItem("auth-storage"); // Clear the persisted data
      },

      finishLoading: () => set({ isInitialLoading: false }),
    }),
    {
      name: "auth-storage", // Unique name for localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist these fields (don't persist the loading state)
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: !!state.token,
      }),
    },
  ),
);
