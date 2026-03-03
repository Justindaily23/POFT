import { useEffect, useCallback, useRef } from "react";
import { tokenService } from "@/api/auth/tokenService";
import { toast } from "sonner";

export function useIdleTimeout(timeoutMinutes: number = 30) {
  const timeoutId = useRef<NodeJS.Timeout | null>(null);
  const lastActivityKey = "last_active_timestamp";
  const warningId = useRef<NodeJS.Timeout | null>(null); // 2. Add warning ref

  const logout = useCallback(() => {
    if (window.location.pathname === "/login") return; // Don't redirect if already there
    tokenService.clearToken();
    localStorage.clear();
    window.location.href = "/login?reason=idle";
  }, []);

  const resetTimer = useCallback(() => {
    if (timeoutId.current) clearTimeout(timeoutId.current);
    if (warningId.current) clearTimeout(warningId.current);

    // 1. Update the shared timestamp so other tabs know we are active
    localStorage.setItem(lastActivityKey, Date.now().toString());

    // Trigger warning toast 2 minutes before the actual logout
    const warningMs = (timeoutMinutes - 2) * 60 * 1000;
    if (warningMs > 0) {
      warningId.current = setTimeout(() => {
        toast.warning("Session Expiring", {
          description: "You'll be logged out in 2 minutes. Move your mouse to stay active!",
        });
      }, warningMs);
    }

    timeoutId.current = setTimeout(logout, timeoutMinutes * 60 * 1000);
  }, [logout, timeoutMinutes]);

  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];
    let lastRun = 0;

    const handleActivity = () => {
      const now = Date.now();
      // 2. Throttle: Only reset the timer every 2 seconds to save CPU
      if (now - lastRun < 2000) return;
      lastRun = now;
      resetTimer();
    };

    // 3. Sync across tabs: If another tab updates the timestamp, reset our local timer
    const syncTabs = (e: StorageEvent) => {
      if (e.key === lastActivityKey) resetTimer();
    };

    events.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));
    window.addEventListener("storage", syncTabs); // Listen for tab sync

    resetTimer();

    return () => {
      if (timeoutId.current) clearTimeout(timeoutId.current);
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      window.removeEventListener("storage", syncTabs);
    };
  }, [resetTimer]);
}
