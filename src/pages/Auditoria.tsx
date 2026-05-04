import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, Play, Plus, Trash2, CheckCircle2, XCircle,
  AlertTriangle, BarChart3, FileText, ChevronRight, Eye,
  Shield, Clock, Search, Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// ── Types ──
interface Audit {
  id: string; name: string; description: string | null; status: string;
  overall_score: number; total_controls: number; compliant_controls: number;
  started_at: string | null; completed_at: string | null; created_at: string;
}
interface AuditControl {
  id: string; audit_id: string; category: string; title: string;
  description: string | null; is_compliant: boolean; evidence: string | null;
  notes: string | null; severity: string;
}

// ── Label Maps ──
const statusLabels: Record<string, string> = { pendente: "Pendente", em_andamento: "Em Andamento", concluida: "Concluída" };
const statusColors: Record<string, string> = { pendente: "bg-amber-500/15 text-amber-600", em_andamento: "bg-sky-500/15 text-sky-600", concluida: "bg-primary/15 text-primary" };
const severityLabels: Record<string, string> = { informativo: "Informativo", baixo: "Baixo", medio: "Médio", alto: "Alto", critico: "Crítico" };
const severityColors: Record<string, string> = { informativo: "bg-muted text-muted-foreground", baixo: "bg-sky-500/15 text-sky-600", medio: "bg-amber-500/15 text-amber-600", alto: "bg-orange-500/15 text-orange-600", critico: "bg-destructive/15 text-destructive" };

const CONTROL_TEMPLATES: { category: string; title: string; description: string; severity: string }[] = [
  { category: "Criptografia", title: "Criptografia de dados em repouso", description: "Dados pessoais armazenados devem ser criptografados (AES-256 ou equivalente)", severity: "alto" },
  { category: "Criptografia", title: "Criptografia de dados em trânsito", description: "Todas as comunicações devem utilizar TLS 1.2+", severity: "alto" },
  { category: "Criptografia", title: "Gestão de chaves criptográficas", description: "Chaves criptográficas devem ser armazenadas em cofre seguro (HSM/KMS)", severity: "medio" },
  { category: "Controle de Acesso", title: "Autenticação multifator (MFA)", description: "Acesso a sistemas críticos deve exigir MFA", severity: "critico" },
  { category: "Controle de Acesso", title: "Princípio do menor privilégio", description: "Usuários devem ter apenas as permissões necessárias", severity: "alto" },
  { category: "Controle de Acesso", title: "Revisão periódica de acessos", description: "Acessos devem ser revisados trimestralmente", severity: "medio" },
  { category: "Controle de Acesso", title: "Política de senhas fortes", description: "Senhas com mínimo 12 caracteres, complexidade e rotação", severity: "alto" },
  { category: "Backup", title: "Backup automatizado diário", description: "Backups devem ser executados diariamente com verificação de integridade", severity: "critico" },
  { category: "Backup", title: "Teste de restauração periódico", description: "Testes de restore devem ser executados mensalmente", severity: "alto" },
  { category: "Backup", title: "Backup offsite / georedundante", description: "Cópias em localidade geográfica distinta", severity: "medio" },
  { category: "Logs & Monitoramento", title: "Trilha de auditoria ativa", description: "Todas as operações em dados pessoais devem ser logadas", severity: "critico" },
  { category: "Logs & Monitoramento", title: "Monitoramento de acessos anômalos", description: "Alertas para comportamentos suspeitos (SIEM)", severity: "alto" },
  { category: "Logs & Monitoramento", title: "Retenção de logs mínima 6 meses", description: "Logs devem ser mantidos por pelo menos 6 meses", severity: "medio" },
  { category: "Rede & Firewall", title: "Firewall de borda configurado", description: "Regras de firewall restritivas e documentadas", severity: "alto" },
  { category: "Rede & Firewall", title: "Segmentação de rede", description: "Redes com dados pessoais devem ser segmentadas", severity: "medio" },
  { category: "Rede & Firewall", title: "WAF (Web Application Firewall)", description: "Aplicações web devem ter WAF ativo", severity: "alto" },
  { category: "Vulnerabilidades", title: "Scan de vulnerabilidades periódico", description: "Scans automatizados ao menos mensais", severity: "alto" },
  { category: "Vulnerabilidades", title: "Gestão de patches", description: "Patches críticos aplicados em até 72h", severity: "critico" },
  { category: "Vulnerabilidades", title: "Pentest anual", description: "Teste de penetração realizado anualmente por empresa externa", severity: "medio" },
  { category: "Governança", title: "Política de segurança da informação", description: "Documento formal aprovado pela alta direção", severity: "alto" },
  { category: "Governança", title: "Treinamento de conscientização", description: "Treinamentos periódicos para todos os colaboradores", severity: "medio" },
  { category: "Governança", title: "Plano de resposta a incidentes", description: "Procedimento documentado e testado periodicamente", severity: "critico" },
  { category: "Governança", title: "Classificação de dados", description: "Dados categorizados por nível de sensibilidade", severity: "alto" },
  { category: "LGPD Específico", title: "RIPD elaborado", description: "Relatório de Impacto à Proteção de Dados para tratamentos de alto risco", severity: "critico" },
  { category: "LGPD Específico", title: "Registro de operações de tratamento", description: "Art. 37 LGPD - registro atualizado de todas as atividades", severity: "alto" },
  { category: "LGPD Específico", title: "Canal de direitos do titular", description: "Canal acessível para exercício dos direitos do titular", severity: "critico" },
  { category: "LGPD Específico", title: "DPO nomeado e publicado", description: "Encarregado designado com contato público", severity: "alto" },
];

const categories = [...new Set(CONTROL_TEMPLATES.map(c => c.category))];

export default function Auditoria() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [audits, setAudits] = useState<Audit[]>([]);
  const [controls, setControls] = useState<AuditControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newAuditName, setNewAuditName] = useState("");
  const [newAuditDesc, setNewAuditDesc] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const fetchAudits = async () => {
    setLoading(true);
    const { data } = await supabase.from("security_audits").select("*").order("created_at", { ascending: false });
    if (data) setAudits(data as unknown as Audit[]);
    setLoading(false);
  };

  const fetchControls = async (auditId: string) => {
    const { data } = await supabase.from("audit_controls").select("*").eq("audit_id", auditId).order("category");
    if (data) setControls(data as unknown as AuditControl[]);
  };

  useEffect(() => { fetchAudits(); }, []);
  useEffect(() => { if (selectedAudit) fetchControls(selectedAudit.id); }, [selectedAudit]);

  const createAudit = async () => {
    if (!user || !newAuditName.trim()) return;
    const { data: auditData, error } = await supabase.from("security_audits").insert({
      user_id: user.id, name: newAuditName, description: newAuditDesc || null,
      status: "em_andamento" as any, total_controls: CONTROL_TEMPLATES.length,
      started_at: new Date().toISOString(),
    }).select().single();
    if (error || !auditData) { toast({ title: "Erro", description: error?.message, variant: "destructive" }); return; }
    // Insert template controls
    const controlRows = CONTROL_TEMPLATES.map(t => ({
      audit_id: auditData.id, user_id: user.id, category: t.category,
      title: t.title, description: t.description, severity: t.severity as any,
    }));
    await supabase.from("audit_controls").insert(controlRows);
    toast({ title: "Auditoria criada com " + CONTROL_TEMPLATES.length + " controles" });
    setCreateDialogOpen(false);
    setNewAuditName(""); setNewAuditDesc("");
    fetchAudits();
    setSelectedAudit(auditData as unknown as Audit);
  };

  const toggleControl = async (controlId: string, current: boolean) => {
    await supabase.from("audit_controls").update({ is_compliant: !current }).eq("id", controlId);
    if (selectedAudit) {
      const newCompliant = controls.filter(c => c.id === controlId ? !current : c.is_compliant).length;
      const score = Math.round((newCompliant / Math.max(controls.length, 1)) * 100);
      await supabase.from("security_audits").update({ compliant_controls: newCompliant, overall_score: score }).eq("id", selectedAudit.id);
      setSelectedAudit({ ...selectedAudit, compliant_controls: newCompliant, overall_score: score });
    }
    fetchControls(selectedAudit!.id);
  };

  const updateControlField = async (controlId: string, field: string, value: string) => {
    await supabase.from("audit_controls").update({ [field]: value }).eq("id", controlId);
  };

  const saveAudit = async () => {
    if (!selectedAudit) return;
    const compliant = controls.filter(c => c.is_compliant).length;
    const score = Math.round((compliant / Math.max(controls.length, 1)) * 100);
    await supabase.from("security_audits").update({
      compliant_controls: compliant, overall_score: score, total_controls: controls.length,
    }).eq("id", selectedAudit.id);
    const updated = { ...selectedAudit, compliant_controls: compliant, overall_score: score, total_controls: controls.length };
    setSelectedAudit(updated);
    toast({ title: "Auditoria salva", description: `Score atualizado: ${score}%` });
    fetchAudits();
  };

  const completeAudit = async () => {
    if (!selectedAudit) return;
    const compliant = controls.filter(c => c.is_compliant).length;
    const score = Math.round((compliant / Math.max(controls.length, 1)) * 100);
    await supabase.from("security_audits").update({
      status: "concluida" as any, completed_at: new Date().toISOString(),
      compliant_controls: compliant, overall_score: score, total_controls: controls.length,
    }).eq("id", selectedAudit.id);
    toast({ title: "Auditoria concluída", description: `Score final: ${score}%` });
    fetchAudits();
    setSelectedAudit({ ...selectedAudit, status: "concluida", compliant_controls: compliant, overall_score: score });
  };

  const reopenAudit = async () => {
    if (!selectedAudit) return;
    await supabase.from("security_audits").update({
      status: "em_andamento" as any, completed_at: null,
    }).eq("id", selectedAudit.id);
    toast({ title: "Auditoria reaberta" });
    fetchAudits();
    setSelectedAudit({ ...selectedAudit, status: "em_andamento", completed_at: null });
  };

  const deleteAudit = async (id: string) => {
    await supabase.from("security_audits").delete().eq("id", id);
    if (selectedAudit?.id === id) { setSelectedAudit(null); setControls([]); }
    toast({ title: "Auditoria removida" });
    fetchAudits();
  };

  // ── Computed ──
  const filteredControls = useMemo(() => {
    if (categoryFilter === "all") return controls;
    return controls.filter(c => c.category === categoryFilter);
  }, [controls, categoryFilter]);

  const scoreByCategory = useMemo(() => {
    const cats: Record<string, { total: number; compliant: number }> = {};
    controls.forEach(c => {
      if (!cats[c.category]) cats[c.category] = { total: 0, compliant: 0 };
      cats[c.category].total++;
      if (c.is_compliant) cats[c.category].compliant++;
    });
    return Object.entries(cats).map(([cat, { total, compliant }]) => ({
      category: cat, total, compliant, score: Math.round((compliant / total) * 100),
    }));
  }, [controls]);

  const nonCompliantCritical = useMemo(() =>
    controls.filter(c => !c.is_compliant && (c.severity === "critico" || c.severity === "alto")),
  [controls]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  // ── If viewing an audit ──
  if (selectedAudit) {
    const score = selectedAudit.overall_score;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedAudit(null); setControls([]); }}>← Voltar</Button>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold">{selectedAudit.name}</h1>
            <p className="text-sm text-muted-foreground">{selectedAudit.description}</p>
          </div>
          <Badge className={statusColors[selectedAudit.status]}>{statusLabels[selectedAudit.status]}</Badge>
          {selectedAudit.status === "concluida" ? (
            <Button variant="outline" onClick={reopenAudit}><Play className="mr-1.5 h-4 w-4" /> Reabrir Auditoria</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={saveAudit}><ShieldCheck className="mr-1.5 h-4 w-4" /> Salvar Auditoria</Button>
              <Button onClick={completeAudit}><CheckCircle2 className="mr-1.5 h-4 w-4" /> Concluir Auditoria</Button>
            </div>
          )}
        </div>

        {/* Score Overview */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-card">
            <CardContent className="p-5 text-center">
              <p className={`font-display text-3xl font-bold ${score >= 80 ? "text-primary" : score >= 50 ? "text-amber-500" : "text-destructive"}`}>{score}%</p>
              <p className="text-xs text-muted-foreground">Score Geral</p>
              <Progress value={score} className="mt-2 h-2" />
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-5 text-center">
              <p className="font-display text-3xl font-bold text-primary">{controls.filter(c => c.is_compliant).length}</p>
              <p className="text-xs text-muted-foreground">Conformes</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-5 text-center">
              <p className="font-display text-3xl font-bold text-destructive">{controls.filter(c => !c.is_compliant).length}</p>
              <p className="text-xs text-muted-foreground">Não Conformes</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-5 text-center">
              <p className="font-display text-3xl font-bold text-amber-500">{nonCompliantCritical.length}</p>
              <p className="text-xs text-muted-foreground">Gaps Críticos/Altos</p>
            </CardContent>
          </Card>
        </div>

        {/* Score by Category */}
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Conformidade por Categoria</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scoreByCategory.map(s => (
                <div key={s.category} className="flex items-center gap-3">
                  <span className="w-40 text-sm font-medium truncate">{s.category}</span>
                  <div className="flex-1"><Progress value={s.score} className="h-3" /></div>
                  <span className={`w-12 text-right text-sm font-bold ${s.score >= 80 ? "text-primary" : s.score >= 50 ? "text-amber-500" : "text-destructive"}`}>{s.score}%</span>
                  <span className="w-16 text-right text-xs text-muted-foreground">{s.compliant}/{s.total}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Critical Gaps */}
        {nonCompliantCritical.length > 0 && (
          <Card className="border-destructive/30 shadow-card">
            <CardHeader><CardTitle className="text-base flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" /> Gaps Críticos e Altos — Ação Necessária</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {nonCompliantCritical.map(c => (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg bg-destructive/5 p-3 border border-destructive/20">
                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{c.title}</p>
                      <p className="text-xs text-muted-foreground">{c.category} · {c.description}</p>
                    </div>
                    <Badge className={severityColors[c.severity]}>{severityLabels[c.severity]}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Controls Checklist */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Checklist de Controles</CardTitle>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredControls.map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  className={`rounded-lg border p-4 transition-colors ${c.is_compliant ? "bg-primary/5 border-primary/20" : "bg-card border-border"}`}>
                  <div className="flex items-start gap-3">
                    <Checkbox checked={c.is_compliant} onCheckedChange={() => toggleControl(c.id, c.is_compliant)} className="mt-0.5" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-medium ${c.is_compliant ? "line-through text-muted-foreground" : ""}`}>{c.title}</p>
                        <Badge variant="outline" className={`text-[10px] ${severityColors[c.severity]}`}>{severityLabels[c.severity]}</Badge>
                        <Badge variant="outline" className="text-[10px]">{c.category}</Badge>
                      </div>
                      {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                      <div className="flex gap-2 pt-1">
                        <Input placeholder="Evidência..." defaultValue={c.evidence || ""} className="h-8 text-xs"
                          onBlur={e => updateControlField(c.id, "evidence", e.target.value)} />
                        <Input placeholder="Observação..." defaultValue={c.notes || ""} className="h-8 text-xs"
                          onBlur={e => updateControlField(c.id, "notes", e.target.value)} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Audit List ──
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Auditoria de <span className="text-gradient-emerald">Segurança</span>
          </h1>
          <p className="mt-1 text-muted-foreground">Verificações técnicas de segurança e conformidade LGPD</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-glow"><Plus className="mr-1.5 h-4 w-4" /> Nova Auditoria</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Criar Auditoria</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Nome da auditoria</Label>
                <Input value={newAuditName} onChange={e => setNewAuditName(e.target.value)} placeholder="Ex: Auditoria Q1 2026" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={newAuditDesc} onChange={e => setNewAuditDesc(e.target.value)} placeholder="Objetivo e escopo..." rows={3} />
              </div>
              <p className="text-xs text-muted-foreground">Serão criados {CONTROL_TEMPLATES.length} controles de segurança automaticamente.</p>
              <Button onClick={createAudit} className="w-full" disabled={!newAuditName.trim()}>Criar Auditoria</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-card"><CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div><p className="text-xs font-medium text-muted-foreground">Total de Auditorias</p><p className="mt-1 font-display text-2xl font-bold">{audits.length}</p></div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent"><Shield className="h-5 w-5 text-accent-foreground" /></div>
          </div>
        </CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div><p className="text-xs font-medium text-muted-foreground">Em Andamento</p><p className="mt-1 font-display text-2xl font-bold text-sky-600">{audits.filter(a => a.status === "em_andamento").length}</p></div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent"><Clock className="h-5 w-5 text-accent-foreground" /></div>
          </div>
        </CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div><p className="text-xs font-medium text-muted-foreground">Concluídas</p><p className="mt-1 font-display text-2xl font-bold text-primary">{audits.filter(a => a.status === "concluida").length}</p></div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent"><CheckCircle2 className="h-5 w-5 text-accent-foreground" /></div>
          </div>
        </CardContent></Card>
      </div>

      {audits.length === 0 ? (
        <Card className="shadow-card"><CardContent className="py-16 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-muted-foreground">Nenhuma auditoria realizada.</p>
          <p className="text-sm text-muted-foreground">Clique em "Nova Auditoria" para iniciar a avaliação de segurança.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {audits.map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="shadow-card cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedAudit(a)}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-display text-sm font-bold">{a.name}</p>
                        <Badge className={statusColors[a.status]}>{statusLabels[a.status]}</Badge>
                      </div>
                      {a.description && <p className="text-xs text-muted-foreground line-clamp-1">{a.description}</p>}
                      <p className="text-[11px] text-muted-foreground">Criada: {formatDate(a.created_at)} · {a.compliant_controls}/{a.total_controls} controles conformes</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className={`font-display text-xl font-bold ${a.overall_score >= 80 ? "text-primary" : a.overall_score >= 50 ? "text-amber-500" : "text-destructive"}`}>{a.overall_score}%</p>
                        <Progress value={a.overall_score} className="mt-1 h-1.5 w-20" />
                      </div>
                      <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); deleteAudit(a.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
