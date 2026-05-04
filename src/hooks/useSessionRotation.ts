import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const ROTATION_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Proactively rotates the session token at regular intervals
 * to minimize the window of a compromised token.
 */
export function useSessionRotation(isAuthenticated: boolean) {
  const rotateSession = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.warn("Session rotation failed:", error.message);
      }
    } catch {
      // Silently fail — next interval will retry
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(rotateSession, ROTATION_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, rotateSession]);
}
