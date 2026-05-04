import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, getClientIp, isRateLimited, rateLimitResponse } from "../_shared/security.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip, 10)) {
    return rateLimitResponse(corsHeaders);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, serviceRoleKey);
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: roleCheck } = await callerClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "superadmin")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { user_id, action } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (user_id === caller.id) {
      return new Response(JSON.stringify({ error: "Cannot delete yourself" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "deactivate") {
      await callerClient.from("profiles").update({ is_active: false }).eq("user_id", user_id);
      return new Response(JSON.stringify({ success: true, action: "deactivated" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "activate") {
      await callerClient.from("profiles").update({ is_active: true }).eq("user_id", user_id);
      return new Response(JSON.stringify({ success: true, action: "activated" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Full delete
    const { data: userTenants } = await callerClient
      .from("user_tenants")
      .select("id")
      .eq("user_id", user_id);

    for (const ut of userTenants || []) {
      await callerClient.from("user_tenant_roles").delete().eq("user_tenant_id", ut.id);
    }

    await callerClient.from("user_tenants").delete().eq("user_id", user_id);
    await callerClient.from("user_roles").delete().eq("user_id", user_id);
    await callerClient.from("mfa_settings").delete().eq("user_id", user_id);
    await callerClient.from("active_sessions").delete().eq("user_id", user_id);
    await callerClient.from("password_history").delete().eq("user_id", user_id);
    await callerClient.from("profiles").delete().eq("user_id", user_id);

    const { error: deleteError } = await callerClient.auth.admin.deleteUser(user_id);
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, action: "deleted" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
