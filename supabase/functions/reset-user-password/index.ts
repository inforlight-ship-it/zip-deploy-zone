import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, getClientIp, isRateLimited, rateLimitResponse } from "../_shared/security.ts";

function generatePassword(length = 14): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%&*";
  const all = upper + lower + digits + special;
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let password = [
    upper[bytes[0] % upper.length],
    lower[bytes[1] % lower.length],
    digits[bytes[2] % digits.length],
    special[bytes[3] % special.length],
  ];
  for (let i = 4; i < length; i++) {
    password.push(all[bytes[i] % all.length]);
  }
  for (let i = password.length - 1; i > 0; i--) {
    const j = bytes[i] % (i + 1);
    [password[i], password[j]] = [password[j], password[i]];
  }
  return password.join("");
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip, 5)) {
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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === supabaseServiceKey;

    let callerId: string | null = null;

    if (!isServiceRole) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user: caller }, error: callerError } = await userClient.auth.getUser();
      if (callerError || !caller) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      callerId = caller.id;

      const { data: callerRoles } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", caller.id);

      const isSuperadmin = callerRoles?.some((r: any) => r.role === "superadmin");
      if (!isSuperadmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const targetUser = existingUsers?.users?.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!targetUser) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tempPassword = generatePassword();
    const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUser.id, {
      password: tempPassword,
    });
    if (updateError) throw updateError;

    await adminClient
      .from("profiles")
      .update({ must_change_password: true })
      .eq("user_id", targetUser.id);

    await adminClient.from("audit_logs").insert({
      action: "user.password_reset_by_admin",
      user_id: callerId,
      resource_type: "user",
      resource_id: targetUser.id,
      details: { email },
    });

    return new Response(
      JSON.stringify({ success: true, temp_password: tempPassword }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
