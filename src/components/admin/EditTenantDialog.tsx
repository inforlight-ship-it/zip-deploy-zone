import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: { id: string; name: string; slug: string; max_users: number; plan_id: string | null; is_active: boolean };
}

const EditTenantDialog = ({ open, onOpenChange, tenant }: Props) => {
  const [name, setName] = useState(tenant.name);
  const [slug, setSlug] = useState(tenant.slug);
  const [maxUsers, setMaxUsers] = useState(String(tenant.max_users));
  const [planId, setPlanId] = useState(tenant.plan_id || "");
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    setName(tenant.name); setSlug(tenant.slug); setMaxUsers(String(tenant.max_users)); setPlanId(tenant.plan_id || "");
  }, [tenant]);

  const { data: plans = [] } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data } = await supabase.from("subscription_plans").select("*").eq("is_active", true);
      return data || [];
    },
  });

  const handleSubmit = async () => {
    if (!name.trim() || !slug.trim()) { toast({ title: "Preencha o nome e slug.", variant: "destructive" }); return; }
    setIsLoading(true);
    try {
      const { error } = await supabase.from("tenants").update({ name: name.trim(), slug: slug.trim(), max_users: parseInt(maxUsers) || 25, plan_id: planId || null }).eq("id", tenant.id);
      if (error) throw error;
      await logAudit({ action: "tenant.updated", resourceType: "tenant", resourceId: tenant.id, details: { name: name.trim(), slug: slug.trim() } });
      toast({ title: "Tenant atualizado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao atualizar tenant", description: err.message?.includes("duplicate") ? "Já existe um tenant com esse slug." : err.message, variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Editar Tenant</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5"><Label>Nome da empresa</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" /></div>
          <div className="space-y-1.5"><Label>Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} className="h-9 font-mono text-xs" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Plano</Label>
              <Select value={planId} onValueChange={setPlanId}><SelectTrigger className="h-9"><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{plans.map((plan: any) => (<SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>))}</SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label>Max Usuários</Label><Input type="number" value={maxUsers} onChange={(e) => setMaxUsers(e.target.value)} className="h-9" min="1" /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="h-9">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditTenantDialog;
