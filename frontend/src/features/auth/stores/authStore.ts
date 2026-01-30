import { create } from "zustand";
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
export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: localStorage.getItem("token"),
    // If a token exists in storage, we are "authenticated" but must "load" to verify it
    isAuthenticated: !!localStorage.getItem("token"), // pre-fill
    isInitialLoading: true,
    setAuth: ({ token, user }) => {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user)); // <-- add this

        set({
            token,
            user,
            isAuthenticated: true,
            isInitialLoading: false, // Stop loading once we have the user
        });
    },

    clearAuth: () => {
        localStorage.removeItem("token");
        set({ user: null, token: null, isAuthenticated: false, isInitialLoading: false });
    },

    finishLoading: () => set({ isInitialLoading: false }),
}));
