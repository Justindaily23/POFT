import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { RoleName } from "@/enums/roles";

interface AuthUser {
  id: string;
  email: string;
  role: RoleName;
  name: string;
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
      isInitialLoading: true,

      setAuth: ({ token, user }) => {
        set({
          token,
          user,
          isAuthenticated: true,
          isInitialLoading: false,
        });
      },

      clearAuth: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isInitialLoading: false,
        });
        // ✅ This clears the physical localStorage key safely without type errors
        useAuthStore.persist.clearStorage();

        // 3. Manually delete the key to be 100% sure
        window.localStorage.removeItem("auth-storage");
        localStorage.removeItem("auth-storage");
      },

      finishLoading: () => set({ isInitialLoading: false }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        // ✅ Logic fix: Only true if a token actually exists in the current state
        isAuthenticated: state.token !== null,
      }),

      onRehydrateStorage: () => (state) => {
        state?.finishLoading();
      },
    },
  ),
);
