import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, Plus, Trash2, CheckCircle2, XCircle, Clock,
  Shield, FileText, ChevronRight, Activity, Flame, Eye,
  Send, Download, ArrowRight, Zap, Users
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Incident {
  id: string; title: string; description: string; severity: string; status: string;
  category: string; affected_data_types: string[]; affected_count: number;
  detected_at: string; contained_at: string | null; resolved_at: string | null;
  reported_to_anpd: boolean; anpd_report_date: string | null;
  reported_to_subjects: boolean; root_cause: string | null;
  corrective_actions: string | null; preventive_actions: string | null;
  dpo_notes: string | null; created_at: string;
}
interface TimelineEntry { id: string; incident_id: string; action: string; details: string | null; created_at: string; }

const severityLabels: Record<string, string> = { baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica" };
const severityColors: Record<string, string> = { baixa: "bg-muted text-muted-foreground", media: "bg-sky-500/15 text-sky-600", alta: "bg-amber-500/15 text-amber-600", critica: "bg-destructive/15 text-destructive" };
const statusLabels: Record<string, string> = { detectado: "Detectado", em_analise: "Em Análise", contido: "Contido", erradicado: "Erradicado", recuperado: "Recuperado", encerrado: "Encerrado" };
const statusColors: Record<string, string> = { detectado: "bg-destructive/15 text-destructive", em_analise: "bg-amber-500/15 text-amber-600", contido: "bg-sky-500/15 text-sky-600", erradicado: "bg-primary/15 text-primary", recuperado: "bg-primary/15 text-primary", encerrado: "bg-muted text-muted-foreground" };
const statusFlow = ["detectado", "em_analise", "contido", "erradicado", "recuperado", "encerrado"];
const categoryLabels: Record<string, string> = { vazamento: "Vazamento de Dados", acesso_indevido: "Acesso Indevido", perda: "Perda de Dados", ransomware: "Ransomware", phishing: "Phishing", outro: "Outro" };

export default function Incidentes() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const [form, setForm] = useState({
    title: "", description: "", severity: "media", category: "vazamento",
    affected_data_types: "", affected_count: "0",
  });

  const fetchIncidents = async () => {
    setLoading(true);
    const { data } = await supabase.from("incidents").select("*").order("created_at", { ascending: false });
    if (data) setIncidents(data as unknown as Incident[]);
    setLoading(false);
  };

  const fetchTimeline = async (id: string) => {
    const { data } = await supabase.from("incident_timeline").select("*").eq("incident_id", id).order("created_at", { ascending: true });
    if (data) setTimeline(data as unknown as TimelineEntry[]);
  };

  useEffect(() => { fetchIncidents(); }, []);
  useEffect(() => { if (selected) fetchTimeline(selected.id); }, [selected]);

  const createIncident = async () => {
    if (!user || !form.title.trim()) return;
    const { data, error } = await supabase.from("incidents").insert({
      user_id: user.id, title: form.title, description: form.description,
      severity: form.severity as any, category: form.category,
      affected_data_types: form.affected_data_types.split(",").map(s => s.trim()).filter(Boolean),
      affected_count: parseInt(form.affected_count) || 0,
    }).select().single();
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    // Add initial timeline entry
    await supabase.from("incident_timeline").insert({ incident_id: data.id, user_id: user.id, action: "Incidente registrado", details: form.description });
    toast({ title: "Incidente registrado" });
    setCreateOpen(false);
    setForm({ title: "", description: "", severity: "media", category: "vazamento", affected_data_types: "", affected_count: "0" });
    fetchIncidents();
  };

  const advanceStatus = async () => {
    if (!selected || !user) return;
    const currentIdx = statusFlow.indexOf(selected.status);
    if (currentIdx >= statusFlow.length - 1) return;
    const newStatus = statusFlow[currentIdx + 1];
    const update: Record<string, unknown> = { status: newStatus };
    if (newStatus === "contido") update.contained_at = new Date().toISOString();
    if (newStatus === "encerrado") update.resolved_at = new Date().toISOString();
    await supabase.from("incidents").update(update as any).eq("id", selected.id);
    await supabase.from("incident_timeline").insert({ incident_id: selected.id, user_id: user.id, action: `Status atualizado para: ${statusLabels[newStatus]}` });
    toast({ title: `Status → ${statusLabels[newStatus]}` });
    setSelected({ ...selected, status: newStatus, ...(newStatus === "contido" ? { contained_at: new Date().toISOString() } : {}), ...(newStatus === "encerrado" ? { resolved_at: new Date().toISOString() } : {}) });
    fetchTimeline(selected.id);
    fetchIncidents();
  };

  const updateIncidentField = async (field: string, value: unknown) => {
    if (!selected) return;
    await supabase.from("incidents").update({ [field]: value } as any).eq("id", selected.id);
    setSelected({ ...selected, [field]: value });
  };

  const addTimelineEntry = async (action: string) => {
    if (!selected || !user) return;
    await supabase.from("incident_timeline").insert({ incident_id: selected.id, user_id: user.id, action });
    fetchTimeline(selected.id);
  };

  const deleteIncident = async (id: string) => {
    await supabase.from("incidents").delete().eq("id", id);
    if (selected?.id === id) { setSelected(null); setTimeline([]); }
    toast({ title: "Incidente removido" });
    fetchIncidents();
  };

  const generateAnpdReport = () => {
    if (!selected) return;
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Comunicado ANPD - ${selected.title}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;background:#f8fafc;color:#1e293b;line-height:1.7}
.container{max-width:800px;margin:0 auto;background:white;box-shadow:0 4px 20px rgba(0,0,0,.08)}
.header{background:linear-gradient(135deg,#0f172a,#1e3a5f);color:white;padding:40px 48px}
.header h1{font-size:22px;margin-bottom:4px}.header p{opacity:.75;font-size:13px}
.body{padding:40px 48px}.section{margin-bottom:28px}
.section h2{font-size:15px;font-weight:700;color:#0f172a;border-bottom:2px solid #0d9488;padding-bottom:6px;margin-bottom:12px}
.field{margin-bottom:10px}.field-label{font-size:11px;font-weight:600;text-transform:uppercase;color:#64748b;letter-spacing:.5px}
.field-value{font-size:14px;margin-top:2px}.badge{display:inline-block;padding:3px 12px;border-radius:999px;font-size:11px;font-weight:600}
.severity-critica{background:#fee2e2;color:#991b1b}.severity-alta{background:#fef3c7;color:#92400e}
.severity-media{background:#e0f2fe;color:#075985}.severity-baixa{background:#f1f5f9;color:#64748b}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}th{background:#f8fafc;padding:8px 12px;text-align:left;font-weight:600;font-size:11px;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0}
td{padding:8px 12px;border-bottom:1px solid #f1f5f9}.footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 48px;font-size:11px;color:#94a3b8;text-align:center}
.print-bar{background:#0f172a;color:white;padding:10px 48px;display:flex;justify-content:space-between;align-items:center}
.print-bar button{background:#0d9488;color:white;border:none;padding:8px 20px;border-radius:6px;font-weight:600;cursor:pointer}
@media print{.print-bar{display:none}.container{box-shadow:none}}</style></head><body>
<div class="print-bar"><span style="font-size:12px;opacity:.7">Ctrl+P para salvar como PDF</span><button onclick="window.print()">🖨️ Imprimir / PDF</button></div>
<div class="container">
<div class="header"><h1>Comunicação de Incidente de Segurança</h1><p>Conforme Art. 48 da Lei Geral de Proteção de Dados (Lei 13.709/2018)</p></div>
<div class="body">
<div class="section"><h2>1. Identificação do Incidente</h2>
<div class="field"><div class="field-label">Título</div><div class="field-value">${selected.title}</div></div>
<div class="field"><div class="field-label">Categoria</div><div class="field-value">${categoryLabels[selected.category]}</div></div>
<div class="field"><div class="field-label">Severidade</div><div class="field-value"><span class="badge severity-${selected.severity}">${severityLabels[selected.severity]}</span></div></div>
<div class="field"><div class="field-label">Status Atual</div><div class="field-value">${statusLabels[selected.status]}</div></div>
<div class="field"><div class="field-label">Data da Detecção</div><div class="field-value">${new Date(selected.detected_at).toLocaleString("pt-BR")}</div></div>
${selected.contained_at ? `<div class="field"><div class="field-label">Data da Contenção</div><div class="field-value">${new Date(selected.contained_at).toLocaleString("pt-BR")}</div></div>` : ''}
</div>
<div class="section"><h2>2. Descrição do Incidente</h2><p style="font-size:14px">${selected.description}</p></div>
<div class="section"><h2>3. Dados Pessoais Afetados</h2>
<div class="field"><div class="field-label">Tipos de Dados</div><div class="field-value">${selected.affected_data_types.length > 0 ? selected.affected_data_types.join(", ") : "Não especificado"}</div></div>
<div class="field"><div class="field-label">Número Estimado de Titulares Afetados</div><div class="field-value">${selected.affected_count || "A ser determinado"}</div></div>
</div>
<div class="section"><h2>4. Análise e Resposta</h2>
<div class="field"><div class="field-label">Causa Raiz</div><div class="field-value">${selected.root_cause || "Em investigação"}</div></div>
<div class="field"><div class="field-label">Ações Corretivas</div><div class="field-value">${selected.corrective_actions || "A definir"}</div></div>
<div class="field"><div class="field-label">Ações Preventivas</div><div class="field-value">${selected.preventive_actions || "A definir"}</div></div>
</div>
<div class="section"><h2>5. Linha do Tempo</h2>
<table><thead><tr><th>Data/Hora</th><th>Ação</th></tr></thead>
<tbody>${timeline.map(t => `<tr><td style="white-space:nowrap">${new Date(t.created_at).toLocaleString("pt-BR")}</td><td>${t.action}${t.details ? `<br><span style="color:#94a3b8;font-size:12px">${t.details}</span>` : ''}</td></tr>`).join('')}</tbody></table>
</div>
</div>
<div class="footer"><p>Documento gerado pelo Privacy Shield — Plataforma de Conformidade LGPD</p><p>Este documento é confidencial e destinado à ANPD conforme Art. 48 da LGPD.</p></div>
</div></body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    window.open(URL.createObjectURL(blob), "_blank");
    toast({ title: "Comunicado ANPD gerado" });
  };

  const filteredIncidents = useMemo(() => {
    if (statusFilter === "all") return incidents;
    return incidents.filter(i => i.status === statusFilter);
  }, [incidents, statusFilter]);

  const kpis = useMemo(() => ({
    total: incidents.length,
    active: incidents.filter(i => i.status !== "encerrado").length,
    critical: incidents.filter(i => i.severity === "critica" && i.status !== "encerrado").length,
    reportedAnpd: incidents.filter(i => i.reported_to_anpd).length,
  }), [incidents]);

  const formatDateTime = (d: string) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  // ── Detail View ──
  if (selected) {
    const currentIdx = statusFlow.indexOf(selected.status);
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setTimeline([]); }}>← Voltar</Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl font-bold">{selected.title}</h1>
          </div>
          <Badge className={severityColors[selected.severity]}>{severityLabels[selected.severity]}</Badge>
          <Badge className={statusColors[selected.status]}>{statusLabels[selected.status]}</Badge>
        </div>

        {/* Status Flow */}
        <Card className="shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-1 overflow-x-auto">
              {statusFlow.map((s, i) => (
                <div key={s} className="flex items-center gap-1">
                  <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap ${i <= currentIdx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {i <= currentIdx ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                    {statusLabels[s]}
                  </div>
                  {i < statusFlow.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                </div>
              ))}
            </div>
            {currentIdx < statusFlow.length - 1 && (
              <Button size="sm" className="mt-3" onClick={advanceStatus}>
                <Zap className="mr-1.5 h-3.5 w-3.5" /> Avançar para: {statusLabels[statusFlow[currentIdx + 1]]}
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Info + Actions */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="shadow-card">
              <CardHeader><CardTitle className="text-base">Detalhes do Incidente</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-secondary/50 p-4 text-sm">{selected.description}</div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">Categoria</Label><p className="text-sm font-medium">{categoryLabels[selected.category]}</p></div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">Titulares Afetados</Label><p className="text-sm font-medium">{selected.affected_count || "N/A"}</p></div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">Tipos de Dados</Label><p className="text-sm font-medium">{selected.affected_data_types.join(", ") || "N/A"}</p></div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">Detectado em</Label><p className="text-sm font-medium">{formatDateTime(selected.detected_at)}</p></div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader><CardTitle className="text-base">Análise e Remediação</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Causa Raiz</Label>
                  <Textarea defaultValue={selected.root_cause || ""} placeholder="Descreva a causa raiz identificada..." rows={2}
                    onBlur={e => updateIncidentField("root_cause", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Ações Corretivas</Label>
                  <Textarea defaultValue={selected.corrective_actions || ""} placeholder="Ações tomadas para corrigir..." rows={2}
                    onBlur={e => updateIncidentField("corrective_actions", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Ações Preventivas</Label>
                  <Textarea defaultValue={selected.preventive_actions || ""} placeholder="Medidas para evitar recorrência..." rows={2}
                    onBlur={e => updateIncidentField("preventive_actions", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Notas do DPO</Label>
                  <Textarea defaultValue={selected.dpo_notes || ""} placeholder="Observações do encarregado..." rows={2}
                    onBlur={e => updateIncidentField("dpo_notes", e.target.value)} />
                </div>
              </CardContent>
            </Card>

            {/* ANPD Actions */}
            <Card className="shadow-card border-amber-500/30">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-amber-500" /> Comunicação ANPD (Art. 48 LGPD)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <Button variant={selected.reported_to_anpd ? "secondary" : "default"} size="sm"
                    onClick={() => { updateIncidentField("reported_to_anpd", true); updateIncidentField("anpd_report_date", new Date().toISOString()); addTimelineEntry("Incidente comunicado à ANPD"); }}>
                    {selected.reported_to_anpd ? <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
                    {selected.reported_to_anpd ? "Comunicado à ANPD" : "Marcar como Comunicado"}
                  </Button>
                  <Button variant={selected.reported_to_subjects ? "secondary" : "outline"} size="sm"
                    onClick={() => { updateIncidentField("reported_to_subjects", true); addTimelineEntry("Titulares afetados notificados"); }}>
                    <Users className="mr-1.5 h-3.5 w-3.5" />
                    {selected.reported_to_subjects ? "Titulares Notificados" : "Notificar Titulares"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={generateAnpdReport}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Gerar Comunicado ANPD
                  </Button>
                </div>
                {selected.reported_to_anpd && selected.anpd_report_date && (
                  <p className="text-xs text-muted-foreground">Comunicado em: {formatDateTime(selected.anpd_report_date)}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Linha do Tempo</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-0">
                {timeline.map((t, i) => (
                  <div key={t.id} className={`flex gap-3 py-3 ${i < timeline.length - 1 ? "border-b border-border/50" : ""}`}>
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent">
                      <ChevronRight className="h-3 w-3 text-accent-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{t.action}</p>
                      {t.details && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.details}</p>}
                      <p className="text-[11px] text-muted-foreground mt-0.5">{formatDateTime(t.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="my-3" />
              <div className="flex gap-2">
                <Input placeholder="Adicionar evento..." id="timeline-input" className="h-8 text-xs" onKeyDown={e => {
                  if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value; if (v.trim()) { addTimelineEntry(v); (e.target as HTMLInputElement).value = ""; } }
                }} />
                <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => {
                  const el = document.getElementById("timeline-input") as HTMLInputElement;
                  if (el?.value.trim()) { addTimelineEntry(el.value); el.value = ""; }
                }}><Plus className="h-3.5 w-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── List View ──
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Gestão de <span className="text-gradient-emerald">Incidentes</span>
          </h1>
          <p className="mt-1 text-muted-foreground">Registro e gestão de incidentes de segurança com dados pessoais</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="shadow-glow"><Plus className="mr-1.5 h-4 w-4" /> Registrar Incidente</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Registrar Incidente</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Título</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Vazamento de base de clientes" /></div>
              <div className="space-y-2"><Label>Descrição detalhada</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descreva o que aconteceu, quando e como foi detectado..." rows={4} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Severidade</Label>
                  <Select value={form.severity} onValueChange={v => setForm(p => ({ ...p, severity: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(severityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Categoria</Label>
                  <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Tipos de dados afetados</Label><Input value={form.affected_data_types} onChange={e => setForm(p => ({ ...p, affected_data_types: e.target.value }))} placeholder="CPF, e-mail, telefone..." /></div>
                <div className="space-y-2"><Label>Nº titulares afetados</Label><Input type="number" value={form.affected_count} onChange={e => setForm(p => ({ ...p, affected_count: e.target.value }))} /></div>
              </div>
              <Button onClick={createIncident} className="w-full" variant="destructive" disabled={!form.title.trim() || !form.description.trim()}>
                <AlertTriangle className="mr-1.5 h-4 w-4" /> Registrar Incidente
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-muted-foreground">Total de Incidentes</p><p className="mt-1 font-display text-2xl font-bold">{kpis.total}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent"><Flame className="h-5 w-5 text-accent-foreground" /></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-muted-foreground">Ativos</p><p className="mt-1 font-display text-2xl font-bold text-amber-600">{kpis.active}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent"><AlertTriangle className="h-5 w-5 text-accent-foreground" /></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-muted-foreground">Críticos Abertos</p><p className="mt-1 font-display text-2xl font-bold text-destructive">{kpis.critical}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent"><XCircle className="h-5 w-5 text-accent-foreground" /></div></div></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-muted-foreground">Comunicados à ANPD</p><p className="mt-1 font-display text-2xl font-bold text-primary">{kpis.reportedAnpd}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent"><Shield className="h-5 w-5 text-accent-foreground" /></div></div></CardContent></Card>
      </div>

      {/* Filter + List */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">{filteredIncidents.length} incidente(s)</p>
      </div>

      {filteredIncidents.length === 0 ? (
        <Card className="shadow-card"><CardContent className="py-16 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-muted-foreground">Nenhum incidente registrado.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filteredIncidents.map((inc, i) => (
            <motion.div key={inc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="shadow-card cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelected(inc)}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <AlertTriangle className={`h-4 w-4 ${inc.severity === "critica" ? "text-destructive" : inc.severity === "alta" ? "text-amber-500" : "text-muted-foreground"}`} />
                        <p className="font-display text-sm font-bold">{inc.title}</p>
                        <Badge className={severityColors[inc.severity]}>{severityLabels[inc.severity]}</Badge>
                        <Badge className={statusColors[inc.status]}>{statusLabels[inc.status]}</Badge>
                        {inc.reported_to_anpd && <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">ANPD ✓</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{inc.description}</p>
                      <p className="text-[11px] text-muted-foreground">{categoryLabels[inc.category]} · {formatDateTime(inc.detected_at)} · {inc.affected_count} titular(es)</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
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
