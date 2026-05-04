import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, getClientIp, isRateLimited, rateLimitResponse } from "../_shared/security.ts";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip, 15)) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { action, password } = await req.json();

    if (action === "check") {
      const passwordHash = await hashPassword(password);
      const { data: settingsData } = await adminClient
        .from("platform_settings")
        .select("settings")
        .eq("category", "security")
        .single();

      const settings = (settingsData?.settings || {}) as Record<string, unknown>;
      const historyDepth = (settings.password_history_count as number) || 5;

      const { data: history } = await adminClient
        .from("password_history")
        .select("password_hash")
        .eq("user_id", userId)
        .order("changed_at", { ascending: false })
        .limit(historyDepth);

      const isReused = history?.some(h => h.password_hash === passwordHash) || false;

      return new Response(JSON.stringify({ reused: isReused, history_depth: historyDepth }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "record") {
      const passwordHash = await hashPassword(password);
      await adminClient.from("password_history").insert({
        user_id: userId,
        password_hash: passwordHash,
      });

      await adminClient
        .from("profiles")
        .update({
          password_changed_at: new Date().toISOString(),
          password_expires_at: null,
        })
        .eq("user_id", userId);

      return new Response(JSON.stringify({ recorded: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check_expiry") {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("password_changed_at")
        .eq("user_id", userId)
        .single();

      const { data: settingsData } = await adminClient
        .from("platform_settings")
        .select("settings")
        .eq("category", "security")
        .single();

      const settings = (settingsData?.settings || {}) as Record<string, unknown>;
      const expiryDays = (settings.password_expiry_days as number) || 0;

      if (!expiryDays || !profile?.password_changed_at) {
        return new Response(JSON.stringify({ expired: false, days_until_expiry: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const changedAt = new Date(profile.password_changed_at).getTime();
      const expiresAt = changedAt + expiryDays * 24 * 60 * 60 * 1000;
      const daysUntil = Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000));

      return new Response(JSON.stringify({
        expired: daysUntil <= 0,
        days_until_expiry: Math.max(0, daysUntil),
        warning: daysUntil > 0 && daysUntil <= 7,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
