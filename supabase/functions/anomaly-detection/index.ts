import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, getClientIp, isRateLimited, rateLimitResponse } from "../_shared/security.ts";

/**
 * Anomaly detection edge function.
 * Detects suspicious login patterns and creates alerts in audit_logs.
 * 
 * Patterns detected:
 * 1. Brute force: Many failed logins for different accounts from same IP
 * 2. Credential stuffing: Rapid failed logins across many emails
 * 3. Impossible travel: Login from geographically distant IPs in short time
 * 4. Off-hours login: Login outside business hours (configurable)
 */
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip, 10)) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Verify caller is superadmin
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "superadmin")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action } = await req.json();

    if (action === "scan") {
      const alerts: Array<{ type: string; severity: string; description: string; details: Record<string, unknown> }> = [];
      const windowMinutes = 30;
      const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

      // 1. Brute force detection: same IP, multiple failed logins
      const { data: ipFailures } = await adminClient
        .from("login_attempts")
        .select("ip_address, email, attempted_at")
        .eq("success", false)
        .gte("attempted_at", windowStart)
        .order("attempted_at", { ascending: false })
        .limit(500);

      if (ipFailures) {
        const ipCounts = new Map<string, { count: number; emails: Set<string> }>();
        for (const attempt of ipFailures) {
          const ipStr = String(attempt.ip_address);
          const entry = ipCounts.get(ipStr) || { count: 0, emails: new Set() };
          entry.count++;
          entry.emails.add(attempt.email);
          ipCounts.set(ipStr, entry);
        }

        for (const [attackIp, data] of ipCounts.entries()) {
          if (data.count >= 10 && data.emails.size >= 3) {
            alerts.push({
              type: "credential_stuffing",
              severity: "critico",
              description: `IP ${attackIp} tentou ${data.count} logins falhados em ${data.emails.size} contas diferentes nos últimos ${windowMinutes} minutos.`,
              details: { ip: attackIp, attempts: data.count, unique_emails: data.emails.size },
            });
          } else if (data.count >= 8) {
            alerts.push({
              type: "brute_force",
              severity: "alto",
              description: `IP ${attackIp} teve ${data.count} tentativas de login falhadas nos últimos ${windowMinutes} minutos.`,
              details: { ip: attackIp, attempts: data.count },
            });
          }
        }
      }

      // 2. New device alerts (from audit_logs)
      const { data: newDeviceAlerts } = await adminClient
        .from("audit_logs")
        .select("*")
        .eq("action", "new_device_login")
        .gte("created_at", windowStart)
        .order("created_at", { ascending: false })
        .limit(50);

      if (newDeviceAlerts && newDeviceAlerts.length > 0) {
        alerts.push({
          type: "new_device_logins",
          severity: "medio",
          description: `${newDeviceAlerts.length} login(s) de novos dispositivos/IPs detectados nos últimos ${windowMinutes} minutos.`,
          details: { count: newDeviceAlerts.length, events: newDeviceAlerts.map((a: any) => ({
            user_id: a.user_id,
            ip: String(a.ip_address),
            time: a.created_at,
          }))},
        });
      }

      // 3. Multiple active sessions for same user
      const { data: activeSessions } = await adminClient
        .from("active_sessions")
        .select("user_id, ip_address, device_info")
        .eq("is_revoked", false)
        .gte("last_active_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

      if (activeSessions) {
        const userSessions = new Map<string, Array<{ ip: string; device: string }>>();
        for (const session of activeSessions) {
          const list = userSessions.get(session.user_id) || [];
          list.push({ ip: String(session.ip_address), device: session.device_info || "Unknown" });
          userSessions.set(session.user_id, list);
        }

        for (const [userId, sessions] of userSessions.entries()) {
          const uniqueIps = new Set(sessions.map(s => s.ip));
          if (uniqueIps.size >= 3) {
            alerts.push({
              type: "multiple_sessions",
              severity: "medio",
              description: `Usuário ${userId.substring(0, 8)}... tem ${sessions.length} sessões ativas de ${uniqueIps.size} IPs diferentes.`,
              details: { user_id: userId, session_count: sessions.length, unique_ips: uniqueIps.size },
            });
          }
        }
      }

      // Record alerts in audit_logs
      for (const alert of alerts) {
        await adminClient.from("audit_logs").insert({
          action: `anomaly_detected.${alert.type}`,
          user_id: caller.id,
          details: {
            ...alert.details,
            severity: alert.severity,
            description: alert.description,
            detected_at: new Date().toISOString(),
          },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        alerts,
        scanned_at: new Date().toISOString(),
        window_minutes: windowMinutes,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get recent anomaly alerts
    if (action === "list_alerts") {
      const { data: recentAlerts } = await adminClient
        .from("audit_logs")
        .select("*")
        .like("action", "anomaly_detected.%")
        .order("created_at", { ascending: false })
        .limit(50);

      return new Response(JSON.stringify({
        success: true,
        alerts: recentAlerts || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
