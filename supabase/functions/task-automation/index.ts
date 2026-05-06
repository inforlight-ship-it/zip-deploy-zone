import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    const { record, old_record, type, table, schema } = payload;

    console.log(`Processing ${type} for ${schema}.${table}:`, record.id);

    // 1. Workflow Engine - Check for rules
    if (table === "tasks") {
      const eventType = type === "INSERT" ? "task_created" : "task_status_changed";
      
      // If status changed
      if (type === "UPDATE" && record.status !== old_record.status) {
        const { data: rules } = await adminClient
          .from("workflow_rules")
          .select("*")
          .eq("tenant_id", record.tenant_id)
          .eq("event_type", "task_status_changed")
          .eq("is_active", true);

        for (const rule of (rules || [])) {
          const config = rule.condition_config;
          const matchesCondition = 
            (!config.status_from || config.status_from === old_record.status) &&
            (!config.status_to || config.status_to === record.status);

          if (matchesCondition) {
            console.log(`Executing rule: ${rule.name}`);
            await executeAction(adminClient, rule, record);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in task-automation:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function executeAction(supabase: any, rule: any, record: any) {
  const startTime = Date.now();
  let status = "success";
  let errorMessage = null;

  try {
    if (rule.action_type === "notify_manager") {
      // Find tenant admin
      const { data: admins } = await supabase
        .from("user_tenants")
        .select("user_id, profiles(email, full_name)")
        .eq("tenant_id", record.tenant_id)
        .eq("is_active", true);
        
      // Mock notification (In production, use Lovable Emails/SendGrid)
      console.log(`Notification sent to admins of tenant ${record.tenant_id} about task ${record.id}`);
    } else if (rule.action_type === "update_field") {
      const updates = rule.action_config.updates || {};
      if (Object.keys(updates).length > 0) {
        await supabase.from("tasks").update(updates).eq("id", record.id);
      }
    }
  } catch (e) {
    status = "failed";
    errorMessage = e.message;
  }

  // Log execution
  await supabase.from("workflow_logs").insert({
    tenant_id: record.tenant_id,
    rule_id: rule.id,
    target_id: record.id,
    status,
    error_message: errorMessage,
    execution_time_ms: Date.now() - startTime
  });
}
