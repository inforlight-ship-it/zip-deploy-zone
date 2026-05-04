import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  UserCog, ClipboardList, ListTodo, BarChart3, Settings,
  AlertTriangle, CheckCircle2, Clock, XCircle, Plus, Trash2,
  FileText, Shield, TrendingUp, Calendar, Activity, Send,
  ChevronRight, Users, Eye, Bell, Mail, Download, Copy, ExternalLink
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
import type { Database, Json } from "@/integrations/supabase/types";

type RequestStatus = Database["public"]["Enums"]["request_status"];

interface DSR {
  id: string;
  protocol: string;
  name: string;
  email: string;
  cpf: string;
  right_type: string;
  details: string;
  status: RequestStatus;
  response: string | null;
  created_at: string;
  updated_at: string;
}

interface DPOTask {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  category: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}

interface ActivityLog {
  id: string;
  action: string;
  entity_type: string;
  details: Record<string, unknown>;
  created_at: string;
}

// ── Label maps ──────────────────────────────────────────
const statusLabels: Record<string, string> = {
  pendente: "Pendente", em_andamento: "Em andamento", concluido: "Concluído", cancelado: "Cancelado",
};
const statusColors: Record<string, string> = {
  pendente: "bg-amber-500/15 text-amber-600", em_andamento: "bg-sky-500/15 text-sky-600",
  concluido: "bg-primary/15 text-primary", cancelado: "bg-muted text-muted-foreground",
};
const rightLabels: Record<string, string> = {
  access: "Acesso", correction: "Correção", deletion: "Exclusão", portability: "Portabilidade",
  opposition: "Oposição", revoke: "Revogação", info: "Informação", other: "Outro",
};
const priorityLabels: Record<string, string> = {
  baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica",
};
const priorityColors: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground", media: "bg-sky-500/15 text-sky-600",
  alta: "bg-amber-500/15 text-amber-600", critica: "bg-destructive/15 text-destructive",
};
const taskStatusLabels: Record<string, string> = {
  pendente: "Pendente", em_andamento: "Em andamento", concluida: "Concluída", cancelada: "Cancelada",
};
const categoryLabels: Record<string, string> = {
  geral: "Geral", solicitacao: "Solicitação", incidente: "Incidente",
  auditoria: "Auditoria", documento: "Documento", treinamento: "Treinamento", conformidade: "Conformidade",
};
const categoryIcons: Record<string, React.ReactNode> = {
  geral: <ListTodo className="h-3.5 w-3.5" />, solicitacao: <Users className="h-3.5 w-3.5" />,
  incidente: <AlertTriangle className="h-3.5 w-3.5" />, auditoria: <Shield className="h-3.5 w-3.5" />,
  documento: <FileText className="h-3.5 w-3.5" />, treinamento: <Eye className="h-3.5 w-3.5" />,
  conformidade: <CheckCircle2 className="h-3.5 w-3.5" />,
};

// ── KPI Card ────────────────────────────────────────────
function KPICard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className={`mt-1 font-display text-2xl font-bold ${color || "text-foreground"}`}>{value}</p>
            {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Component ──────────────────────────────────────
export default function PortalDPO() {
  const { user, currentTenant } = useAuth();
  const { toast } = useToast();

  // Data states
  const [dsrs, setDsrs] = useState<DSR[]>([]);
  const [tasks, setTasks] = useState<DPOTask[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [dsrFilter, setDsrFilter] = useState("all");
  const [taskFilter, setTaskFilter] = useState("all");

  // Dialog states
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [selectedDsr, setSelectedDsr] = useState<DSR | null>(null);
  const [responseText, setResponseText] = useState("");
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportPeriod, setReportPeriod] = useState("30");
  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo, setReportDateTo] = useState("");

  // New task form
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "media", category: "geral", due_date: "" });

  // ── Data Fetching ───────────────────────────────────
  const fetchAll = async () => {
    setLoading(true);
    const [dsrRes, taskRes, actRes] = await Promise.all([
      supabase.from("data_subject_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("dpo_tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("dpo_activity_log").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    if (dsrRes.data) setDsrs(dsrRes.data as DSR[]);
    if (taskRes.data) setTasks(taskRes.data as DPOTask[]);
    if (actRes.data) setActivities(actRes.data as ActivityLog[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Computed KPIs ─────────────────────────────────
  const kpis = useMemo(() => {
    const pending = dsrs.filter(d => d.status === "pendente").length;
    const inProgress = dsrs.filter(d => d.status === "em_andamento").length;
    const completed = dsrs.filter(d => d.status === "concluido").length;
    const total = dsrs.length;
    const slaRate = total > 0 ? Math.round((completed / Math.max(completed + pending + inProgress, 1)) * 100) : 100;
    const pendingTasks = tasks.filter(t => t.status === "pendente" || t.status === "em_andamento").length;
    const completedTasks = tasks.filter(t => t.status === "concluida").length;
    return { pending, inProgress, completed, total, slaRate, pendingTasks, completedTasks };
  }, [dsrs, tasks]);

  // ── Filtered lists ────────────────────────────────
  const filteredDsrs = useMemo(() => {
    if (dsrFilter === "all") return dsrs;
    return dsrs.filter(d => d.status === dsrFilter);
  }, [dsrs, dsrFilter]);

  const filteredTasks = useMemo(() => {
    if (taskFilter === "all") return tasks;
    return tasks.filter(t => t.status === taskFilter);
  }, [tasks, taskFilter]);

  // ── Actions ───────────────────────────────────────
  const logActivity = async (action: string, entityType: string, entityId?: string, details?: Record<string, string>) => {
    if (!user) return;
    await supabase.from("dpo_activity_log").insert([{
      user_id: user.id, action, entity_type: entityType, entity_id: entityId || undefined, details: (details || {}) as Json,
    }]);
  };

  const updateDsrStatus = async (id: string, newStatus: RequestStatus) => {
    const { error } = await supabase.from("data_subject_requests").update({ status: newStatus }).eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    await logActivity(`Status → ${statusLabels[newStatus]}`, "solicitacao", id);
    toast({ title: "Status atualizado" });
    fetchAll();
  };

  const respondToDsr = async () => {
    if (!selectedDsr || !responseText.trim()) return;
    const { error } = await supabase.from("data_subject_requests")
      .update({ response: responseText, status: "concluido" as RequestStatus }).eq("id", selectedDsr.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    await logActivity("Resposta enviada", "solicitacao", selectedDsr.id, { protocol: selectedDsr.protocol });
    toast({ title: "Resposta registrada com sucesso" });
    setResponseDialogOpen(false);
    setResponseText("");
    setSelectedDsr(null);
    fetchAll();
  };

  const createTask = async () => {
    if (!user || !newTask.title.trim()) return;
    const { error } = await supabase.from("dpo_tasks").insert({
      user_id: user.id, title: newTask.title, description: newTask.description || null,
      priority: newTask.priority, category: newTask.category,
      due_date: newTask.due_date || null,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    await logActivity("Tarefa criada", "tarefa", undefined, { title: newTask.title });
    toast({ title: "Tarefa criada" });
    setNewTask({ title: "", description: "", priority: "media", category: "geral", due_date: "" });
    setTaskDialogOpen(false);
    fetchAll();
  };

  const updateTaskStatus = async (id: string, status: string) => {
    const update: Record<string, unknown> = { status };
    if (status === "concluida") update.completed_at = new Date().toISOString();
    const { error } = await supabase.from("dpo_tasks").update(update).eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    await logActivity(`Tarefa → ${taskStatusLabels[status]}`, "tarefa", id);
    toast({ title: "Tarefa atualizada" });
    fetchAll();
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("dpo_tasks").delete().eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Tarefa removida" });
    fetchAll();
  };

  // ── Date helpers ──────────────────────────────────
  const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");
  const formatDateTime = (d: string) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const isOverdue = (date: string | null) => date ? new Date(date) < new Date() : false;

  // ── Download Report ──────────────────────────────
  const downloadReport = () => {
    let dateFrom: Date;
    let dateTo: Date = new Date();
    if (reportPeriod === "custom") {
      if (!reportDateFrom || !reportDateTo) {
        toast({ title: "Selecione as datas de início e fim", variant: "destructive" });
        return;
      }
      dateFrom = new Date(reportDateFrom);
      dateTo = new Date(reportDateTo);
    } else {
      dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - parseInt(reportPeriod));
    }
    const inRange = (d: string) => { const dt = new Date(d); return dt >= dateFrom && dt <= dateTo; };
    const pDsrs = dsrs.filter(d => inRange(d.created_at));
    const pTasks = tasks.filter(t => inRange(t.created_at));
    const pActs = activities.filter(a => inRange(a.created_at));
    const pPending = pDsrs.filter(d => d.status === "pendente").length;
    const pInProg = pDsrs.filter(d => d.status === "em_andamento").length;
    const pDone = pDsrs.filter(d => d.status === "concluido").length;
    const pTasksDone = pTasks.filter(t => t.status === "concluida").length;
    const pTasksOpen = pTasks.filter(t => t.status === "pendente" || t.status === "em_andamento").length;
    const pSla = pDsrs.length > 0 ? Math.round((pDone / Math.max(pDone + pPending + pInProg, 1)) * 100) : 100;
    const fromStr = dateFrom.toLocaleDateString("pt-BR");
    const toStr = dateTo.toLocaleDateString("pt-BR");

    // Build right type breakdown
    const rightBreakdown = Object.entries(rightLabels).map(([k, v]) => {
      const c = pDsrs.filter(d => d.right_type === k).length;
      return c > 0 ? { label: v, count: c, pct: Math.round((c / Math.max(pDsrs.length, 1)) * 100) } : null;
    }).filter(Boolean) as { label: string; count: number; pct: number }[];

    // Status breakdown for tasks
    const tasksByCategory = Object.entries(categoryLabels).map(([k, v]) => {
      const c = pTasks.filter(t => t.category === k).length;
      return c > 0 ? { label: v, count: c } : null;
    }).filter(Boolean) as { label: string; count: number }[];

    const overdueTasks = pTasks.filter(t => t.due_date && isOverdue(t.due_date) && t.status !== "concluida" && t.status !== "cancelada");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Relatório Executivo DPO — ${fromStr} a ${toStr}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.6; }
  @media print {
    body { background: white; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
    .container { box-shadow: none !important; max-width: 100% !important; }
  }
  .container { max-width: 900px; margin: 0 auto; background: white; }
  
  /* Header */
  .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0d9488 100%); color: white; padding: 48px 48px 40px; position: relative; overflow: hidden; }
  .header::before { content: ''; position: absolute; top: -50%; right: -20%; width: 500px; height: 500px; background: radial-gradient(circle, rgba(13,148,136,0.2) 0%, transparent 70%); }
  .header-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2); border-radius: 20px; padding: 6px 14px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 16px; }
  .header h1 { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 4px; position: relative; }
  .header .subtitle { font-size: 15px; opacity: 0.85; font-weight: 400; }
  .header-meta { display: flex; gap: 24px; margin-top: 20px; font-size: 12px; opacity: 0.75; }
  .header-meta span { display: flex; align-items: center; gap: 4px; }
  
  /* Body */
  .body { padding: 40px 48px; }
  
  /* KPI Grid */
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 40px; }
  .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; position: relative; overflow: hidden; }
  .kpi-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
  .kpi-card.emerald::before { background: #0d9488; }
  .kpi-card.amber::before { background: #f59e0b; }
  .kpi-card.sky::before { background: #0ea5e9; }
  .kpi-card.slate::before { background: #64748b; }
  .kpi-value { font-size: 32px; font-weight: 800; letter-spacing: -1px; margin-bottom: 2px; }
  .kpi-card.emerald .kpi-value { color: #0d9488; }
  .kpi-card.amber .kpi-value { color: #d97706; }
  .kpi-card.sky .kpi-value { color: #0284c7; }
  .kpi-card.slate .kpi-value { color: #475569; }
  .kpi-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; }
  
  /* Sections */
  .section { margin-bottom: 36px; }
  .section-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #0d9488; display: flex; align-items: center; gap: 8px; }
  .section-title .icon { width: 20px; height: 20px; background: #0d9488; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: 800; }
  
  /* SLA Bar */
  .sla-container { background: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; margin-bottom: 24px; }
  .sla-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .sla-header h3 { font-size: 14px; font-weight: 600; }
  .sla-header .sla-value { font-size: 24px; font-weight: 800; color: ${pSla >= 80 ? '#0d9488' : pSla >= 50 ? '#d97706' : '#dc2626'}; }
  .sla-bar { height: 10px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
  .sla-bar-fill { height: 100%; border-radius: 999px; background: ${pSla >= 80 ? 'linear-gradient(90deg, #0d9488, #14b8a6)' : pSla >= 50 ? 'linear-gradient(90deg, #d97706, #f59e0b)' : 'linear-gradient(90deg, #dc2626, #ef4444)'}; transition: width 0.5s; }
  .sla-legend { display: flex; gap: 16px; margin-top: 10px; font-size: 11px; color: #64748b; }
  .sla-legend span { display: flex; align-items: center; gap: 4px; }
  .sla-legend .dot { width: 8px; height: 8px; border-radius: 50%; }
  
  /* Bar chart */
  .bar-chart { display: flex; flex-direction: column; gap: 10px; }
  .bar-row { display: flex; align-items: center; gap: 12px; }
  .bar-label { width: 120px; font-size: 13px; font-weight: 500; color: #475569; text-align: right; }
  .bar-track { flex: 1; height: 24px; background: #f1f5f9; border-radius: 6px; overflow: hidden; position: relative; }
  .bar-fill { height: 100%; background: linear-gradient(90deg, #0d9488, #14b8a6); border-radius: 6px; display: flex; align-items: center; padding-left: 8px; min-width: 30px; }
  .bar-fill-text { font-size: 11px; font-weight: 700; color: white; }
  .bar-count { width: 40px; font-size: 13px; font-weight: 700; color: #0f172a; }
  
  /* Tables */
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead th { background: #f8fafc; padding: 10px 12px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; border-bottom: 2px solid #e2e8f0; }
  tbody td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  tbody tr:hover { background: #fafbfc; }
  .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .badge-pending { background: #fef3c7; color: #92400e; }
  .badge-progress { background: #e0f2fe; color: #075985; }
  .badge-done { background: #d1fae5; color: #065f46; }
  .badge-cancelled { background: #f1f5f9; color: #64748b; }
  .badge-high { background: #fee2e2; color: #991b1b; }
  .badge-medium { background: #e0f2fe; color: #075985; }
  .badge-low { background: #f1f5f9; color: #64748b; }
  .badge-critical { background: #fee2e2; color: #7f1d1d; border: 1px solid #fca5a5; }
  
  /* Alert box */
  .alert-box { border-radius: 10px; padding: 16px 20px; margin-bottom: 16px; display: flex; align-items: flex-start; gap: 12px; font-size: 13px; }
  .alert-box.warning { background: #fffbeb; border: 1px solid #fde68a; }
  .alert-box.danger { background: #fef2f2; border: 1px solid #fecaca; }
  .alert-box.success { background: #f0fdf4; border: 1px solid #bbf7d0; }
  .alert-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
  
  /* Footer */
  .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 48px; text-align: center; font-size: 11px; color: #94a3b8; }
  .footer strong { color: #64748b; }
  
  /* Print button */
  .print-bar { background: #0f172a; color: white; padding: 12px 48px; display: flex; justify-content: space-between; align-items: center; }
  .print-bar button { background: #0d9488; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
  .print-bar button:hover { background: #0f766e; }
  .print-bar .info { font-size: 12px; opacity: 0.7; }

  /* Two col grid */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  @media (max-width: 700px) { .two-col { grid-template-columns: 1fr; } .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
</head>
<body>
  <div class="print-bar no-print">
    <span class="info">Use Ctrl+P ou o botão para salvar como PDF</span>
    <button onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
  </div>
  
  <div class="container">
    <div class="header">
      <div class="header-badge">🛡️ Confidencial</div>
      <h1>Relatório Executivo do DPO</h1>
      <p class="subtitle">Encarregado de Proteção de Dados — Lei Geral de Proteção de Dados (LGPD)</p>
      <div class="header-meta">
        <span>📅 Período: ${fromStr} a ${toStr}</span>
        <span>🕐 Gerado em: ${new Date().toLocaleString("pt-BR")}</span>
      </div>
    </div>
    
    <div class="body">
      <!-- KPIs -->
      <div class="kpi-grid">
        <div class="kpi-card slate">
          <div class="kpi-value">${pDsrs.length}</div>
          <div class="kpi-label">Total Solicitações</div>
        </div>
        <div class="kpi-card emerald">
          <div class="kpi-value">${pDone}</div>
          <div class="kpi-label">Concluídas</div>
        </div>
        <div class="kpi-card amber">
          <div class="kpi-value">${pPending}</div>
          <div class="kpi-label">Pendentes</div>
        </div>
        <div class="kpi-card sky">
          <div class="kpi-value">${pTasks.length}</div>
          <div class="kpi-label">Tarefas no Período</div>
        </div>
      </div>
      
      <!-- SLA -->
      <div class="sla-container">
        <div class="sla-header">
          <h3>Taxa de Conformidade com SLA (15 dias úteis — Art. 18 LGPD)</h3>
          <div class="sla-value">${pSla}%</div>
        </div>
        <div class="sla-bar"><div class="sla-bar-fill" style="width:${pSla}%"></div></div>
        <div class="sla-legend">
          <span><span class="dot" style="background:#0d9488"></span> Concluídas: ${pDone}</span>
          <span><span class="dot" style="background:#0ea5e9"></span> Em andamento: ${pInProg}</span>
          <span><span class="dot" style="background:#f59e0b"></span> Pendentes: ${pPending}</span>
        </div>
      </div>

      <!-- Alerts -->
      ${pPending > 0 ? `<div class="alert-box warning"><span class="alert-icon">⚠️</span><div><strong>Atenção:</strong> ${pPending} solicitação(ões) aguardando resposta. O prazo legal de 15 dias úteis deve ser observado conforme Art. 18, §5º da LGPD.</div></div>` : ''}
      ${overdueTasks.length > 0 ? `<div class="alert-box danger"><span class="alert-icon">🚨</span><div><strong>Crítico:</strong> ${overdueTasks.length} tarefa(s) com prazo vencido requerem ação imediata.</div></div>` : ''}
      ${pPending === 0 && overdueTasks.length === 0 ? `<div class="alert-box success"><span class="alert-icon">✅</span><div><strong>Conformidade em dia.</strong> Não há solicitações pendentes nem tarefas atrasadas no período analisado.</div></div>` : ''}
      
      <!-- Rights Breakdown -->
      <div class="section">
        <div class="section-title"><div class="icon">D</div> Distribuição por Tipo de Direito</div>
        ${rightBreakdown.length > 0 ? `<div class="bar-chart">${rightBreakdown.map(r => `
          <div class="bar-row">
            <div class="bar-label">${r.label}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.max(r.pct, 5)}%"><span class="bar-fill-text">${r.pct}%</span></div></div>
            <div class="bar-count">${r.count}</div>
          </div>`).join('')}</div>` : '<p style="color:#94a3b8;font-size:13px;">Nenhuma solicitação registrada no período.</p>'}
      </div>
      
      <div class="two-col">
        <!-- Tasks Summary -->
        <div class="section">
          <div class="section-title"><div class="icon">T</div> Resumo de Tarefas</div>
          <table>
            <thead><tr><th>Métrica</th><th style="text-align:right">Valor</th></tr></thead>
            <tbody>
              <tr><td>Total no período</td><td style="text-align:right;font-weight:700">${pTasks.length}</td></tr>
              <tr><td>Abertas</td><td style="text-align:right;font-weight:700;color:#0284c7">${pTasksOpen}</td></tr>
              <tr><td>Concluídas</td><td style="text-align:right;font-weight:700;color:#0d9488">${pTasksDone}</td></tr>
              ${overdueTasks.length > 0 ? `<tr><td style="color:#dc2626">Atrasadas</td><td style="text-align:right;font-weight:700;color:#dc2626">${overdueTasks.length}</td></tr>` : ''}
            </tbody>
          </table>
        </div>
        
        <!-- Tasks by Category -->
        <div class="section">
          <div class="section-title"><div class="icon">C</div> Tarefas por Categoria</div>
          ${tasksByCategory.length > 0 ? `<table>
            <thead><tr><th>Categoria</th><th style="text-align:right">Qtd</th></tr></thead>
            <tbody>${tasksByCategory.map(c => `<tr><td>${c.label}</td><td style="text-align:right;font-weight:700">${c.count}</td></tr>`).join('')}</tbody>
          </table>` : '<p style="color:#94a3b8;font-size:13px;">Nenhuma tarefa no período.</p>'}
        </div>
      </div>

      <!-- Request Details -->
      <div class="section page-break">
        <div class="section-title"><div class="icon">S</div> Detalhamento das Solicitações</div>
        ${pDsrs.length > 0 ? `<table>
          <thead>
            <tr><th>Protocolo</th><th>Titular</th><th>Tipo</th><th>Status</th><th>Data</th></tr>
          </thead>
          <tbody>
            ${pDsrs.map(d => {
              const badgeClass = d.status === 'concluido' ? 'badge-done' : d.status === 'em_andamento' ? 'badge-progress' : d.status === 'cancelado' ? 'badge-cancelled' : 'badge-pending';
              return `<tr>
                <td style="font-weight:600;font-family:monospace;font-size:12px">${d.protocol}</td>
                <td>${d.name}<br><span style="font-size:11px;color:#94a3b8">${d.email}</span></td>
                <td>${rightLabels[d.right_type] || d.right_type}</td>
                <td><span class="badge ${badgeClass}">${statusLabels[d.status] || d.status}</span></td>
                <td style="font-size:12px;white-space:nowrap">${new Date(d.created_at).toLocaleDateString("pt-BR")}</td>
              </tr>${d.response ? `<tr><td colspan="5" style="background:#f0fdf4;padding:8px 12px;font-size:12px;border-left:3px solid #0d9488"><strong>Resposta:</strong> ${d.response}</td></tr>` : ''}`;
            }).join('')}
          </tbody>
        </table>` : '<p style="color:#94a3b8;font-size:13px;">Nenhuma solicitação registrada no período.</p>'}
      </div>

      <!-- Activity Log -->
      <div class="section">
        <div class="section-title"><div class="icon">A</div> Registro de Atividades (${pActs.length} ações)</div>
        ${pActs.length > 0 ? `<table>
          <thead><tr><th>Data/Hora</th><th>Ação</th><th>Entidade</th></tr></thead>
          <tbody>${pActs.slice(0, 50).map(a => `
            <tr>
              <td style="white-space:nowrap;font-size:12px">${new Date(a.created_at).toLocaleString("pt-BR")}</td>
              <td style="font-weight:500">${a.action}</td>
              <td>${a.entity_type}</td>
            </tr>`).join('')}</tbody>
        </table>` : '<p style="color:#94a3b8;font-size:13px;">Nenhuma atividade registrada no período.</p>'}
      </div>

      <!-- Overdue tasks detail -->
      ${overdueTasks.length > 0 ? `<div class="section">
        <div class="section-title" style="border-color:#dc2626"><div class="icon" style="background:#dc2626">!</div> Tarefas Atrasadas — Ação Necessária</div>
        <table>
          <thead><tr><th>Tarefa</th><th>Categoria</th><th>Prioridade</th><th>Prazo</th></tr></thead>
          <tbody>${overdueTasks.map(t => {
            const pClass = t.priority === 'critica' ? 'badge-critical' : t.priority === 'alta' ? 'badge-high' : t.priority === 'media' ? 'badge-medium' : 'badge-low';
            return `<tr>
              <td style="font-weight:500">${t.title}${t.description ? `<br><span style="font-size:11px;color:#94a3b8">${t.description}</span>` : ''}</td>
              <td>${categoryLabels[t.category] || t.category}</td>
              <td><span class="badge ${pClass}">${priorityLabels[t.priority] || t.priority}</span></td>
              <td style="color:#dc2626;font-weight:600;white-space:nowrap">${t.due_date ? new Date(t.due_date).toLocaleDateString("pt-BR") : '—'}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>` : ''}
    </div>
    
    <div class="footer">
      <p>Documento gerado automaticamente pelo <strong>Privacy Shield</strong> — Plataforma de Gestão de Conformidade LGPD</p>
      <p style="margin-top:4px">Este relatório é confidencial e destinado exclusivamente à alta administração e ao Encarregado de Proteção de Dados.</p>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setReportDialogOpen(false);
    toast({ title: "Relatório gerado — use Ctrl+P para salvar como PDF" });
  };

  // ── Render ────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Portal do <span className="text-gradient-emerald">DPO</span>
          </h1>
          <p className="mt-1 text-muted-foreground">Centro de comando do Encarregado de Proteção de Dados</p>
        </div>
        <div className="flex gap-2">
          {currentTenant && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const portalUrl = `${window.location.origin}/portal/${currentTenant.slug}`;
                  navigator.clipboard.writeText(portalUrl);
                  toast({ title: "Link do portal DSAR copiado!" });
                }}
              >
                <Copy className="mr-2 h-4 w-4" /> Copiar Link DSAR
              </Button>
              <Button
                size="sm"
                onClick={() => window.open(`${window.location.origin}/portal/${currentTenant.slug}`, "_blank")}
              >
                <ExternalLink className="mr-2 h-4 w-4" /> Portal DSAR Externo
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard icon={<Clock className="h-5 w-5 text-amber-500" />} label="Solicitações Pendentes" value={kpis.pending} sub={`${kpis.inProgress} em andamento`} color="text-amber-600" />
        <KPICard icon={<CheckCircle2 className="h-5 w-5 text-primary" />} label="SLA de Atendimento" value={`${kpis.slaRate}%`} sub={`${kpis.completed} concluídas de ${kpis.total}`} color="text-primary" />
        <KPICard icon={<ListTodo className="h-5 w-5 text-sky-500" />} label="Tarefas Abertas" value={kpis.pendingTasks} sub={`${kpis.completedTasks} concluídas`} color="text-sky-600" />
        <KPICard icon={<TrendingUp className="h-5 w-5 text-primary" />} label="Total de Solicitações" value={kpis.total} sub="Desde o início" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> Visão Geral</TabsTrigger>
          <TabsTrigger value="requests" className="gap-1.5"><ClipboardList className="h-3.5 w-3.5" /> Solicitações</TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5"><ListTodo className="h-3.5 w-3.5" /> Tarefas</TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Relatórios</TabsTrigger>
        </TabsList>

        {/* ══════════════ OVERVIEW TAB ══════════════ */}
        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* SLA Progress */}
            <Card className="shadow-card lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Shield className="h-4 w-4 text-primary" /> Desempenho de Conformidade</CardTitle>
                <CardDescription>Acompanhe o cumprimento dos prazos legais (15 dias úteis - LGPD)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Taxa de SLA</span>
                    <span className="font-semibold">{kpis.slaRate}%</span>
                  </div>
                  <Progress value={kpis.slaRate} className="h-3" />
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { label: "Pendentes", value: kpis.pending, color: "text-amber-500" },
                    { label: "Em andamento", value: kpis.inProgress, color: "text-sky-500" },
                    { label: "Concluídas", value: kpis.completed, color: "text-primary" },
                    { label: "Total", value: kpis.total, color: "text-foreground" },
                  ].map(s => (
                    <div key={s.label} className="rounded-lg bg-secondary/50 p-3 text-center">
                      <p className={`font-display text-xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-[11px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Request breakdown by type */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold">Por Tipo de Direito</h4>
                  <div className="space-y-2">
                    {Object.entries(rightLabels).map(([key, label]) => {
                      const count = dsrs.filter(d => d.right_type === key).length;
                      if (count === 0) return null;
                      const pct = kpis.total > 0 ? Math.round((count / kpis.total) * 100) : 0;
                      return (
                        <div key={key} className="flex items-center gap-3 text-sm">
                          <span className="w-28 truncate text-muted-foreground">{label}</span>
                          <div className="flex-1">
                            <div className="h-2 overflow-hidden rounded-full bg-secondary">
                              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          <span className="w-8 text-right font-medium">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activity Feed */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-primary" /> Atividade Recente</CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
                ) : (
                  <div className="space-y-0">
                    {activities.slice(0, 15).map((a, i) => (
                      <div key={a.id} className={`flex gap-3 py-2.5 ${i < activities.length - 1 ? "border-b border-border/50" : ""}`}>
                        <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent">
                          <ChevronRight className="h-3 w-3 text-accent-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-snug">
                            <span className="font-medium">{a.action}</span>
                            <span className="text-muted-foreground"> · {a.entity_type}</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground">{formatDateTime(a.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Tasks */}
            <Card className="shadow-card lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Calendar className="h-4 w-4 text-primary" /> Próximas Tarefas</CardTitle>
              </CardHeader>
              <CardContent>
                {tasks.filter(t => t.status !== "concluida" && t.status !== "cancelada").length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma tarefa pendente.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {tasks.filter(t => t.status !== "concluida" && t.status !== "cancelada").slice(0, 6).map(t => (
                      <div key={t.id} className="rounded-lg border border-border bg-card p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {categoryIcons[t.category]}
                            <span className="text-[10px] font-medium text-muted-foreground uppercase">{categoryLabels[t.category]}</span>
                          </div>
                          <Badge variant="outline" className={`text-[10px] ${priorityColors[t.priority]}`}>{priorityLabels[t.priority]}</Badge>
                        </div>
                        <p className="mt-2 text-sm font-medium leading-snug">{t.title}</p>
                        {t.due_date && (
                          <p className={`mt-1.5 text-[11px] ${isOverdue(t.due_date) ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                            <Calendar className="mr-1 inline h-3 w-3" />
                            {isOverdue(t.due_date) ? "Atrasada · " : ""}
                            {formatDate(t.due_date)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══════════════ REQUESTS TAB ══════════════ */}
        <TabsContent value="requests">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">{filteredDsrs.length} solicitação(ões)</p>
              <Select value={dsrFilter} onValueChange={setDsrFilter}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluido">Concluídas</SelectItem>
                  <SelectItem value="cancelado">Canceladas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredDsrs.length === 0 ? (
              <Card className="shadow-card"><CardContent className="py-16 text-center">
                <Users className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 text-muted-foreground">Nenhuma solicitação encontrada.</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {filteredDsrs.map((dsr, i) => (
                  <motion.div key={dsr.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <Card className="shadow-card">
                      <CardContent className="p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              {dsr.status === "concluido" ? <CheckCircle2 className="h-4 w-4 text-primary" /> : dsr.status === "cancelado" ? <XCircle className="h-4 w-4 text-muted-foreground" /> : <Clock className="h-4 w-4 text-amber-500" />}
                              <span className="font-display text-sm font-bold">{dsr.protocol}</span>
                              <Badge variant="outline" className={`text-[10px] ${statusColors[dsr.status]}`}>{statusLabels[dsr.status]}</Badge>
                              <Badge variant="outline" className="text-[10px]">{rightLabels[dsr.right_type] ?? dsr.right_type}</Badge>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{dsr.name}</p>
                              <p className="text-xs text-muted-foreground">{dsr.email} · CPF: {dsr.cpf}</p>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{dsr.details}</p>
                            {dsr.response && (
                              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                                <p className="text-xs font-medium text-primary mb-1">Resposta do DPO:</p>
                                <p className="text-sm text-foreground">{dsr.response}</p>
                              </div>
                            )}
                            <p className="text-[11px] text-muted-foreground">{formatDateTime(dsr.created_at)}</p>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            {dsr.status === "pendente" && (
                              <Button size="sm" variant="outline" onClick={() => updateDsrStatus(dsr.id, "em_andamento")}>Iniciar</Button>
                            )}
                            {(dsr.status === "pendente" || dsr.status === "em_andamento") && (
                              <Button size="sm" onClick={() => { setSelectedDsr(dsr); setResponseText(dsr.response || ""); setResponseDialogOpen(true); }}>
                                <Send className="mr-1.5 h-3.5 w-3.5" /> Responder
                              </Button>
                            )}
                            {(dsr.status === "pendente" || dsr.status === "em_andamento") && (
                              <Button size="sm" variant="ghost" onClick={() => updateDsrStatus(dsr.id, "cancelado")}>Cancelar</Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ══════════════ TASKS TAB ══════════════ */}
        <TabsContent value="tasks">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Select value={taskFilter} onValueChange={setTaskFilter}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluida">Concluídas</SelectItem>
                  <SelectItem value="cancelada">Canceladas</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="shadow-glow"><Plus className="mr-1.5 h-4 w-4" /> Nova Tarefa</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader><DialogTitle>Criar Tarefa</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Revisar política de privacidade" />
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} placeholder="Detalhes..." rows={3} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Prioridade</Label>
                        <Select value={newTask.priority} onValueChange={v => setNewTask(p => ({ ...p, priority: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select value={newTask.category} onValueChange={v => setNewTask(p => ({ ...p, category: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Prazo</Label>
                        <Input type="date" value={newTask.due_date} onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))} />
                      </div>
                    </div>
                    <Button onClick={createTask} className="w-full" disabled={!newTask.title.trim()}>Criar Tarefa</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {filteredTasks.length === 0 ? (
              <Card className="shadow-card"><CardContent className="py-16 text-center">
                <ListTodo className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 text-muted-foreground">Nenhuma tarefa encontrada.</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((t, i) => (
                  <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <Card className={`shadow-card ${t.status === "concluida" ? "opacity-60" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {categoryIcons[t.category]}
                              <span className="text-[10px] font-medium text-muted-foreground uppercase">{categoryLabels[t.category]}</span>
                              <Badge variant="outline" className={`text-[10px] ${priorityColors[t.priority]}`}>{priorityLabels[t.priority]}</Badge>
                              <Badge variant="outline" className={`text-[10px] ${statusColors[t.status] || "bg-muted text-muted-foreground"}`}>{taskStatusLabels[t.status]}</Badge>
                            </div>
                            <p className={`text-sm font-medium ${t.status === "concluida" ? "line-through" : ""}`}>{t.title}</p>
                            {t.description && <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>}
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                              <span>Criada: {formatDate(t.created_at)}</span>
                              {t.due_date && (
                                <span className={isOverdue(t.due_date) && t.status !== "concluida" ? "text-destructive font-medium" : ""}>
                                  Prazo: {formatDate(t.due_date)}
                                  {isOverdue(t.due_date) && t.status !== "concluida" && " (Atrasada)"}
                                </span>
                              )}
                              {t.completed_at && <span>Concluída: {formatDate(t.completed_at)}</span>}
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            {t.status === "pendente" && (
                              <Button size="sm" variant="outline" onClick={() => updateTaskStatus(t.id, "em_andamento")}>Iniciar</Button>
                            )}
                            {t.status === "em_andamento" && (
                              <Button size="sm" onClick={() => updateTaskStatus(t.id, "concluida")}>Concluir</Button>
                            )}
                            {(t.status === "pendente" || t.status === "em_andamento") && (
                              <Button size="sm" variant="ghost" onClick={() => updateTaskStatus(t.id, "cancelada")}>Cancelar</Button>
                            )}
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteTask(t.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ══════════════ REPORTS TAB ══════════════ */}
        <TabsContent value="reports">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4 text-primary" /> Resumo Executivo</CardTitle>
                <CardDescription>Visão consolidada para prestação de contas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-secondary/50 p-4 space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total de solicitações</span><span className="font-semibold">{kpis.total}</span></div>
                  <Separator />
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Concluídas no prazo</span><span className="font-semibold text-primary">{kpis.completed}</span></div>
                  <Separator />
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Taxa de conformidade SLA</span><span className="font-semibold">{kpis.slaRate}%</span></div>
                  <Separator />
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tarefas concluídas</span><span className="font-semibold">{kpis.completedTasks}</span></div>
                  <Separator />
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tarefas abertas</span><span className="font-semibold">{kpis.pendingTasks}</span></div>
                </div>
                <Button variant="outline" className="w-full" onClick={() => setReportDialogOpen(true)}>
                  <Download className="mr-2 h-4 w-4" /> Baixar Relatório
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Bell className="h-4 w-4 text-primary" /> Alertas e Pendências</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {kpis.pending > 0 && (
                  <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium">Solicitações pendentes</p>
                      <p className="text-xs text-muted-foreground">{kpis.pending} solicitação(ões) aguardando resposta. Prazo legal: 15 dias úteis.</p>
                    </div>
                  </div>
                )}
                {tasks.filter(t => t.due_date && isOverdue(t.due_date) && t.status !== "concluida" && t.status !== "cancelada").length > 0 && (
                  <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <div>
                      <p className="text-sm font-medium">Tarefas atrasadas</p>
                      <p className="text-xs text-muted-foreground">{tasks.filter(t => t.due_date && isOverdue(t.due_date) && t.status !== "concluida" && t.status !== "cancelada").length} tarefa(s) com prazo vencido.</p>
                    </div>
                  </div>
                )}
                {kpis.pending === 0 && tasks.filter(t => t.due_date && isOverdue(t.due_date) && t.status !== "concluida").length === 0 && (
                  <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Tudo em dia!</p>
                      <p className="text-xs text-muted-foreground">Não há alertas ou pendências no momento.</p>
                    </div>
                  </div>
                )}

                <Separator />

                <div>
                  <h4 className="mb-2 text-sm font-semibold">Solicitações por Status</h4>
                  {Object.entries(statusLabels).map(([key, label]) => {
                    const count = dsrs.filter(d => d.status === key).length;
                    return (
                      <div key={key} className="flex items-center justify-between py-1.5 text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${key === "pendente" ? "bg-amber-500" : key === "em_andamento" ? "bg-sky-500" : key === "concluido" ? "bg-primary" : "bg-muted-foreground"}`} />
                          <span className="text-muted-foreground">{label}</span>
                        </div>
                        <span className="font-medium">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Report Download Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Baixar Relatório Executivo</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={reportPeriod} onValueChange={setReportPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="15">Últimos 15 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="60">Últimos 60 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="180">Últimos 6 meses</SelectItem>
                  <SelectItem value="365">Último ano</SelectItem>
                  <SelectItem value="custom">Período personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {reportPeriod === "custom" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data inicial</Label>
                  <Input type="date" value={reportDateFrom} onChange={e => setReportDateFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Data final</Label>
                  <Input type="date" value={reportDateTo} onChange={e => setReportDateTo(e.target.value)} />
                </div>
              </div>
            )}
            <Button onClick={downloadReport} className="w-full">
              <Download className="mr-1.5 h-4 w-4" /> Gerar e Baixar Relatório
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Response Dialog */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Responder Solicitação</DialogTitle></DialogHeader>
          {selectedDsr && (
            <div className="space-y-4 pt-2">
              <div className="rounded-lg bg-secondary/50 p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Protocolo: <span className="font-medium text-foreground">{selectedDsr.protocol}</span></p>
                <p className="text-xs text-muted-foreground">Titular: <span className="font-medium text-foreground">{selectedDsr.name}</span></p>
                <p className="text-xs text-muted-foreground">Tipo: <span className="font-medium text-foreground">{rightLabels[selectedDsr.right_type]}</span></p>
                <p className="text-sm mt-2">{selectedDsr.details}</p>
              </div>
              <div className="space-y-2">
                <Label>Resposta ao titular</Label>
                <Textarea value={responseText} onChange={e => setResponseText(e.target.value)} placeholder="Prezado(a) titular, em resposta à sua solicitação..." rows={5} />
              </div>
              <Button onClick={respondToDsr} className="w-full" disabled={!responseText.trim()}>
                <Send className="mr-1.5 h-4 w-4" /> Enviar Resposta e Concluir
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
