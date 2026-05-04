import { useState } from "react";
import { Building2, Plus, Search, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CreateTenantDialog from "@/components/admin/CreateTenantDialog";
import TenantActionsMenu from "@/components/admin/TenantActionsMenu";

const TenantsListPage = () => {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data: tenants = [] } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: async () => {
      const { data } = await supabase.from("tenants").select("*, subscription_plans(name), tenant_branding(primary_color)");
      return data || [];
    },
  });

  const filtered = tenants.filter((t: any) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tenants</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie as empresas da plataforma</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="h-9 text-sm gap-1.5">
          <Plus className="h-4 w-4" /> Novo Tenant
        </Button>
      </div>

      <div className="rounded-md border border-border bg-card shadow-sm">
        <div className="px-4 py-3 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar tenant..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 pl-9 text-sm" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Empresa</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Slug</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Plano</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Max Usuários</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Criado em</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((tenant: any) => (
                <tr key={tenant.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary">
                        <Building2 className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <span className="font-medium text-card-foreground">{tenant.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{tenant.slug}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="text-xs">{tenant.subscription_plans?.name || "—"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{tenant.max_users}</td>
                  <td className="px-4 py-3">
                    {tenant.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                        <XCircle className="h-3.5 w-3.5" /> Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(tenant.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3"><TenantActionsMenu tenant={tenant} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum tenant encontrado.</p>
          </div>
        )}
      </div>
      <CreateTenantDialog open={showCreate} onOpenChange={setShowCreate} />
    </motion.div>
  );
};

export default TenantsListPage;
