import { logAudit } from "@/lib/audit";

/**
 * Wraps any data export operation with audit logging.
 * Call this before triggering CSV/PDF/Excel downloads.
 */
export async function auditExport(params: {
  exportType: string; // "csv" | "pdf" | "excel"
  resourceType: string; // e.g. "processing_activities", "incidents"
  recordCount: number;
  tenantId?: string;
  filters?: Record<string, unknown>;
}) {
  await logAudit({
    action: "data_export",
    resourceType: params.resourceType,
    tenantId: params.tenantId,
    details: {
      export_type: params.exportType,
      record_count: params.recordCount,
      filters: params.filters || {},
      exported_at: new Date().toISOString(),
    },
  });
}
