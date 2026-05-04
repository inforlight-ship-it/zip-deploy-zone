import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, X, Plus, ShieldCheck, ShieldAlert, KeyRound, RotateCcw, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";

const roleLabels: Record<string, string> = { superadmin: "Superadmin", tenant_admin: "Administrador", manager: "Gerente", analyst: "Analista", viewer: "Visualizador" };

interface Props { open: boolean; onOpenChange: (open: boolean) => void; user: any; }

const EditUserDialog = ({ open, onOpenChange, user }: Props) => {
  const [fullName, setFullName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [addTenantId, setAddTenantId] = useState("");
  const [addRoleId, setAddRoleId] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => { if (user) { setFullName(user.full_name || ""); setIsActive(user.is_active ?? true); setGeneratedPassword(null); } }, [user]);

  const { data: allTenants = [] } = useQuery({ queryKey: ["admin-tenants"], queryFn: async () => { const { data } = await supabase.from("tenants").select("id, name").eq("is_active", true); return data || []; } });
  const { data: roles = [] } = useQuery({ queryKey: ["roles"], queryFn: async () => { const { data } = await supabase.from("roles").select("*"); return data || []; } });

  const tenantRoles = roles.filter((r: any) => r.name !== "superadmin");
  const userTenantIds = (user?.user_tenants || []).map((ut: any) => ut.tenant_id);
  const availableTenants = allTenants.filter((t: any) => !userTenantIds.includes(t.id));
  const isSuperadmin = user?.user_roles?.some((r: any) => r.role === "superadmin");

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from("profiles").update({ full_name: fullName.trim(), is_active: isActive }).eq("id", user.id);
      if (error) throw error;
      await logAudit({ action: "user.updated", resourceType: "user", resourceId: user.id, details: { full_name: fullName.trim(), is_active: isActive } });
      toast({ title: "Usuário atualizado!" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      onOpenChange(false);
    } catch (err: any) { toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  const handleResetPassword = async () => {
    setIsLoading(true); setGeneratedPassword(null);
    try {
      const { data, error } = await supabase.functions.invoke("reset-user-password", { body: { email: user.email } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setGeneratedPassword(data.temp_password);
      toast({ title: "Nova senha temporária gerada!" });
    } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  const handleAddTenant = async () => {
    if (!addTenantId || !addRoleId) { toast({ title: "Selecione tenant e papel.", variant: "destructive" }); return; }
    setIsLoading(true);
    try {
      const { data: ut, error: utErr } = await supabase.from("user_tenants").insert({ user_id: user.user_id, tenant_id: addTenantId }).select("id").single();
      if (utErr) throw utErr;
      const { error: roleErr } = await supabase.from("user_tenant_roles").insert({ user_tenant_id: ut.id, role_id: addRoleId });
      if (roleErr) throw roleErr;
      toast({ title: "Tenant vinculado ao usuário!" });
      setAddTenantId(""); setAddRoleId("");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) { toast({ title: "Erro ao vincular tenant", description: err.message, variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  const handleRemoveTenant = async (tenantId: string) => {
    setIsLoading(true);
    try {
      const ut = user.user_tenants?.find((u: any) => u.tenant_id === tenantId);
      if (!ut) return;
      await supabase.from("user_tenant_roles").delete().eq("user_tenant_id", ut.id);
      const { error } = await supabase.from("user_tenants").delete().eq("id", ut.id);
      if (error) throw error;
      toast({ title: "Tenant desvinculado." });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
        <div className="space-y-5 py-2">
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">E-mail</Label><p className="text-sm font-medium text-foreground">{user.email}</p></div>
            <div className="space-y-1.5"><Label>Nome completo</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-9" /></div>
            <div className="flex items-center justify-between">
              <div><Label>Ativo</Label><p className="text-xs text-muted-foreground">Desativar impede o acesso à plataforma</p></div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Segurança</Label>
            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-foreground">Senha</p><p className="text-xs text-muted-foreground">Gerar nova senha temporária</p></div></div>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleResetPassword} disabled={isLoading}><RotateCcw className="h-3 w-3 mr-1" /> Gerar senha</Button>
              </div>
              {generatedPassword && (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-1.5">
                  <p className="text-xs font-medium text-foreground">Senha temporária gerada:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-secondary px-2 py-1 text-sm font-mono text-foreground select-all">{generatedPassword}</code>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { navigator.clipboard.writeText(generatedPassword); toast({ title: "Senha copiada!" }); }}><Copy className="h-3.5 w-3.5" /></Button>
                  </div>
                  <p className="text-xs text-muted-foreground">O usuário será obrigado a trocar a senha no próximo login.</p>
                </div>
              )}
            </div>
          </div>

          {isSuperadmin && (<div className="space-y-2"><Label className="text-xs uppercase tracking-wide text-muted-foreground">Papel Global</Label><Badge className="text-xs bg-primary/10 text-primary border-primary/20">Superadmin</Badge></div>)}

          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tenants & Papéis</Label>
            {user.user_tenants?.length > 0 && (
              <ScrollArea className="max-h-40">
                <div className="space-y-2">
                  {user.user_tenants.map((ut: any) => {
                    const role = ut.user_tenant_roles?.[0]?.roles;
                    return (
                      <div key={ut.tenant_id} className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2">
                        <div className="flex items-center gap-2"><Badge variant="outline" className="text-xs">{ut.tenants?.name || "—"}</Badge><span className="text-xs text-muted-foreground">{roleLabels[role?.name || ""] || role?.name || "sem papel"}</span></div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveTenant(ut.tenant_id)} disabled={isLoading}><X className="h-3.5 w-3.5" /></Button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
            {user.user_tenants?.length === 0 && <p className="text-xs text-muted-foreground">Nenhum tenant vinculado.</p>}
            {availableTenants.length > 0 && (
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1"><span className="text-xs text-muted-foreground">Tenant</span><Select value={addTenantId} onValueChange={setAddTenantId}><SelectTrigger className="h-9"><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{availableTenants.map((t: any) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}</SelectContent></Select></div>
                <div className="flex-1 space-y-1"><span className="text-xs text-muted-foreground">Papel</span><Select value={addRoleId} onValueChange={setAddRoleId}><SelectTrigger className="h-9"><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{tenantRoles.map((r: any) => (<SelectItem key={r.id} value={r.id}>{roleLabels[r.name] || r.name}</SelectItem>))}</SelectContent></Select></div>
                <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={handleAddTenant} disabled={isLoading}><Plus className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9">Cancelar</Button>
          <Button onClick={handleSaveProfile} disabled={isLoading} className="h-9">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserDialog;
