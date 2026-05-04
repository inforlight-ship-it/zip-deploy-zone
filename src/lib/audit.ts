import { supabase } from "@/integrations/supabase/client";

interface AuditLogParams {
  action: string;
  resourceType?: string;
  resourceId?: string;
  tenantId?: string;
  details?: Record<string, any>;
}

export async function logAudit({
  action,
  resourceType,
  resourceId,
  tenantId,
  details,
}: AuditLogParams) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("audit_logs").insert({
      action,
      user_id: user.id,
      resource_type: resourceType || null,
      resource_id: resourceId || null,
      tenant_id: tenantId || null,
      details: details || {},
      user_agent: navigator.userAgent,
    });
  } catch (err) {
    console.error("Audit log error:", err);
  }
}
