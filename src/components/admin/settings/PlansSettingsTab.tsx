import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CreditCard } from "lucide-react";

interface Plan { id: string; name: string; max_users: number; max_modules: number; price_monthly: number | null; is_active: boolean; features: Record<string, unknown> | null; }
const emptyPlan: Omit<Plan, "id"> = { name: "", max_users: 25, max_modules: 5, price_monthly: 0, is_active: true, features: {} };

export default function PlansSettingsTab() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState(emptyPlan);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadPlans(); }, []);

  const loadPlans = async () => {
    const { data } = await supabase.from("subscription_plans").select("*").order("price_monthly", { ascending: true });
    setPlans((data as Plan[]) || []); setLoading(false);
  };

  const openCreate = () => { setEditingPlan(null); setForm(emptyPlan); setDialogOpen(true); };
  const openEdit = (plan: Plan) => { setEditingPlan(plan); setForm({ name: plan.name, max_users: plan.max_users, max_modules: plan.max_modules, price_monthly: plan.price_monthly, is_active: plan.is_active, features: plan.features }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    if (editingPlan) {
      const { error } = await supabase.from("subscription_plans").update({ name: form.name, max_users: form.max_users, max_modules: form.max_modules, price_monthly: form.price_monthly, is_active: form.is_active }).eq("id", editingPlan.id);
      if (error) toast.error("Erro ao atualizar plano"); else toast.success("Plano atualizado");
    } else {
      const { error } = await supabase.from("subscription_plans").insert({ name: form.name, max_users: form.max_users, max_modules: form.max_modules, price_monthly: form.price_monthly, is_active: form.is_active });
      if (error) toast.error("Erro ao criar plano"); else toast.success("Plano criado");
    }
    setSaving(false); setDialogOpen(false); loadPlans();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza?")) return;
    const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir."); else { toast.success("Plano excluído"); loadPlans(); }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Planos de Assinatura</CardTitle><CardDescription>Gerencie planos com limites de usuários e módulos</CardDescription></div>
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Novo Plano</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead className="text-center">Máx. Usuários</TableHead><TableHead className="text-center">Máx. Módulos</TableHead><TableHead className="text-center">Preço/mês</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {plans.length === 0 ? (<TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum plano cadastrado</TableCell></TableRow>) : plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell className="text-center">{plan.max_users}</TableCell>
                  <TableCell className="text-center">{plan.max_modules}</TableCell>
                  <TableCell className="text-center">{plan.price_monthly != null ? `R$ ${Number(plan.price_monthly).toFixed(2)}` : "—"}</TableCell>
                  <TableCell className="text-center"><Badge variant={plan.is_active ? "default" : "secondary"}>{plan.is_active ? "Ativo" : "Inativo"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(plan)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(plan.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingPlan ? "Editar Plano" : "Novo Plano"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Nome do Plano</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Básico, Pro" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Máx. Usuários</Label><Input type="number" min={1} value={form.max_users} onChange={(e) => setForm({ ...form, max_users: parseInt(e.target.value) || 1 })} /></div>
              <div className="space-y-2"><Label>Máx. Módulos</Label><Input type="number" min={1} value={form.max_modules} onChange={(e) => setForm({ ...form, max_modules: parseInt(e.target.value) || 1 })} /></div>
              <div className="space-y-2"><Label>Preço/mês (R$)</Label><Input type="number" min={0} step={0.01} value={form.price_monthly ?? 0} onChange={(e) => setForm({ ...form, price_monthly: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div className="flex items-center justify-between"><Label>Plano Ativo</Label><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
