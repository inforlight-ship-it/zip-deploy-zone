import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, getClientIp, isRateLimited, rateLimitResponse } from "../_shared/security.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip, 5)) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    // Verify caller is superadmin
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: { user } } = await adminClient.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "superadmin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load retention settings
    const { data: settingsData } = await adminClient
      .from("platform_settings")
      .select("settings")
      .eq("category", "security")
      .single();

    const settings = (settingsData?.settings || {}) as Record<string, unknown>;
    const auditRetentionDays = (settings.audit_retention_days as number) || 90;
    const loginRetentionDays = (settings.login_retention_days as number) || 30;
    const sessionRetentionDays = (settings.session_retention_days as number) || 30;

    const auditCutoff = new Date(Date.now() - auditRetentionDays * 86400000).toISOString();
    const loginCutoff = new Date(Date.now() - loginRetentionDays * 86400000).toISOString();
    const sessionCutoff = new Date(Date.now() - sessionRetentionDays * 86400000).toISOString();

    // Purge old audit logs
    const { count: auditCount } = await adminClient
      .from("audit_logs")
      .delete({ count: "exact" })
      .lt("created_at", auditCutoff);

    // Purge old login attempts
    const { count: loginCount } = await adminClient
      .from("login_attempts")
      .delete({ count: "exact" })
      .lt("attempted_at", loginCutoff);

    // Purge old revoked sessions
    const { count: sessionCount } = await adminClient
      .from("active_sessions")
      .delete({ count: "exact" })
      .eq("is_revoked", true)
      .lt("revoked_at", sessionCutoff);

    // Log the purge action
    await adminClient.from("audit_logs").insert({
      action: "data_retention_purge",
      user_id: user.id,
      details: {
        audit_logs_purged: auditCount || 0,
        login_attempts_purged: loginCount || 0,
        sessions_purged: sessionCount || 0,
        retention_config: {
          audit_days: auditRetentionDays,
          login_days: loginRetentionDays,
          session_days: sessionRetentionDays,
        },
        purged_at: new Date().toISOString(),
      },
    });

    return new Response(JSON.stringify({
      success: true,
      purged: {
        audit_logs: auditCount || 0,
        login_attempts: loginCount || 0,
        revoked_sessions: sessionCount || 0,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
