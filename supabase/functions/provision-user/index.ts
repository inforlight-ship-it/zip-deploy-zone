import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, getClientIp, isRateLimited, rateLimitResponse } from "../_shared/security.ts";

const APP_BASE_URL = "https://privacy-shield-automata.lovable.app";

function generatePassword(length = 16): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

serve(async (req) => {
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: callerError } = await userClient.auth.getUser();
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const isSuperadmin = callerRoles?.some((role: any) => role.role === "superadmin");

    const { data: callerTenantRoles } = await adminClient
      .from("user_tenants")
      .select("tenant_id, user_tenant_roles(roles(name))")
      .eq("user_id", caller.id)
      .eq("is_active", true);

    const manageableTenantIds = (callerTenantRoles || [])
      .filter((tenant: any) => tenant.user_tenant_roles?.some((role: any) => role.roles?.name === "tenant_admin"))
      .map((tenant: any) => tenant.tenant_id);

    const isTenantAdmin = manageableTenantIds.length > 0;

    if (!isSuperadmin && !isTenantAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, full_name, tenant_assignments } = await req.json();

    if (!email || !tenant_assignments?.length) {
      return new Response(JSON.stringify({ error: "Email and tenant assignments are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isSuperadmin) {
      const hasUnauthorizedTenant = tenant_assignments.some((assignment: any) => !manageableTenantIds.includes(assignment.tenant_id));
      if (hasUnauthorizedTenant) {
        return new Response(JSON.stringify({ error: "Você só pode gerenciar usuários dos seus próprios tenants." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const uniqueRoleIds = [...new Set(tenant_assignments.map((a: any) => a.role_id).filter(Boolean))];
    const { data: roles, error: rolesError } = await adminClient
      .from("roles")
      .select("id, name")
      .in("id", uniqueRoleIds);

    if (rolesError) throw rolesError;

    const roleById = new Map((roles || []).map((r: any) => [r.id, r.name]));
    const hasInvalidRole = tenant_assignments.some((a: any) => {
      const roleName = roleById.get(a.role_id);
      return !roleName || roleName === "superadmin" || roleName === "admin";
    });

    if (hasInvalidRole) {
      return new Response(JSON.stringify({ error: "Selecione apenas papéis válidos para tenants." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedName = String(full_name || "").trim();
    const defaultTenantId = tenant_assignments[0]?.tenant_id ?? null;
    const resetRedirectTo = `${APP_BASE_URL}/reset-password`;

    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u: any) => u.email?.toLowerCase() === normalizedEmail);

    let userId: string;
    let isNewUser = false;
    let accessEmailSent = false;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const tempPassword = generatePassword();
      const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
        email: normalizedEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: normalizedName || normalizedEmail },
      });
      if (createError) throw createError;
      userId = createdUser.user.id;
      isNewUser = true;
    }

    const { error: resetError } = await adminClient.auth.resetPasswordForEmail(
      normalizedEmail,
      { redirectTo: resetRedirectTo },
    );
    if (resetError) throw resetError;
    accessEmailSent = true;

    const { data: existingProfile, error: profileLookupError } = await adminClient
      .from("profiles")
      .select("id, email, full_name, tenant_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileLookupError) throw profileLookupError;

    if (existingProfile) {
      const updates: Record<string, string | boolean | null> = {};
      if (!existingProfile.email || existingProfile.email !== normalizedEmail) updates.email = normalizedEmail;
      if ((!existingProfile.full_name || existingProfile.full_name.trim() === "") && normalizedName) updates.full_name = normalizedName;
      if (!existingProfile.tenant_id && defaultTenantId) updates.tenant_id = defaultTenantId;

      if (Object.keys(updates).length > 0) {
        const { error: updateErr } = await adminClient.from("profiles").update(updates).eq("user_id", userId);
        if (updateErr) throw updateErr;
      }
    } else {
      const { error: insertErr } = await adminClient.from("profiles").insert({
        user_id: userId,
        email: normalizedEmail,
        full_name: normalizedName || normalizedEmail,
        is_active: true,
        must_change_password: false,
        tenant_id: defaultTenantId,
      });
      if (insertErr) throw insertErr;
    }

    for (const assignment of tenant_assignments) {
      const { data: existingUT, error: utLookupErr } = await adminClient
        .from("user_tenants")
        .select("id")
        .eq("user_id", userId)
        .eq("tenant_id", assignment.tenant_id)
        .maybeSingle();

      if (utLookupErr) throw utLookupErr;

      let userTenantId = existingUT?.id;

      if (!userTenantId) {
        const { data: createdUT, error: utInsertErr } = await adminClient
          .from("user_tenants")
          .insert({ user_id: userId, tenant_id: assignment.tenant_id, invited_by: caller.id, is_active: true })
          .select("id")
          .single();
        if (utInsertErr) throw utInsertErr;
        userTenantId = createdUT.id;
      }

      const { data: existingTR, error: trLookupErr } = await adminClient
        .from("user_tenant_roles")
        .select("id")
        .eq("user_tenant_id", userTenantId)
        .maybeSingle();

      if (trLookupErr) throw trLookupErr;

      if (existingTR) {
        const { error: trUpdateErr } = await adminClient
          .from("user_tenant_roles")
          .update({ role_id: assignment.role_id, assigned_by: caller.id })
          .eq("id", existingTR.id);
        if (trUpdateErr) throw trUpdateErr;
      } else {
        const { error: trInsertErr } = await adminClient
          .from("user_tenant_roles")
          .insert({ user_tenant_id: userTenantId, role_id: assignment.role_id, assigned_by: caller.id });
        if (trInsertErr) throw trInsertErr;
      }
    }

    await adminClient.from("audit_logs").insert({
      action: "user.provisioned",
      user_id: caller.id,
      resource_type: "user",
      resource_id: userId,
      details: {
        email: normalizedEmail,
        full_name: normalizedName,
        tenant_count: tenant_assignments.length,
        is_new_user: isNewUser,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      user_id: userId,
      is_new_user: isNewUser,
      access_email_sent: accessEmailSent,
      message: isNewUser
        ? `Convite enviado para ${normalizedEmail}. O usuário receberá um e-mail para definir sua senha e acessar a plataforma.`
        : `Usuário vinculado e e-mail de acesso enviado para ${normalizedEmail}.`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
