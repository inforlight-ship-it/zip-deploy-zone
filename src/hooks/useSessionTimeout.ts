import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Enforces session inactivity timeout.
 * Logs user out after X minutes of no mouse/keyboard/touch activity.
 */
export function useSessionTimeout(isAuthenticated: boolean, logout: () => Promise<void>) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutMinutesRef = useRef(60); // default

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (isAuthenticated) {
        logout();
      }
    }, timeoutMinutesRef.current * 60 * 1000);
  }, [isAuthenticated, logout]);

  // Load timeout setting once
  useEffect(() => {
    if (!isAuthenticated) return;

    supabase
      .from("platform_settings")
      .select("settings")
      .eq("category", "security")
      .single()
      .then(({ data }) => {
        if (data?.settings) {
          const s = data.settings as Record<string, unknown>;
          const minutes = (s.session_timeout_minutes as number) || 60;
          timeoutMinutesRef.current = minutes;
          resetTimer();
        }
      });
  }, [isAuthenticated, resetTimer]);

  // Listen to user activity
  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ["mousedown", "keydown", "touchstart", "scroll", "mousemove"];
    let throttled = false;

    const handler = () => {
      if (throttled) return;
      throttled = true;
      resetTimer();
      setTimeout(() => { throttled = false; }, 30000); // throttle to 30s
    };

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isAuthenticated, resetTimer]);
}
