import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Building2, Plus, Trash2, CheckCircle2, XCircle, Clock,
  Shield, ChevronRight, AlertTriangle, Eye, Search, Filter,
  BarChart3, Download, TrendingUp, ExternalLink, Link2, Copy
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
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// ── Types ──
interface Supplier {
  id: string; name: string; cnpj: string | null; contact_name: string | null;
  contact_email: string | null; category: string; services_description: string | null;
  data_shared: string | null; has_dpa: boolean; dpa_expires_at: string | null;
  risk_level: string; status: string; overall_score: number;
  last_assessment_at: string | null; notes: string | null; created_at: string;
}

interface Assessment {
  id: string; supplier_id: string; question: string; category: string;
  answer: string | null; score: number; notes: string | null;
}

// ── Constants ──
const riskLabels: Record<string, string> = { baixo: "Baixo", medio: "Médio", alto: "Alto", critico: "Crítico" };
const riskColors: Record<string, string> = { baixo: "bg-primary/15 text-primary", medio: "bg-amber-500/15 text-amber-600", alto: "bg-orange-500/15 text-orange-600", critico: "bg-destructive/15 text-destructive" };
const statusLabels: Record<string, string> = { pendente: "Pendente", aprovado: "Aprovado", reprovado: "Reprovado", em_revisao: "Em Revisão" };
const statusColors: Record<string, string> = { pendente: "bg-amber-500/15 text-amber-600", aprovado: "bg-primary/15 text-primary", reprovado: "bg-destructive/15 text-destructive", em_revisao: "bg-sky-500/15 text-sky-600" };
const categoryLabels: Record<string, string> = { tecnologia: "Tecnologia", cloud: "Cloud/SaaS", marketing: "Marketing", rh: "RH/Folha", juridico: "Jurídico", logistica: "Logística", financeiro: "Financeiro", outro: "Outro" };
const PIE_COLORS = ["hsl(162, 63%, 35%)", "hsl(45, 93%, 47%)", "hsl(0, 72%, 51%)"];

const ASSESSMENT_TEMPLATE = [
  { category: "Governança", question: "Possui Política de Privacidade publicada e atualizada?" },
  { category: "Governança", question: "Possui DPO/Encarregado de dados designado?" },
  { category: "Governança", question: "Realiza treinamentos de privacidade com colaboradores?" },
  { category: "Governança", question: "Possui programa de conformidade LGPD implementado?" },
  { category: "Segurança", question: "Utiliza criptografia para dados em repouso e em trânsito?" },
  { category: "Segurança", question: "Possui controles de acesso baseados em função (RBAC)?" },
  { category: "Segurança", question: "Realiza testes de segurança (pentest) periodicamente?" },
  { category: "Segurança", question: "Possui plano de resposta a incidentes documentado?" },
  { category: "Segurança", question: "Mantém logs de auditoria de acessos a dados pessoais?" },
  { category: "Contratual", question: "Possui DPA (Data Processing Agreement) vigente?" },
  { category: "Contratual", question: "Cláusulas de confidencialidade e proteção de dados no contrato?" },
  { category: "Contratual", question: "Permite auditoria pelo controlador nos termos do contrato?" },
  { category: "Contratual", question: "Possui SLA definido para notificação de incidentes?" },
  { category: "Dados", question: "Trata apenas os dados estritamente necessários (minimização)?" },
  { category: "Dados", question: "Possui política de retenção e descarte de dados?" },
  { category: "Dados", question: "Realiza transferência internacional de dados?" },
  { category: "Dados", question: "Possui mecanismos para atender direitos de titulares?" },
  { category: "Subcontratados", question: "Possui controle sobre sub-operadores/subcontratados?" },
  { category: "Subcontratados", question: "Sub-operadores possuem nível de proteção equivalente?" },
];

const assessmentCategories = [...new Set(ASSESSMENT_TEMPLATE.map(t => t.category))];

// ── Component ──
export default function Fornecedores() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Core state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [allAssessments, setAllAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Supplier | null>(null);

  // UI state
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("info");
  const [mainTab, setMainTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");

  // External link state
  const [externalLinkOpen, setExternalLinkOpen] = useState(false);
  const [externalLink, setExternalLink] = useState<string | null>(null);
  const [externalLinkSupplier, setExternalLinkSupplier] = useState<Supplier | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "", cnpj: "", contact_name: "", contact_email: "",
    category: "tecnologia", services_description: "", data_shared: "",
  });

  // ── Data Fetching ──
  const fetchSuppliers = async () => {
    setLoading(true);
    const { data } = await supabase.from("suppliers").select("*").order("created_at", { ascending: false });
    if (data) setSuppliers(data as unknown as Supplier[]);
    setLoading(false);
  };

  const fetchAllAssessments = async () => {
    const { data } = await supabase.from("supplier_assessments").select("*").order("category");
    if (data) setAllAssessments(data as unknown as Assessment[]);
  };

  const fetchAssessments = async (supplierId: string) => {
    const { data } = await supabase.from("supplier_assessments").select("*").eq("supplier_id", supplierId).order("category");
    if (data) setAssessments(data as unknown as Assessment[]);
  };

  useEffect(() => { fetchSuppliers(); fetchAllAssessments(); }, []);
  useEffect(() => { if (selected) { fetchAssessments(selected.id); setActiveTab("info"); } }, [selected]);

  // ── CRUD Operations ──
  const createSupplier = async () => {
    if (!user || !form.name.trim()) return;
    const { error } = await supabase.from("suppliers").insert({
      user_id: user.id, name: form.name, cnpj: form.cnpj || null,
      contact_name: form.contact_name || null, contact_email: form.contact_email || null,
      category: form.category, services_description: form.services_description || null,
      data_shared: form.data_shared || null,
    }).select().single();
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Fornecedor adicionado com sucesso!" });
    setCreateOpen(false);
    setForm({ name: "", cnpj: "", contact_name: "", contact_email: "", category: "tecnologia", services_description: "", data_shared: "" });
    fetchSuppliers();
  };

  const deleteSupplier = async (id: string) => {
    await supabase.from("suppliers").delete().eq("id", id);
    if (selected?.id === id) { setSelected(null); setAssessments([]); }
    toast({ title: "Fornecedor removido" });
    fetchSuppliers();
  };

  const updateSupplierField = async (field: string, value: unknown) => {
    if (!selected) return;
    const { error } = await supabase.from("suppliers").update({ [field]: value } as any).eq("id", selected.id);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    const updated = { ...selected, [field]: value };
    setSelected(updated);
    setSuppliers(prev => prev.map(s => s.id === selected.id ? { ...s, [field]: value } : s));
  };

  // ── Assessment Operations ──
  const startAssessment = async () => {
    if (!selected || !user) return;
    await supabase.from("supplier_assessments").delete().eq("supplier_id", selected.id);
    const rows = ASSESSMENT_TEMPLATE.map(t => ({
      supplier_id: selected.id, user_id: user.id, question: t.question, category: t.category, score: 0,
    }));
    await supabase.from("supplier_assessments").insert(rows);
    await supabase.from("suppliers").update({ status: "em_revisao" as any, last_assessment_at: new Date().toISOString() } as any).eq("id", selected.id);
    toast({ title: "Avaliação iniciada com " + ASSESSMENT_TEMPLATE.length + " perguntas" });
    fetchAssessments(selected.id);
    setSelected({ ...selected, status: "em_revisao" });
    setActiveTab("assessment");
  };

  const updateAssessmentScore = async (assessmentId: string, score: number) => {
    await supabase.from("supplier_assessments").update({ score } as any).eq("id", assessmentId);
    setAssessments(prev => prev.map(a => a.id === assessmentId ? { ...a, score } : a));
  };

  const updateAssessmentAnswer = async (assessmentId: string, answer: string) => {
    await supabase.from("supplier_assessments").update({ answer } as any).eq("id", assessmentId);
  };

  const completeAssessment = async () => {
    if (!selected) return;
    const totalScore = assessments.reduce((s, a) => s + a.score, 0);
    const maxScore = assessments.length * 3;
    const pct = Math.round((totalScore / Math.max(maxScore, 1)) * 100);
    const risk = pct >= 80 ? "baixo" : pct >= 60 ? "medio" : pct >= 40 ? "alto" : "critico";
    const status = pct >= 60 ? "aprovado" : "reprovado";
    await supabase.from("suppliers").update({
      overall_score: pct, risk_level: risk as any, status: status as any,
    } as any).eq("id", selected.id);
    setSelected({ ...selected, overall_score: pct, risk_level: risk, status });
    toast({ title: `Avaliação concluída — Score: ${pct}% — ${status === "aprovado" ? "Aprovado" : "Reprovado"}` });
    fetchSuppliers();
    fetchAllAssessments();
  };

  // ── External Link ──
  const generateExternalLink = async (supplier: Supplier) => {
    if (!user) return;
    setGeneratingLink(true);
    try {
      const { data, error } = await supabase.from("supplier_assessment_tokens").insert({
        supplier_id: supplier.id,
        created_by: user.id,
        supplier_name: supplier.name,
        supplier_email: supplier.contact_email || null,
      }).select("token").single();
      if (error) throw error;
      const baseUrl = "https://privacy-shield-automata.lovable.app";
      const link = `${baseUrl}/avaliacao-externa/${data.token}`;
      setExternalLink(link);
      setExternalLinkSupplier(supplier);
      setExternalLinkOpen(true);
      toast({ title: "Link gerado com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao gerar link", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyLink = async () => {
    if (!externalLink) return;

    try {
      await navigator.clipboard.writeText(externalLink);
      toast({ title: "Link copiado para a área de transferência!" });
    } catch {
      toast({ title: "Não foi possível copiar automaticamente", description: "Selecione o link e copie manualmente.", variant: "destructive" });
    }
  };

  // ── Computed Data ──
  const filteredSuppliers = useMemo(() => {
    let list = suppliers;
    if (statusFilter !== "all") list = list.filter(s => s.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || (s.cnpj && s.cnpj.includes(q)) || categoryLabels[s.category]?.toLowerCase().includes(q));
    }
    return list;
  }, [suppliers, statusFilter, searchQuery]);

  const kpis = useMemo(() => {
    const avgScore = suppliers.length > 0
      ? Math.round(suppliers.reduce((s, sup) => s + sup.overall_score, 0) / suppliers.length)
      : 0;
    return {
      total: suppliers.length,
      avgScore,
      approved: suppliers.filter(s => s.status === "aprovado").length,
      highRisk: suppliers.filter(s => s.risk_level === "alto" || s.risk_level === "critico").length,
      noDpa: suppliers.filter(s => !s.has_dpa).length,
    };
  }, [suppliers]);

  const riskDistribution = useMemo(() => {
    const low = suppliers.filter(s => s.risk_level === "baixo").length;
    const med = suppliers.filter(s => s.risk_level === "medio").length;
    const high = suppliers.filter(s => s.risk_level === "alto" || s.risk_level === "critico").length;
    return [
      { name: "Baixo Risco", value: low },
      { name: "Médio Risco", value: med },
      { name: "Alto Risco", value: high },
    ].filter(d => d.value > 0);
  }, [suppliers]);

  const categoryAvg = useMemo(() => {
    const cats: Record<string, { total: number; max: number }> = {};
    allAssessments.forEach(a => {
      if (!cats[a.category]) cats[a.category] = { total: 0, max: 0 };
      cats[a.category].total += a.score;
      cats[a.category].max += 3;
    });
    return Object.entries(cats).map(([cat, { total, max }]) => ({
      name: cat, score: Math.round((total / Math.max(max, 1)) * 100),
    }));
  }, [allAssessments]);

  const scoreEvolution = useMemo(() => {
    const months: { name: string; score: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const relevantSuppliers = suppliers.filter(s => new Date(s.created_at) <= endOfMonth);
      const avg = relevantSuppliers.length > 0
        ? Math.round(relevantSuppliers.reduce((sum, s) => sum + s.overall_score, 0) / relevantSuppliers.length)
        : 0;
      months.push({ name: label, score: avg });
    }
    return months;
  }, [suppliers]);

  const attentionSuppliers = useMemo(() => {
    return suppliers
      .filter(s => s.risk_level === "alto" || s.risk_level === "critico" || s.overall_score < 60)
      .sort((a, b) => a.overall_score - b.overall_score)
      .slice(0, 5);
  }, [suppliers]);

  const assessedCount = useMemo(() => {
    return new Set(allAssessments.map(a => a.supplier_id)).size;
  }, [allAssessments]);

  const scoreByCategory = useMemo(() => {
    const cats: Record<string, { total: number; score: number }> = {};
    assessments.forEach(a => {
      if (!cats[a.category]) cats[a.category] = { total: 0, score: 0 };
      cats[a.category].total += 3;
      cats[a.category].score += a.score;
    });
    return Object.entries(cats).map(([cat, { total, score }]) => ({
      category: cat, pct: Math.round((score / Math.max(total, 1)) * 100),
    }));
  }, [assessments]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");

  // ── Export Report ──
  const exportReport = () => {
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório de Fornecedores</title>
    <style>body{font-family:system-ui,sans-serif;padding:40px;color:#1a1a2e}h1{color:#1a1a2e;border-bottom:3px solid #1a9a6a;padding-bottom:12px}
    .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:24px 0}.kpi{background:#f8fafb;border:1px solid #e2e8f0;border-radius:12px;padding:20px;text-align:center}
    .kpi h3{font-size:28px;margin:0;color:#1a9a6a}.kpi p{margin:4px 0;color:#64748b;font-size:13px}
    table{width:100%;border-collapse:collapse;margin:24px 0}th,td{padding:10px 14px;text-align:left;border-bottom:1px solid #e2e8f0}
    th{background:#f1f5f9;font-size:12px;text-transform:uppercase;color:#64748b}
    .badge{display:inline-block;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:600}
    .risk-baixo{background:#dcfce7;color:#166534}.risk-medio{background:#fef3c7;color:#92400e}
    .risk-alto{background:#ffedd5;color:#9a3412}.risk-critico{background:#fee2e2;color:#991b1b}
    @media print{body{padding:20px}}</style></head><body>
    <h1>📋 Relatório de Avaliação de Fornecedores</h1>
    <p style="color:#64748b">Gerado em ${new Date().toLocaleString("pt-BR")} | Total: ${suppliers.length} fornecedores</p>
    <div class="kpi-grid">
      <div class="kpi"><h3>${kpis.total}</h3><p>Total de Fornecedores</p></div>
      <div class="kpi"><h3>${kpis.avgScore}%</h3><p>Score Médio LGPD</p></div>
      <div class="kpi"><h3>${kpis.approved}</h3><p>Aprovados</p></div>
      <div class="kpi"><h3 style="color:#dc2626">${kpis.highRisk}</h3><p>Risco Alto/Crítico</p></div>
    </div>
    <table><thead><tr><th>Fornecedor</th><th>Categoria</th><th>CNPJ</th><th>Score</th><th>Risco</th><th>Status</th><th>DPA</th></tr></thead>
    <tbody>${suppliers.map(s => `<tr><td><strong>${s.name}</strong></td><td>${categoryLabels[s.category]}</td><td>${s.cnpj || "—"}</td>
    <td>${s.overall_score}%</td><td><span class="badge risk-${s.risk_level}">${riskLabels[s.risk_level]}</span></td>
    <td>${statusLabels[s.status]}</td><td>${s.has_dpa ? "Sim" : "Não"}</td></tr>`).join("")}</tbody></table>
    </body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  // ── Loading ──
  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  // ══════════════════════════════════════════
  // ── DETAIL VIEW (when a supplier is selected)
  // ══════════════════════════════════════════
  if (selected) {
    const score = selected.overall_score;
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setAssessments([]); }}>← Voltar</Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl font-bold">{selected.name}</h1>
            {selected.cnpj && <p className="text-xs text-muted-foreground">CNPJ: {selected.cnpj}</p>}
          </div>
          <Badge className={riskColors[selected.risk_level]}>Risco: {riskLabels[selected.risk_level]}</Badge>
          <Badge className={statusColors[selected.status]}>{statusLabels[selected.status]}</Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="info" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Informações</TabsTrigger>
            <TabsTrigger value="assessment" className="gap-1.5"><Shield className="h-3.5 w-3.5" /> Avaliação</TabsTrigger>
          </TabsList>

          {/* ── Info Tab ── */}
          <TabsContent value="info">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="shadow-card lg:col-span-2">
                <CardHeader><CardTitle className="text-base">Dados do Fornecedor</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1"><Label className="text-xs text-muted-foreground">Categoria</Label><p className="text-sm font-medium">{categoryLabels[selected.category]}</p></div>
                    <div className="space-y-1"><Label className="text-xs text-muted-foreground">Contato</Label><p className="text-sm font-medium">{selected.contact_name || "—"}</p><p className="text-xs text-muted-foreground">{selected.contact_email || ""}</p></div>
                  </div>
                  <div className="space-y-2"><Label>Serviços prestados</Label>
                    <Textarea defaultValue={selected.services_description || ""} placeholder="Descreva os serviços..." rows={2} onBlur={e => updateSupplierField("services_description", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Dados compartilhados</Label>
                    <Textarea defaultValue={selected.data_shared || ""} placeholder="Quais dados pessoais são compartilhados..." rows={2} onBlur={e => updateSupplierField("data_shared", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Observações</Label>
                    <Textarea defaultValue={selected.notes || ""} placeholder="Notas adicionais..." rows={2} onBlur={e => updateSupplierField("notes", e.target.value)} /></div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {/* Score Card */}
                <Card className="shadow-card">
                  <CardContent className="p-5 text-center">
                    <p className={`font-display text-3xl font-bold ${score >= 80 ? "text-primary" : score >= 60 ? "text-amber-500" : score >= 40 ? "text-orange-500" : "text-destructive"}`}>{score}%</p>
                    <p className="text-xs text-muted-foreground">Score de Conformidade</p>
                    <Progress value={score} className="mt-2 h-2" />
                  </CardContent>
                </Card>

                {/* Actions Card */}
                <Card className="shadow-card">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">DPA/Contrato</span>
                      <Checkbox checked={selected.has_dpa} onCheckedChange={v => updateSupplierField("has_dpa", v)} />
                    </div>
                    {selected.has_dpa && (
                      <div className="space-y-1">
                        <Label className="text-xs">Validade do DPA</Label>
                        <Input type="date" value={selected.dpa_expires_at || ""} onChange={e => updateSupplierField("dpa_expires_at", e.target.value || null)} />
                      </div>
                    )}
                    <Separator />
                    <Button className="w-full" size="sm" onClick={startAssessment}>
                      <Shield className="mr-1.5 h-3.5 w-3.5" /> {assessments.length > 0 ? "Refazer Avaliação" : "Iniciar Avaliação"}
                    </Button>
                    <Button className="w-full" size="sm" variant="outline" onClick={() => generateExternalLink(selected)} disabled={generatingLink}>
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> {generatingLink ? "Gerando..." : "Enviar Link Externo"}
                    </Button>
                  </CardContent>
                </Card>

                {/* Score by Category */}
                {scoreByCategory.length > 0 && (
                  <Card className="shadow-card">
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Score por Categoria</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {scoreByCategory.map(s => (
                        <div key={s.category} className="space-y-1">
                          <div className="flex justify-between text-xs"><span className="text-muted-foreground">{s.category}</span><span className="font-semibold">{s.pct}%</span></div>
                          <Progress value={s.pct} className="h-1.5" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── Assessment Tab ── */}
          <TabsContent value="assessment">
            {assessments.length === 0 ? (
              <Card className="shadow-card"><CardContent className="py-16 text-center">
                <Shield className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 text-muted-foreground">Nenhuma avaliação iniciada.</p>
                <div className="flex justify-center gap-3 mt-4">
                  <Button onClick={startAssessment}><Plus className="mr-1.5 h-4 w-4" /> Iniciar Avaliação</Button>
                  <Button variant="outline" onClick={() => generateExternalLink(selected)} disabled={generatingLink}>
                    <ExternalLink className="mr-1.5 h-4 w-4" /> Enviar Link Externo
                  </Button>
                </div>
              </CardContent></Card>
            ) : (
              <div className="space-y-4">
                {assessmentCategories.map(cat => {
                  const catAssessments = assessments.filter(a => a.category === cat);
                  if (catAssessments.length === 0) return null;
                  return (
                    <Card key={cat} className="shadow-card">
                      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> {cat}</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        {catAssessments.map(a => (
                          <div key={a.id} className={`rounded-lg border p-4 ${a.score >= 2 ? "border-primary/20 bg-primary/5" : a.score === 1 ? "border-amber-500/20 bg-amber-500/5" : "border-border bg-card"}`}>
                            <p className="text-sm font-medium mb-2">{a.question}</p>
                            <div className="flex items-center gap-2 mb-2">
                              {[0, 1, 2, 3].map(s => (
                                <Button key={s} size="sm" variant={a.score === s ? "default" : "outline"}
                                  className="h-8 w-8 p-0 text-xs"
                                  onClick={() => updateAssessmentScore(a.id, s)}>
                                  {s}
                                </Button>
                              ))}
                              <span className="text-xs text-muted-foreground ml-2">
                                {a.score === 0 ? "Não atende" : a.score === 1 ? "Parcial" : a.score === 2 ? "Atende" : "Excelente"}
                              </span>
                            </div>
                            <Input placeholder="Observações..." defaultValue={a.answer || ""} className="h-8 text-xs"
                              onBlur={e => updateAssessmentAnswer(a.id, e.target.value)} />
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}
                <Button onClick={completeAssessment} className="w-full shadow-glow">
                  <CheckCircle2 className="mr-1.5 h-4 w-4" /> Finalizar Avaliação e Calcular Score
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // ══════════════════════════════════════════
  // ── MAIN VIEW
  // ══════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Avaliação de <span className="text-gradient-emerald">Fornecedores</span>
          </h1>
          <p className="mt-1 text-muted-foreground">Gerencie e avalie a conformidade LGPD dos seus fornecedores e terceiros</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportReport}>
            <Download className="mr-1.5 h-4 w-4" /> Exportar
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-glow"><Plus className="mr-1.5 h-4 w-4" /> Novo Fornecedor</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Adicionar Fornecedor</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Nome *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Empresa XYZ" /></div>
                  <div className="space-y-2"><Label>CNPJ</Label><Input value={form.cnpj} onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" /></div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Contato</Label><Input value={form.contact_name} onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))} placeholder="Nome do responsável" /></div>
                  <div className="space-y-2"><Label>E-mail</Label><Input value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} placeholder="contato@empresa.com" /></div>
                </div>
                <div className="space-y-2"><Label>Categoria</Label>
                  <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Serviços prestados</Label>
                  <Textarea value={form.services_description} onChange={e => setForm(p => ({ ...p, services_description: e.target.value }))} placeholder="Descreva os serviços..." rows={2} /></div>
                <div className="space-y-2"><Label>Dados compartilhados</Label>
                  <Textarea value={form.data_shared} onChange={e => setForm(p => ({ ...p, data_shared: e.target.value }))} placeholder="Quais dados pessoais são compartilhados..." rows={2} /></div>
                <Button onClick={createSupplier} className="w-full" disabled={!form.name.trim()}>Adicionar Fornecedor</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="h-auto gap-1 flex-wrap">
          <TabsTrigger value="dashboard" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Dashboard</TabsTrigger>
          <TabsTrigger value="fornecedores" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Fornecedores ({suppliers.length})</TabsTrigger>
          <TabsTrigger value="avaliacoes" className="gap-1.5"><Shield className="h-3.5 w-3.5" /> Avaliações ({assessedCount})</TabsTrigger>
        </TabsList>

        {/* ════════════ DASHBOARD TAB ════════════ */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total de Fornecedores", value: kpis.total, icon: Building2, color: "primary", sub: `${suppliers.filter(s => { const d = new Date(s.created_at); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length} este mês`, subIcon: TrendingUp },
              { label: "Score Médio LGPD", value: `${kpis.avgScore}%`, icon: BarChart3, color: "sky-500", sub: "Conformidade geral", subIcon: BarChart3 },
              { label: "Fornecedores Aprovados", value: kpis.approved, icon: CheckCircle2, color: "emerald-500", sub: `${kpis.total > 0 ? Math.round((kpis.approved / kpis.total) * 100) : 0}% do total`, subIcon: CheckCircle2 },
              { label: "Fornecedores Críticos", value: kpis.highRisk, icon: XCircle, color: "destructive", sub: `${kpis.highRisk} requerem ação`, subIcon: AlertTriangle },
            ].map((kpi, i) => (
              <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className={`shadow-card border-l-4 border-l-${kpi.color}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                        <p className="mt-1 font-display text-3xl font-bold">{kpi.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          <kpi.subIcon className="inline h-3 w-3 mr-1" />{kpi.sub}
                        </p>
                      </div>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${kpi.color}/10`}>
                        <kpi.icon className={`h-5 w-5 text-${kpi.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="shadow-card">
              <CardHeader><CardTitle className="text-base">Distribuição por Risco</CardTitle></CardHeader>
              <CardContent>
                {riskDistribution.length > 0 ? (
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                          {riskDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => [v, "Fornecedores"]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 mt-2 text-xs">
                      {riskDistribution.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-muted-foreground">{d.name}</span>
                          <span className="font-semibold">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">Nenhum dado disponível</div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader><CardTitle className="text-base">Média por Categoria</CardTitle></CardHeader>
              <CardContent>
                {categoryAvg.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={categoryAvg}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip formatter={(v: number) => [`${v}%`, "Score"]} />
                      <Bar dataKey="score" fill="hsl(162, 63%, 35%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">Realize avaliações para ver dados</div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader><CardTitle className="text-base">Evolução do Score Médio</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={scoreEvolution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip formatter={(v: number) => [`${v}%`, "Score Médio"]} />
                    <Line type="monotone" dataKey="score" stroke="hsl(162, 63%, 35%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(162, 63%, 35%)" }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Attention List */}
          {attentionSuppliers.length > 0 && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Fornecedores que Requerem Atenção
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {attentionSuppliers.map(s => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                        <Building2 className="h-5 w-5 text-destructive" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{categoryLabels[s.category]} — Score: {s.overall_score}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={riskColors[s.risk_level]}>{riskLabels[s.risk_level]}</Badge>
                      <Button variant="outline" size="sm" onClick={() => { setSelected(s); setMainTab("fornecedores"); }}>
                        <Eye className="mr-1 h-3.5 w-3.5" /> Detalhes
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ════════════ FORNECEDORES TAB ════════════ */}
        <TabsContent value="fornecedores" className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar fornecedor..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><Filter className="mr-1.5 h-3.5 w-3.5" /><SelectValue placeholder="Filtrar status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">{filteredSuppliers.length} fornecedor(es)</p>
          </div>

          {filteredSuppliers.length === 0 ? (
            <Card className="shadow-card"><CardContent className="py-16 text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <p className="mt-4 font-medium text-muted-foreground">Nenhum fornecedor encontrado.</p>
              <p className="text-xs text-muted-foreground mt-1">Adicione um fornecedor clicando em "Novo Fornecedor" acima.</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {filteredSuppliers.map((s, i) => (
                <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card className="shadow-card cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelected(s)}>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.overall_score >= 60 ? "bg-primary/10" : s.overall_score > 0 ? "bg-destructive/10" : "bg-muted"}`}>
                            <Building2 className={`h-5 w-5 ${s.overall_score >= 60 ? "text-primary" : s.overall_score > 0 ? "text-destructive" : "text-muted-foreground"}`} />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-display text-sm font-bold">{s.name}</p>
                              <Badge className={statusColors[s.status]}>{statusLabels[s.status]}</Badge>
                              <Badge className={riskColors[s.risk_level]}>{riskLabels[s.risk_level]}</Badge>
                              {!s.has_dpa && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Sem DPA</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{categoryLabels[s.category]}{s.cnpj ? ` · CNPJ: ${s.cnpj}` : ""}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {s.overall_score > 0 && (
                            <div className="text-center">
                              <p className={`font-display text-lg font-bold ${s.overall_score >= 80 ? "text-primary" : s.overall_score >= 60 ? "text-amber-500" : "text-destructive"}`}>{s.overall_score}%</p>
                              <Progress value={s.overall_score} className="mt-1 h-1.5 w-16" />
                            </div>
                          )}
                          <Button variant="outline" size="sm" title="Enviar link de avaliação externa" onClick={e => { e.stopPropagation(); generateExternalLink(s); }} disabled={generatingLink}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); deleteSupplier(s.id); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ════════════ AVALIAÇÕES TAB ════════════ */}
        <TabsContent value="avaliacoes" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Histórico de Avaliações</CardTitle>
              <CardDescription>Fornecedores que já passaram por avaliação de conformidade LGPD</CardDescription>
            </CardHeader>
            <CardContent>
              {suppliers.filter(s => s.last_assessment_at).length === 0 ? (
                <div className="py-12 text-center">
                  <Shield className="mx-auto h-12 w-12 text-muted-foreground/40" />
                  <p className="mt-4 text-muted-foreground">Nenhuma avaliação realizada ainda.</p>
                  <p className="text-xs text-muted-foreground mt-1">Acesse um fornecedor e inicie uma avaliação de due diligence, ou envie um link externo.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {suppliers.filter(s => s.last_assessment_at).sort((a, b) => new Date(b.last_assessment_at!).getTime() - new Date(a.last_assessment_at!).getTime()).map(s => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.overall_score >= 60 ? "bg-primary/10" : "bg-destructive/10"}`}>
                          <Shield className={`h-5 w-5 ${s.overall_score >= 60 ? "text-primary" : "text-destructive"}`} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{s.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {categoryLabels[s.category]} · Avaliado em {formatDate(s.last_assessment_at!)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className={`font-display text-lg font-bold ${s.overall_score >= 80 ? "text-primary" : s.overall_score >= 60 ? "text-amber-500" : "text-destructive"}`}>
                          {s.overall_score}%
                        </p>
                        <Badge className={riskColors[s.risk_level]}>{riskLabels[s.risk_level]}</Badge>
                        <Badge className={statusColors[s.status]}>{statusLabels[s.status]}</Badge>
                        <Button variant="outline" size="sm" onClick={() => setSelected(s)}>
                          <Eye className="mr-1 h-3.5 w-3.5" /> Ver
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── External Link Dialog (global) ── */}
      <Dialog open={externalLinkOpen} onOpenChange={setExternalLinkOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" /> Link de Avaliação Externa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Envie este link para <strong>{externalLinkSupplier?.name}</strong> para que preencham a avaliação de conformidade LGPD diretamente. O link é válido por 30 dias.
            </p>
            <div className="flex items-center gap-2">
              <Input readOnly value={externalLink || ""} className="text-xs font-mono" />
              <Button size="sm" variant="outline" onClick={copyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {externalLinkSupplier?.contact_email && (
              <div className="rounded-lg border p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">E-mail do contato:</p>
                <p className="text-sm font-medium">{externalLinkSupplier.contact_email}</p>
                <p className="text-xs text-muted-foreground mt-2">Copie o link acima e envie para o e-mail do fornecedor.</p>
              </div>
            )}
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>Após o preenchimento, a avaliação ficará disponível automaticamente na aba Avaliações.</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
