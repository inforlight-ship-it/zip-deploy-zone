import { logAudit } from "@/lib/audit";

/**
 * Logs changes to sensitive compliance data fields.
 * Call this after any update to critical tables.
 */
export async function logSensitiveChange(params: {
  table: string;
  recordId: string;
  changedFields: string[];
  tenantId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}) {
  await logAudit({
    action: "sensitive_data_change",
    resourceType: params.table,
    resourceId: params.recordId,
    tenantId: params.tenantId,
    details: {
      changed_fields: params.changedFields,
      old_values: params.oldValues || {},
      new_values: params.newValues || {},
      changed_at: new Date().toISOString(),
    },
  });
}
