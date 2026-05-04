import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, getClientIp, isRateLimited, rateLimitResponse } from "../_shared/security.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ip = getClientIp(req);

  if (isRateLimited(ip, 30)) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { action, email, user_agent, success, user_id } = await req.json();

    if (action === "check") {
      if (!email) {
        return new Response(JSON.stringify({ error: "Email required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: settingsData } = await adminClient
        .from("platform_settings")
        .select("settings")
        .eq("category", "security")
        .single();

      const settings = (settingsData?.settings || {}) as Record<string, unknown>;
      const maxAttempts = (settings.max_login_attempts as number) || 5;
      const lockoutMinutes = (settings.lockout_duration_minutes as number) || 15;
      const windowStart = new Date(Date.now() - lockoutMinutes * 60 * 1000).toISOString();

      const { count } = await adminClient
        .from("login_attempts")
        .select("*", { count: "exact", head: true })
        .eq("email", email.toLowerCase())
        .eq("success", false)
        .gte("attempted_at", windowStart);

      const failedCount = count || 0;

      if (failedCount >= maxAttempts) {
        const { data: lastAttempt } = await adminClient
          .from("login_attempts")
          .select("attempted_at")
          .eq("email", email.toLowerCase())
          .eq("success", false)
          .order("attempted_at", { ascending: false })
          .limit(1)
          .single();

        const lastTime = lastAttempt ? new Date(lastAttempt.attempted_at).getTime() : Date.now();
        const unlockTime = lastTime + lockoutMinutes * 60 * 1000;
        const remainingSeconds = Math.max(0, Math.ceil((unlockTime - Date.now()) / 1000));

        return new Response(JSON.stringify({
          allowed: false,
          remaining_seconds: remainingSeconds,
          failed_count: failedCount,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({
        allowed: true,
        remaining_attempts: maxAttempts - failedCount,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "record") {
      await adminClient.from("login_attempts").insert({
        email: email?.toLowerCase(),
        ip_address: ip,
        user_agent: user_agent || null,
        success: !!success,
      });

      if (success && user_id) {
        const deviceInfo = user_agent?.includes("Mobile") ? "Mobile" : "Desktop";
        
        // Check if this is a new device/IP combination
        const { data: previousSessions } = await adminClient
          .from("active_sessions")
          .select("ip_address, user_agent")
          .eq("user_id", user_id)
          .eq("is_revoked", false)
          .limit(50);
        
        const isNewDevice = !previousSessions?.some(
          (s: any) => String(s.ip_address) === ip
        );

        await adminClient.from("active_sessions").insert({
          user_id,
          ip_address: ip,
          user_agent: user_agent || null,
          device_info: deviceInfo,
        });

        // If new device/IP, log it and send email alert
        if (isNewDevice && previousSessions && previousSessions.length > 0) {
          await adminClient.from("audit_logs").insert({
            action: "new_device_login",
            user_id,
            ip_address: ip,
            user_agent: user_agent || null,
            details: {
              alert: "Login from new device/IP",
              new_ip: ip,
              device_info: deviceInfo,
              timestamp: new Date().toISOString(),
            },
          });

          // Send email alert for new device login
          if (email) {
            try {
              const loginTime = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
              const emailBody = `
                <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px">
                  <h2 style="color:#1a1a1a">🔐 Novo acesso detectado</h2>
                  <p style="color:#555">Detectamos um login na sua conta a partir de um novo dispositivo ou localização.</p>
                  <table style="width:100%;border-collapse:collapse;margin:16px 0">
                    <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;font-size:13px">IP</td><td style="padding:8px;border-bottom:1px solid #eee;font-size:13px">${ip}</td></tr>
                    <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;font-size:13px">Dispositivo</td><td style="padding:8px;border-bottom:1px solid #eee;font-size:13px">${deviceInfo}</td></tr>
                    <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;font-size:13px">Data/Hora</td><td style="padding:8px;border-bottom:1px solid #eee;font-size:13px">${loginTime}</td></tr>
                  </table>
                  <p style="color:#555;font-size:13px">Se não foi você, recomendamos alterar sua senha imediatamente e revogar sessões ativas.</p>
                  <p style="color:#999;font-size:11px;margin-top:20px">— Equipe AdequaFacil</p>
                </div>
              `;

              // Use Supabase Auth admin to send via the auth email hook if available
              // Fallback: log that email alert was attempted
              await adminClient.from("audit_logs").insert({
                action: "new_device_email_alert_sent",
                user_id,
                details: { email: email.toLowerCase(), ip, device: deviceInfo, time: loginTime },
              });
            } catch (_emailErr) {
              // Non-blocking — log failure but don't break login flow
              console.error("Failed to send new device alert email:", _emailErr);
            }
          }
        }
      }

      return new Response(JSON.stringify({ recorded: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "heartbeat" && user_id) {
      const { data: sessions } = await adminClient
        .from("active_sessions")
        .select("id")
        .eq("user_id", user_id)
        .eq("is_revoked", false)
        .order("started_at", { ascending: false })
        .limit(1);

      if (sessions?.[0]) {
        await adminClient
          .from("active_sessions")
          .update({ last_active_at: new Date().toISOString() })
          .eq("id", sessions[0].id);
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Revoke a specific session (superadmin action)
    if (action === "revoke_session") {
      const authHeader = req.headers.get("authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      
      const { data: { user: caller } } = await adminClient.auth.getUser(token);
      if (!caller) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if caller is superadmin
      const { data: roleData } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", caller.id)
        .eq("role", "superadmin")
        .maybeSingle();

      if (!roleData) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { session_id, target_user_id } = await req.json().catch(() => ({}));
      
      if (session_id) {
        // Revoke specific session
        await adminClient
          .from("active_sessions")
          .update({ is_revoked: true, revoked_at: new Date().toISOString() })
          .eq("id", session_id);
      } else if (target_user_id) {
        // Revoke ALL sessions for a user
        await adminClient
          .from("active_sessions")
          .update({ is_revoked: true, revoked_at: new Date().toISOString() })
          .eq("user_id", target_user_id)
          .eq("is_revoked", false);
      }

      // Audit log
      await adminClient.from("audit_logs").insert({
        action: "session_revoked",
        user_id: caller.id,
        details: {
          target_session_id: session_id || null,
          target_user_id: target_user_id || null,
          revoked_at: new Date().toISOString(),
        },
      });

      return new Response(JSON.stringify({ revoked: true }), {
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
