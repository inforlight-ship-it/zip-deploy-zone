import { useState } from "react";
import { ScrollText, Search, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const actionLabels: Record<string, string> = {
  "tenant.created": "Tenant criado", "tenant.deactivated": "Tenant desativado", "tenant.activated": "Tenant ativado",
  "user.login.success": "Login realizado", "user.login.failed": "Login falhou", "user.invited": "Usuário convidado",
  "user.provisioned": "Usuário provisionado", "user.password.changed": "Senha alterada", "tenant.updated": "Tenant atualizado",
  "settings.updated": "Configurações atualizadas", "module.enabled": "Módulo ativado", "module.disabled": "Módulo desativado",
};

const AuditLogPage = () => {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const { toast } = useToast();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
      return data || [];
    },
    refetchInterval: 10000,
  });

  const uniqueActions = [...new Set(logs.map((l: any) => l.action))].sort();
  const filtered = logs.filter((l: any) => {
    const matchesSearch = l.action?.toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === "all" || l.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const exportCSV = () => {
    if (filtered.length === 0) { toast({ title: "Nenhum registro para exportar.", variant: "destructive" }); return; }
    const headers = ["Data/Hora", "Ação", "Recurso", "Detalhes"];
    const rows = filtered.map((log: any) => [
      new Date(log.created_at).toLocaleString("pt-BR"),
      actionLabels[log.action] || log.action,
      log.resource_type || "—",
      JSON.stringify(log.details || {}),
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `auditoria_${new Date().toISOString().slice(0, 10)}.csv`; link.click();
    URL.revokeObjectURL(url);
    toast({ title: `${filtered.length} registros exportados.` });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Auditoria</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Trilha de auditoria global ({filtered.length} registros)</p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="h-9 text-sm gap-1.5"><Download className="h-4 w-4" /> Exportar CSV</Button>
      </div>

      <div className="rounded-md border border-border bg-card shadow-sm">
        <div className="px-4 py-3 border-b border-border flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 pl-9 text-sm" />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="h-9 w-52 text-sm"><Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue placeholder="Filtrar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              {uniqueActions.map(action => <SelectItem key={action} value={action} className="text-xs">{actionLabels[action] || action}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Data/Hora</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Ação</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Recurso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((log: any) => (
                <tr key={log.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">{new Date(log.created_at).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{actionLabels[log.action] || log.action}</Badge></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{log.resource_type || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ScrollText className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AuditLogPage;
