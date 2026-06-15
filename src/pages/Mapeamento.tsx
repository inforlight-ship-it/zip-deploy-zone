import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Filter,
  Database,
  Edit2,
  Trash2,
  Eye,
  ShieldAlert,
  ShieldCheck,
  Shield,
  ShieldOff,
  X,
  ChevronDown,
  Settings2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ─── Constants ───

const LEGAL_BASIS_OPTIONS = [
  { value: "consentimento", label: "Consentimento" },
  { value: "obrigacao_legal", label: "Obrigação Legal" },
  { value: "execucao_contrato", label: "Execução de Contrato" },
  { value: "exercicio_regular_direitos", label: "Exercício Regular de Direitos" },
  { value: "protecao_vida", label: "Proteção da Vida" },
  { value: "tutela_saude", label: "Tutela da Saúde" },
  { value: "interesse_legitimo", label: "Interesse Legítimo" },
  { value: "protecao_credito", label: "Proteção ao Crédito" },
  { value: "estudo_pesquisa", label: "Estudo / Pesquisa" },
  { value: "execucao_politicas_publicas", label: "Execução de Políticas Públicas" },
];

const RISK_OPTIONS = [
  { value: "baixo", label: "Baixo", color: "text-primary", bg: "bg-primary/10" },
  { value: "medio", label: "Médio", color: "text-amber-500", bg: "bg-amber-500/10" },
  { value: "alto", label: "Alto", color: "text-orange-500", bg: "bg-orange-500/10" },
  { value: "critico", label: "Crítico", color: "text-destructive", bg: "bg-destructive/10" },
];

const STATUS_OPTIONS = [
  { value: "rascunho", label: "Rascunho", color: "text-muted-foreground", bg: "bg-muted" },
  { value: "ativo", label: "Ativo", color: "text-primary", bg: "bg-primary/10" },
  { value: "em_revisao", label: "Em Revisão", color: "text-amber-500", bg: "bg-amber-500/10" },
  { value: "inativo", label: "Inativo", color: "text-muted-foreground", bg: "bg-muted" },
];

const DEPARTMENT_OPTIONS = [
  "RH", "Financeiro", "Marketing", "Vendas", "TI", "Jurídico",
  "Operações", "Atendimento", "Logística", "Compras", "Administrativo", "Outro",
];

const DATA_TYPES_SUGGESTIONS = [
  "Nome", "CPF", "RG", "E-mail", "Telefone", "Endereço", "Data de Nascimento",
  "Dados Bancários", "Dados de Saúde", "Biometria", "Geolocalização",
  "Histórico de Compras", "IP / Cookies", "Dados de Navegação", "Foto / Imagem",
  "Dados Financeiros", "Dados de Emprego", "Dados Acadêmicos",
];

const SENSITIVE_DATA_TYPES = [
  "Origem racial ou étnica", "Convicção religiosa", "Opinião política",
  "Filiação sindical", "Dados de saúde", "Vida sexual", "Dado genético",
  "Dado biométrico",
];

const SECURITY_MEASURES_SUGGESTIONS = [
  "Criptografia em repouso", "Criptografia em trânsito", "Controle de acesso",
  "Backup regular", "Log de auditoria", "Anonimização", "Pseudonimização",
  "Firewall", "Antivírus", "MFA", "DLP", "Monitoramento 24/7",
];

// ─── Types ───

interface ProcessActivity {
  id: string;
  name: string;
  description: string | null;
  department: string;
  legal_basis: string;
  legal_basis_detail: string | null;
  purpose: string;
  controller: string;
  operator: string | null;
  dpo_contact: string | null;
  data_subjects: string;
  data_types: string[];
  sensitive_data: boolean;
  sensitive_data_types: string[];
  data_source: string | null;
  storage_location: string | null;
  retention_period: string | null;
  disposal_method: string | null;
  shared_with: string | null;
  international_transfer: boolean;
  transfer_country: string | null;
  transfer_safeguard: string | null;
  risk_level: string;
  status: string;
  security_measures: string[];
  created_at: string;
  updated_at: string;
}

const emptyForm = {
  name: "",
  description: "",
  department: "",
  legal_basis: "",
  legal_basis_detail: "",
  purpose: "",
  controller: "",
  operator: "",
  dpo_contact: "",
  data_subjects: "",
  data_types: [] as string[],
  sensitive_data: false,
  sensitive_data_types: [] as string[],
  data_source: "",
  storage_location: "",
  retention_period: "",
  disposal_method: "",
  shared_with: "",
  international_transfer: false,
  transfer_country: "",
  transfer_safeguard: "",
  risk_level: "baixo",
  status: "rascunho",
  security_measures: [] as string[],
};

type FormData = typeof emptyForm;

// ─── Helpers ───

function riskIcon(level: string) {
  switch (level) {
    case "baixo": return <ShieldCheck className="h-4 w-4" />;
    case "medio": return <Shield className="h-4 w-4" />;
    case "alto": return <ShieldAlert className="h-4 w-4" />;
    case "critico": return <ShieldOff className="h-4 w-4" />;
    default: return <Shield className="h-4 w-4" />;
  }
}

function TagInput({
  values,
  onChange,
  suggestions,
  placeholder,
  onPersistNew,
  customOptions,
  onDeleteCustom,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  suggestions: string[];
  placeholder: string;
  onPersistNew?: (tag: string) => Promise<void> | void;
  customOptions?: string[];
  onDeleteCustom?: (tag: string) => Promise<void> | void;
}) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const filtered = suggestions.filter(
    (s) => !values.includes(s) && s.toLowerCase().includes(input.toLowerCase())
  );

  const addTag = async (tag: string) => {
    const clean = tag.trim();
    if (!clean) {
      setInput("");
      setShowSuggestions(false);
      return;
    }
    if (!values.includes(clean)) {
      onChange([...values, clean]);
    }
    // Persist as reusable option if it is brand new
    if (onPersistNew && !suggestions.includes(clean)) {
      try { await onPersistNew(clean); } catch { /* no-op */ }
    }
    setInput("");
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => onChange(values.filter((v) => v !== tag));

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-input bg-background p-2 min-h-[42px]">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
            {v}
            <button onClick={() => removeTag(v)} className="hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(input); }
          }}
          placeholder={values.length === 0 ? placeholder : "Digite e pressione Enter para adicionar..."}
          className="flex-1 min-w-[160px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Helper row: add button + manage */}
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          Pressione <kbd className="rounded border bg-muted px-1">Enter</kbd> ou vírgula para adicionar. Novos tipos ficam salvos para reutilização.
        </p>
        {onDeleteCustom && customOptions && customOptions.length > 0 && (
          <button
            type="button"
            onClick={() => setManageOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <Settings2 className="h-3 w-3" /> Gerenciar ({customOptions.length})
          </button>
        )}
      </div>

      {showSuggestions && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-40 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-elevated">
          {filtered.slice(0, 10).map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(s)}
              className="w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-accent"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {manageOpen && onDeleteCustom && customOptions && (
        <div className="mt-2 rounded-lg border border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipos personalizados salvos</p>
            <button type="button" onClick={() => setManageOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {customOptions.map((c) => (
              <span key={c} className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-xs">
                {c}
                <button
                  type="button"
                  onClick={() => onDeleteCustom(c)}
                  className="text-muted-foreground hover:text-destructive"
                  title="Remover da biblioteca"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───

export default function Mapeamento() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<ProcessActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState<ProcessActivity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProcessActivity | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [customNormal, setCustomNormal] = useState<string[]>([]);
  const [customSensitive, setCustomSensitive] = useState<string[]>([]);

  const fetchTenantAndOptions = useCallback(async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles").select("tenant_id").eq("user_id", user.id).maybeSingle();
    const tId = profile?.tenant_id ?? null;
    setTenantId(tId);
    if (!tId) return;
    const { data } = await supabase
      .from("tenant_data_type_options")
      .select("label, category")
      .eq("tenant_id", tId)
      .order("label", { ascending: true });
    if (data) {
      setCustomNormal(data.filter((d: any) => d.category === "normal").map((d: any) => d.label));
      setCustomSensitive(data.filter((d: any) => d.category === "sensitive").map((d: any) => d.label));
    }
  }, [user]);

  useEffect(() => { fetchTenantAndOptions(); }, [fetchTenantAndOptions]);

  const persistOption = async (label: string, category: "normal" | "sensitive") => {
    if (!tenantId) return;
    const clean = label.trim();
    if (!clean) return;
    const list = category === "normal" ? customNormal : customSensitive;
    if (list.includes(clean)) return;
    const { error } = await supabase
      .from("tenant_data_type_options")
      .insert({ tenant_id: tenantId, label: clean, category, created_by: user?.id ?? null });
    if (!error) {
      if (category === "normal") setCustomNormal((p) => [...p, clean].sort());
      else setCustomSensitive((p) => [...p, clean].sort());
    } else if (!error.message.includes("duplicate")) {
      toast({ title: "Não foi possível salvar o tipo", description: error.message, variant: "destructive" });
    }
  };

  const deleteOption = async (label: string, category: "normal" | "sensitive") => {
    if (!tenantId) return;
    const { error } = await supabase
      .from("tenant_data_type_options")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("category", category)
      .eq("label", label);
    if (!error) {
      if (category === "normal") setCustomNormal((p) => p.filter((x) => x !== label));
      else setCustomSensitive((p) => p.filter((x) => x !== label));
      toast({ title: "Tipo removido da biblioteca" });
    } else {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    }
  };

  const fetchActivities = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("processing_activities")
      .select("*")
      .order("updated_at", { ascending: false });
    if (!error && data) {
      setActivities(data as unknown as ProcessActivity[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchActivities(); }, [user]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEdit = (a: ProcessActivity) => {
    setEditingId(a.id);
    setForm({
      name: a.name,
      description: a.description ?? "",
      department: a.department,
      legal_basis: a.legal_basis,
      legal_basis_detail: a.legal_basis_detail ?? "",
      purpose: a.purpose,
      controller: a.controller,
      operator: a.operator ?? "",
      dpo_contact: a.dpo_contact ?? "",
      data_subjects: a.data_subjects,
      data_types: a.data_types ?? [],
      sensitive_data: a.sensitive_data,
      sensitive_data_types: a.sensitive_data_types ?? [],
      data_source: a.data_source ?? "",
      storage_location: a.storage_location ?? "",
      retention_period: a.retention_period ?? "",
      disposal_method: a.disposal_method ?? "",
      shared_with: a.shared_with ?? "",
      international_transfer: a.international_transfer,
      transfer_country: a.transfer_country ?? "",
      transfer_safeguard: a.transfer_safeguard ?? "",
      risk_level: a.risk_level,
      status: a.status,
      security_measures: a.security_measures ?? [],
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.name.trim() || !form.department || !form.legal_basis || !form.purpose.trim() || !form.controller.trim() || !form.data_subjects.trim()) {
      toast({ title: "Campos obrigatórios", description: "Preencha todos os campos marcados como obrigatórios.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      department: form.department,
      legal_basis: form.legal_basis as any,
      legal_basis_detail: form.legal_basis_detail.trim() || null,
      purpose: form.purpose.trim(),
      controller: form.controller.trim(),
      operator: form.operator.trim() || null,
      dpo_contact: form.dpo_contact.trim() || null,
      data_subjects: form.data_subjects.trim(),
      data_types: form.data_types,
      sensitive_data: form.sensitive_data,
      sensitive_data_types: form.sensitive_data ? form.sensitive_data_types : [],
      data_source: form.data_source.trim() || null,
      storage_location: form.storage_location.trim() || null,
      retention_period: form.retention_period.trim() || null,
      disposal_method: form.disposal_method.trim() || null,
      shared_with: form.shared_with.trim() || null,
      international_transfer: form.international_transfer,
      transfer_country: form.international_transfer ? (form.transfer_country.trim() || null) : null,
      transfer_safeguard: form.international_transfer ? (form.transfer_safeguard.trim() || null) : null,
      risk_level: form.risk_level as any,
      status: form.status as any,
      security_measures: form.security_measures,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("processing_activities").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("processing_activities").insert({ ...payload, user_id: user.id }));
    }

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Processo atualizado!" : "Processo criado!" });
      setDialogOpen(false);
      fetchActivities();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("processing_activities").delete().eq("id", deleteTarget.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Processo excluído" });
      fetchActivities();
    }
    setDeleteTarget(null);
  };

  // Filtering
  const filtered = activities.filter((a) => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.department.toLowerCase().includes(search.toLowerCase()) ||
      a.controller.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || a.status === filterStatus;
    const matchRisk = filterRisk === "all" || a.risk_level === filterRisk;
    return matchSearch && matchStatus && matchRisk;
  });

  // KPIs
  const totalCount = activities.length;
  const activeCount = activities.filter((a) => a.status === "ativo").length;
  const highRiskCount = activities.filter((a) => a.risk_level === "alto" || a.risk_level === "critico").length;
  const sensitiveCount = activities.filter((a) => a.sensitive_data).length;

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Mapeamento de Dados</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Inventário de dados pessoais e atividades de tratamento (ROPA)
          </p>
        </div>
        <Button onClick={openCreate} className="shadow-glow">
          <Plus className="h-4 w-4 mr-2" /> Novo Processo
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total de Processos", value: totalCount, icon: Database },
          { label: "Processos Ativos", value: activeCount, icon: ShieldCheck },
          { label: "Alto Risco", value: highRiskCount, icon: ShieldAlert },
          { label: "Dados Sensíveis", value: sensitiveCount, icon: ShieldOff },
        ].map((kpi) => (
          <Card key={kpi.label} className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                  <p className="mt-1 font-display text-2xl font-extrabold">{kpi.value}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
                  <kpi.icon className="h-4 w-4 text-accent-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, departamento ou controlador..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" /><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterRisk} onValueChange={setFilterRisk}>
          <SelectTrigger className="w-[160px]"><ShieldAlert className="h-3.5 w-3.5 mr-2 text-muted-foreground" /><SelectValue placeholder="Risco" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Riscos</SelectItem>
            {RISK_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="shadow-card animate-pulse"><CardContent className="p-5 h-20" /></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-16 text-center">
            <Database className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              {activities.length === 0 ? 'Nenhum processo cadastrado. Clique em "Novo Processo" para começar.' : "Nenhum processo encontrado com os filtros aplicados."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const risk = RISK_OPTIONS.find((r) => r.value === a.risk_level);
            const status = STATUS_OPTIONS.find((s) => s.value === a.status);
            const legal = LEGAL_BASIS_OPTIONS.find((l) => l.value === a.legal_basis);
            return (
              <Card key={a.id} className="shadow-card transition-all hover:shadow-elevated">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display text-sm font-semibold truncate">{a.name}</h3>
                        <Badge variant="outline" className={`text-[10px] ${status?.color}`}>{status?.label}</Badge>
                        <Badge variant="outline" className={`text-[10px] ${risk?.color}`}>
                          {riskIcon(a.risk_level)} <span className="ml-1">{risk?.label}</span>
                        </Badge>
                        {a.sensitive_data && <Badge variant="outline" className="text-[10px] text-destructive">Sensível</Badge>}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                        <span>{a.department}</span>
                        <span>{legal?.label}</span>
                        <span>{a.controller}</span>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailOpen(a)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(a)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Detail Dialog ─── */}
      <Dialog open={!!detailOpen} onOpenChange={() => setDetailOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailOpen && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">{detailOpen.name}</DialogTitle>
                <DialogDescription>{detailOpen.description || "Sem descrição"}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-sm">
                <DetailField label="Departamento" value={detailOpen.department} />
                <DetailField label="Base Legal" value={LEGAL_BASIS_OPTIONS.find((l) => l.value === detailOpen.legal_basis)?.label ?? detailOpen.legal_basis} />
                <DetailField label="Finalidade" value={detailOpen.purpose} />
                <DetailField label="Controlador" value={detailOpen.controller} />
                <DetailField label="Operador" value={detailOpen.operator} />
                <DetailField label="Contato DPO" value={detailOpen.dpo_contact} />
                <DetailField label="Titulares" value={detailOpen.data_subjects} />
                <DetailField label="Nível de Risco" value={RISK_OPTIONS.find((r) => r.value === detailOpen.risk_level)?.label} />
                <DetailField label="Status" value={STATUS_OPTIONS.find((s) => s.value === detailOpen.status)?.label} />
                <DetailField label="Origem dos Dados" value={detailOpen.data_source} />
                <DetailField label="Armazenamento" value={detailOpen.storage_location} />
                <DetailField label="Período de Retenção" value={detailOpen.retention_period} />
                <DetailField label="Método de Descarte" value={detailOpen.disposal_method} />
                <DetailField label="Compartilhado com" value={detailOpen.shared_with} />
                <DetailField label="Transferência Internacional" value={detailOpen.international_transfer ? `Sim — ${detailOpen.transfer_country ?? ""}` : "Não"} />
                {detailOpen.international_transfer && <DetailField label="Salvaguarda" value={detailOpen.transfer_safeguard} />}
              </div>
              {detailOpen.data_types?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tipos de Dados</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detailOpen.data_types.map((d) => <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>)}
                  </div>
                </div>
              )}
              {detailOpen.sensitive_data && detailOpen.sensitive_data_types?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-2">Dados Sensíveis</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detailOpen.sensitive_data_types.map((d) => <Badge key={d} variant="destructive" className="text-xs">{d}</Badge>)}
                  </div>
                </div>
              )}
              {detailOpen.security_measures?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Medidas de Segurança</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detailOpen.security_measures.map((m) => <Badge key={m} variant="outline" className="text-xs">{m}</Badge>)}
                  </div>
                </div>
              )}
              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => { setDetailOpen(null); openEdit(detailOpen); }}>
                  <Edit2 className="h-4 w-4 mr-2" /> Editar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm ─── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir processo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteTarget?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Create / Edit Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editingId ? "Editar Processo" : "Novo Processo"}</DialogTitle>
            <DialogDescription>Preencha as informações sobre a atividade de tratamento de dados pessoais.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="info" className="mt-2">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="data">Dados</TabsTrigger>
              <TabsTrigger value="lifecycle">Ciclo de Vida</TabsTrigger>
              <TabsTrigger value="security">Segurança</TabsTrigger>
            </TabsList>

            {/* Tab 1: Info */}
            <TabsContent value="info" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label>Nome do Processo *</Label>
                  <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Ex: Cadastro de clientes" className="mt-1" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Descrição</Label>
                  <Textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} placeholder="Descreva a atividade de tratamento..." className="mt-1" rows={2} />
                </div>
                <div>
                  <Label>Departamento *</Label>
                  <Select value={form.department} onValueChange={(v) => updateField("department", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{DEPARTMENT_OPTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Base Legal *</Label>
                  <Select value={form.legal_basis} onValueChange={(v) => updateField("legal_basis", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{LEGAL_BASIS_OPTIONS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Detalhamento da Base Legal</Label>
                  <Input value={form.legal_basis_detail} onChange={(e) => updateField("legal_basis_detail", e.target.value)} placeholder="Justificativa ou referência legal" className="mt-1" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Finalidade do Tratamento *</Label>
                  <Textarea value={form.purpose} onChange={(e) => updateField("purpose", e.target.value)} placeholder="Para que os dados são tratados?" className="mt-1" rows={2} />
                </div>
                <div>
                  <Label>Controlador *</Label>
                  <Input value={form.controller} onChange={(e) => updateField("controller", e.target.value)} placeholder="Nome da organização" className="mt-1" />
                </div>
                <div>
                  <Label>Operador</Label>
                  <Input value={form.operator} onChange={(e) => updateField("operator", e.target.value)} placeholder="Terceiro que processa dados" className="mt-1" />
                </div>
                <div>
                  <Label>Contato do DPO</Label>
                  <Input value={form.dpo_contact} onChange={(e) => updateField("dpo_contact", e.target.value)} placeholder="E-mail ou telefone" className="mt-1" />
                </div>
                <div>
                  <Label>Titulares dos Dados *</Label>
                  <Input value={form.data_subjects} onChange={(e) => updateField("data_subjects", e.target.value)} placeholder="Ex: Clientes, Colaboradores" className="mt-1" />
                </div>
                <div>
                  <Label>Nível de Risco</Label>
                  <Select value={form.risk_level} onValueChange={(v) => updateField("risk_level", v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{RISK_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Data */}
            <TabsContent value="data" className="space-y-4 mt-4">
              <div>
                <Label>Tipos de Dados Coletados *</Label>
                <div className="mt-1">
                  <TagInput
                    values={form.data_types}
                    onChange={(v) => updateField("data_types", v)}
                    suggestions={[...DATA_TYPES_SUGGESTIONS, ...customNormal]}
                    placeholder="Adicione tipos de dados..."
                    onPersistNew={(t) => persistOption(t, "normal")}
                    customOptions={customNormal}
                    onDeleteCustom={(t) => deleteOption(t, "normal")}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border p-4">
                <Switch checked={form.sensitive_data} onCheckedChange={(v) => updateField("sensitive_data", v)} />
                <div>
                  <Label>Dados Sensíveis (Art. 11 LGPD)</Label>
                  <p className="text-xs text-muted-foreground">Este processo trata dados pessoais sensíveis?</p>
                </div>
              </div>
              {form.sensitive_data && (
                <div>
                  <Label>Categorias de Dados Sensíveis</Label>
                  <div className="mt-1">
                    <TagInput values={form.sensitive_data_types} onChange={(v) => updateField("sensitive_data_types", v)} suggestions={SENSITIVE_DATA_TYPES} placeholder="Selecione categorias..." />
                  </div>
                </div>
              )}
              <div>
                <Label>Origem dos Dados</Label>
                <Input value={form.data_source} onChange={(e) => updateField("data_source", e.target.value)} placeholder="Ex: Formulário web, sistema ERP" className="mt-1" />
              </div>
              <div>
                <Label>Compartilhado com</Label>
                <Input value={form.shared_with} onChange={(e) => updateField("shared_with", e.target.value)} placeholder="Parceiros, fornecedores, órgãos..." className="mt-1" />
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border p-4">
                <Switch checked={form.international_transfer} onCheckedChange={(v) => updateField("international_transfer", v)} />
                <div>
                  <Label>Transferência Internacional</Label>
                  <p className="text-xs text-muted-foreground">Os dados são enviados para fora do Brasil?</p>
                </div>
              </div>
              {form.international_transfer && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>País de Destino</Label>
                    <Input value={form.transfer_country} onChange={(e) => updateField("transfer_country", e.target.value)} placeholder="Ex: Estados Unidos" className="mt-1" />
                  </div>
                  <div>
                    <Label>Salvaguarda</Label>
                    <Input value={form.transfer_safeguard} onChange={(e) => updateField("transfer_safeguard", e.target.value)} placeholder="Ex: Cláusulas contratuais padrão" className="mt-1" />
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Tab 3: Lifecycle */}
            <TabsContent value="lifecycle" className="space-y-4 mt-4">
              <div>
                <Label>Local de Armazenamento</Label>
                <Input value={form.storage_location} onChange={(e) => updateField("storage_location", e.target.value)} placeholder="Ex: AWS S3, servidor local, Google Drive" className="mt-1" />
              </div>
              <div>
                <Label>Período de Retenção</Label>
                <Input value={form.retention_period} onChange={(e) => updateField("retention_period", e.target.value)} placeholder="Ex: 5 anos após término do contrato" className="mt-1" />
              </div>
              <div>
                <Label>Método de Descarte</Label>
                <Input value={form.disposal_method} onChange={(e) => updateField("disposal_method", e.target.value)} placeholder="Ex: Exclusão segura, anonimização" className="mt-1" />
              </div>
            </TabsContent>

            {/* Tab 4: Security */}
            <TabsContent value="security" className="space-y-4 mt-4 min-h-[300px]">
              <div>
                <Label>Medidas de Segurança Implementadas</Label>
                <div className="mt-1">
                  <TagInput values={form.security_measures} onChange={(v) => updateField("security_measures", v)} suggestions={SECURITY_MEASURES_SUGGESTIONS} placeholder="Adicione medidas de segurança..." />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="shadow-glow">
              {saving ? "Salvando..." : editingId ? "Salvar Alterações" : "Criar Processo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );
}
