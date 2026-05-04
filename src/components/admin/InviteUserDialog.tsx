import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, Plus, CheckCircle2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TenantAssignment { tenantId: string; tenantName: string; roleId: string; }
interface Props { open: boolean; onOpenChange: (open: boolean) => void; tenantId?: string; }

const roleLabels: Record<string, string> = { tenant_admin: "Administrador", manager: "Gerente", analyst: "Analista", viewer: "Visualizador", dpo: "DPO" };
const blockedGlobalRoles = new Set(["superadmin", "admin"]);

const InviteUserDialog = ({ open, onOpenChange, tenantId }: Props) => {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [assignments, setAssignments] = useState<TenantAssignment[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState("");
  const queryClient = useQueryClient();
  const { isSuperadmin } = useAuth();

  const { data: roles = [] } = useQuery({ queryKey: ["roles"], queryFn: async () => { const { data } = await supabase.from("roles").select("*").order("name"); return data || []; } });
  const { data: tenants = [] } = useQuery({ queryKey: ["admin-tenants"], queryFn: async () => { const { data } = await supabase.from("tenants").select("id, name").eq("is_active", true); return data || []; }, enabled: !tenantId && isSuperadmin });

  const tenantRoles = roles.filter((r: any) => !blockedGlobalRoles.has(r.name));
  const availableTenants = tenants.filter((t: any) => !assignments.some((a) => a.tenantId === t.id));

  const addAssignment = () => {
    if (!selectedTenantId || !selectedRoleId) { toast({ title: "Selecione tenant e papel.", variant: "destructive" }); return; }
    const tenant = tenants.find((t: any) => t.id === selectedTenantId);
    setAssignments(prev => [...prev, { tenantId: selectedTenantId, tenantName: tenant?.name || "", roleId: selectedRoleId }]);
    setSelectedTenantId(""); setSelectedRoleId("");
  };

  const resetForm = () => { setEmail(""); setFullName(""); setAssignments([]); setSelectedTenantId(""); setSelectedRoleId(""); setInviteSent(false); setInvitedEmail(""); };

  const handleSubmit = async () => {
    if (!email.trim()) { toast({ title: "Informe o e-mail.", variant: "destructive" }); return; }
    if (tenantId) { if (!selectedRoleId) { toast({ title: "Selecione um papel.", variant: "destructive" }); return; } }
    else if (assignments.length === 0) { toast({ title: "Adicione pelo menos um tenant.", variant: "destructive" }); return; }

    setIsLoading(true);
    try {
      const targetAssignments = tenantId ? [{ tenant_id: tenantId, role_id: selectedRoleId }] : assignments.map(a => ({ tenant_id: a.tenantId, role_id: a.roleId }));
      const { data, error: fnError } = await supabase.functions.invoke("provision-user", { body: { email: email.trim().toLowerCase(), full_name: fullName.trim(), tenant_assignments: targetAssignments } });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      if (data?.access_email_sent) {
        setInviteSent(true);
        setInvitedEmail(email.trim().toLowerCase());
      } else {
        toast({ title: "Usuário vinculado!", description: `${email} foi vinculado aos tenants selecionados.` });
        onOpenChange(false);
        resetForm();
      }
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) { toast({ title: "Erro ao enviar convite", description: err.message, variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  if (inviteSent) {
    return (
      <Dialog open={open} onOpenChange={(v) => { if (!v) { onOpenChange(false); resetForm(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" /> Convite enviado!
            </DialogTitle>
            <DialogDescription>O usuário receberá um e-mail para acessar a plataforma.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-4">
              <Mail className="h-8 w-8 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">{invitedEmail}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Um e-mail de convite foi enviado com um link para o usuário definir sua senha e acessar a plataforma.
                </p>
              </div>
            </div>
            <div className="rounded-md bg-muted px-3 py-2">
              <p className="text-xs text-muted-foreground">
                💡 Caso o usuário não receba o e-mail, verifique a caixa de spam ou reenvie o convite.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { onOpenChange(false); resetForm(); }} className="w-full">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Convidar Usuário</DialogTitle>
          <DialogDescription>O usuário receberá um e-mail para definir sua senha e acessar a plataforma.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" placeholder="usuario@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9" /></div>
          <div className="space-y-1.5"><Label>Nome completo</Label><Input placeholder="Nome do usuário" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-9" /></div>

          {tenantId && (
            <div className="space-y-1.5">
              <Label>Papel</Label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}><SelectTrigger className="h-9"><SelectValue placeholder="Selecionar papel" /></SelectTrigger><SelectContent>{tenantRoles.map((r: any) => (<SelectItem key={r.id} value={r.id}>{roleLabels[r.name] || r.name}</SelectItem>))}</SelectContent></Select>
            </div>
          )}

          {!tenantId && isSuperadmin && (
            <div className="space-y-3">
              <Label>Tenants & Papéis</Label>
              {assignments.length > 0 && (
                <ScrollArea className="max-h-32">
                  <div className="space-y-2">
                    {assignments.map(a => {
                      const role = roles.find((r: any) => r.id === a.roleId);
                      return (
                        <div key={a.tenantId} className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2">
                          <div className="flex items-center gap-2"><Badge variant="outline" className="text-xs">{a.tenantName}</Badge><span className="text-xs text-muted-foreground">{roleLabels[role?.name || ""] || role?.name || "—"}</span></div>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAssignments(prev => prev.filter(x => x.tenantId !== a.tenantId))}><X className="h-3.5 w-3.5" /></Button>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
              {availableTenants.length > 0 && (
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1"><span className="text-xs text-muted-foreground">Tenant</span><Select value={selectedTenantId} onValueChange={setSelectedTenantId}><SelectTrigger className="h-9"><SelectValue placeholder="Selecionar tenant" /></SelectTrigger><SelectContent>{availableTenants.map((t: any) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}</SelectContent></Select></div>
                  <div className="flex-1 space-y-1"><span className="text-xs text-muted-foreground">Papel</span><Select value={selectedRoleId} onValueChange={setSelectedRoleId}><SelectTrigger className="h-9"><SelectValue placeholder="Selecionar papel" /></SelectTrigger><SelectContent>{tenantRoles.map((r: any) => (<SelectItem key={r.id} value={r.id}>{roleLabels[r.name] || r.name}</SelectItem>))}</SelectContent></Select></div>
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={addAssignment}><Plus className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); resetForm(); }} className="h-9">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="h-9">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar Convite"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InviteUserDialog;
