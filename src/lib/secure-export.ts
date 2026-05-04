import { auditExport } from "@/hooks/useAuditExport";

/**
 * Generates a CSV string from data and triggers a download.
 * Adds a security watermark header with export metadata.
 */
export async function secureCSVExport(params: {
  data: Record<string, unknown>[];
  fileName: string;
  resourceType: string;
  tenantId?: string;
  userId?: string;
  filters?: Record<string, unknown>;
}) {
  const { data, fileName, resourceType, tenantId, filters } = params;

  if (!data.length) return;

  // Audit the export
  await auditExport({
    exportType: "csv",
    resourceType,
    recordCount: data.length,
    tenantId,
    filters,
  });

  // Build CSV with security watermark
  const timestamp = new Date().toISOString();
  const watermark = `# Exportado por AdequaFacil em ${timestamp} | Registros: ${data.length} | Tipo: ${resourceType}`;

  const headers = Object.keys(data[0]);
  const csvRows = [
    watermark,
    headers.join(","),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        const str = val === null || val === undefined ? "" : String(val);
        // Prevent CSV injection: prefix with ' if starts with =, +, -, @, \t, \r
        const sanitized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
        return `"${sanitized.replace(/"/g, '""')}"`;
      }).join(",")
    ),
  ];

  const csvContent = csvRows.join("\n");

  // Add hash for integrity verification
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(csvContent));
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  const finalContent = csvContent + `\n# SHA-256: ${hashHex}`;

  // Trigger download
  const blob = new Blob([finalContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}_${timestamp.slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
