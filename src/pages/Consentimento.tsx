import { useState, useEffect } from "react";
import {
  Cookie,
  Settings,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  X,
  CheckCircle2,
  XCircle,
  RotateCcw,
  RefreshCw,
  Shield,
  Globe,
  Monitor,
  BarChart3,
  Megaphone,
  Copy,
  Code,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  Clock,
  Users,
  Filter,
  Info,
  Radar,
  Loader2,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ───

type CookieCategory = "essencial" | "desempenho" | "funcionalidade" | "marketing";
type ConsentAction = "aceito" | "recusado" | "revogado" | "atualizado";

interface CookiePolicy {
  id: string;
  name: string;
  is_active: boolean;
  banner_title: string;
  banner_description: string;
  banner_position: string;
  banner_theme: string;
  show_reject_all: boolean;
  show_preferences: boolean;
  auto_block_scripts: boolean;
  privacy_policy_url: string | null;
  cookie_policy_url: string | null;
  created_at: string;
  updated_at: string;
}

interface CookieDefinition {
  id: string;
  policy_id: string | null;
  name: string;
  provider: string;
  category: CookieCategory;
  description: string | null;
  duration: string;
  is_required: boolean;
  created_at: string;
}

interface ConsentRecord {
  id: string;
  visitor_id: string;
  ip_address: string | null;
  user_agent: string | null;
  action: ConsentAction;
  purposes: string[];
  cookie_categories: CookieCategory[];
  consent_given_at: string;
  expires_at: string | null;
  created_at: string;
}

// ─── Constants ───

const CATEGORY_INFO: Record<CookieCategory, { label: string; icon: typeof Cookie; color: string; bg: string; desc: string }> = {
  essencial: { label: "Essenciais", icon: Shield, color: "text-primary", bg: "bg-primary/10", desc: "Necessários para o funcionamento do site" },
  desempenho: { label: "Desempenho", icon: BarChart3, color: "text-sky-500", bg: "bg-sky-500/10", desc: "Análise de uso e performance" },
  funcionalidade: { label: "Funcionalidade", icon: Settings, color: "text-amber-500", bg: "bg-amber-500/10", desc: "Personalização e preferências" },
  marketing: { label: "Marketing", icon: Megaphone, color: "text-purple-500", bg: "bg-purple-500/10", desc: "Publicidade e remarketing" },
};

const ACTION_INFO: Record<ConsentAction, { label: string; icon: typeof CheckCircle2; color: string; bg: string }> = {
  aceito: { label: "Aceito", icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10" },
  recusado: { label: "Recusado", icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
  revogado: { label: "Revogado", icon: RotateCcw, color: "text-amber-500", bg: "bg-amber-500/10" },
  atualizado: { label: "Atualizado", icon: RefreshCw, color: "text-sky-500", bg: "bg-sky-500/10" },
};

const emptyPolicy: Omit<CookiePolicy, "id" | "created_at" | "updated_at"> = {
  name: "Configuração Padrão",
  is_active: false,
  banner_title: "Utilizamos cookies",
  banner_description: "Nosso site utiliza cookies para melhorar sua experiência. Ao continuar navegando, você concorda com nossa Política de Cookies.",
  banner_position: "bottom",
  banner_theme: "light",
  show_reject_all: true,
  show_preferences: true,
  auto_block_scripts: false,
  privacy_policy_url: "",
  cookie_policy_url: "",
};

const emptyCookie = {
  name: "",
  provider: "Próprio",
  category: "essencial" as CookieCategory,
  description: "",
  duration: "Sessão",
  is_required: false,
};

// ─── Main Component ───

export default function Consentimento() {
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [activeTab, setActiveTab] = useState("scanner");
  const [policies, setPolicies] = useState<CookiePolicy[]>([]);
  const [cookies, setCookies] = useState<CookieDefinition[]>([]);
  const [records, setRecords] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Banner config
  const [policyForm, setPolicyForm] = useState(emptyPolicy);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Cookie definitions
  const [cookieDialogOpen, setCookieDialogOpen] = useState(false);
  const [cookieForm, setCookieForm] = useState(emptyCookie);
  const [editingCookieId, setEditingCookieId] = useState<string | null>(null);
  const [deleteCookieTarget, setDeleteCookieTarget] = useState<CookieDefinition | null>(null);

  // Records
  const [recordSearch, setRecordSearch] = useState("");
  const [recordFilter, setRecordFilter] = useState("all");

  // Scanner
  const [scanUrl, setScanUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState("");
  const [scanResults, setScanResults] = useState<{
    url: string;
    title: string;
    scripts_found: number;
    cookies: Array<{
      name: string;
      provider: string;
      category: CookieCategory;
      description: string;
      duration: string;
      is_required: boolean;
    }>;
    banner_title: string;
    banner_description: string;
    summary: string;
  } | null>(null);

  // ─── Fetch Data ───
  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);

    const [pRes, cRes, rRes] = await Promise.all([
      supabase.from("cookie_policies").select("*").order("created_at", { ascending: false }),
      supabase.from("cookie_definitions").select("*").order("category", { ascending: true }),
      supabase.from("consent_records").select("*").order("created_at", { ascending: false }).limit(200),
    ]);

    if (pRes.data) {
      const data = pRes.data as unknown as CookiePolicy[];
      setPolicies(data);
      if (data.length > 0) {
        const active = data.find((p) => p.is_active) || data[0];
        setPolicyForm({
          name: active.name,
          is_active: active.is_active,
          banner_title: active.banner_title,
          banner_description: active.banner_description,
          banner_position: active.banner_position,
          banner_theme: active.banner_theme,
          show_reject_all: active.show_reject_all,
          show_preferences: active.show_preferences,
          auto_block_scripts: active.auto_block_scripts,
          privacy_policy_url: active.privacy_policy_url || "",
          cookie_policy_url: active.cookie_policy_url || "",
        });
        setEditingPolicyId(active.id);
      }
    }
    if (cRes.data) setCookies(cRes.data as unknown as CookieDefinition[]);
    if (rRes.data) setRecords(rRes.data as unknown as ConsentRecord[]);

    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [user]);

  // ─── Save Banner Config ───
  const handleSavePolicy = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      ...policyForm,
      privacy_policy_url: policyForm.privacy_policy_url || null,
      cookie_policy_url: policyForm.cookie_policy_url || null,
      user_id: user.id,
    };

    let error;
    if (editingPolicyId) {
      ({ error } = await supabase.from("cookie_policies").update(payload as any).eq("id", editingPolicyId));
    } else {
      ({ error } = await supabase.from("cookie_policies").insert(payload as any));
    }

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configuração salva" });
      fetchAll();
    }
    setSaving(false);
  };

  // ─── Save Cookie Definition ───
  const handleSaveCookie = async () => {
    if (!user) return;
    if (!cookieForm.name.trim()) {
      toast({ title: "Nome do cookie obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload = {
      ...cookieForm,
      description: cookieForm.description || null,
      policy_id: editingPolicyId,
      user_id: user.id,
    };

    let error;
    if (editingCookieId) {
      ({ error } = await supabase.from("cookie_definitions").update(payload as any).eq("id", editingCookieId));
    } else {
      ({ error } = await supabase.from("cookie_definitions").insert(payload as any));
    }

    if (error) {
      toast({ title: "Erro ao salvar cookie", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingCookieId ? "Cookie atualizado" : "Cookie adicionado" });
      setCookieDialogOpen(false);
      setCookieForm(emptyCookie);
      setEditingCookieId(null);
      fetchAll();
    }
    setSaving(false);
  };

  // ─── Delete Cookie ───
  const handleDeleteCookie = async () => {
    if (!deleteCookieTarget) return;
    const { error } = await supabase.from("cookie_definitions").delete().eq("id", deleteCookieTarget.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cookie excluído" });
      fetchAll();
    }
    setDeleteCookieTarget(null);
  };

  const editCookie = (c: CookieDefinition) => {
    setCookieForm({
      name: c.name,
      provider: c.provider,
      category: c.category,
      description: c.description || "",
      duration: c.duration,
      is_required: c.is_required,
    });
    setEditingCookieId(c.id);
    setCookieDialogOpen(true);
  };

  // ─── Domain Scanner ───
  const handleScan = async () => {
    if (!scanUrl.trim()) {
      toast({ title: "Informe a URL do domínio", variant: "destructive" });
      return;
    }
    setScanning(true);
    setScanResults(null);
    setScanProgress(10);
    setScanStatus("Iniciando varredura do domínio...");

    // Simulate progress while waiting
    const progressInterval = setInterval(() => {
      setScanProgress((p) => {
        if (p >= 85) return p;
        const increment = p < 30 ? 8 : p < 60 ? 5 : 2;
        return Math.min(p + increment, 85);
      });
      setScanStatus((prev) => {
        const stages = [
          "Conectando ao domínio...",
          "Extraindo HTML e scripts...",
          "Identificando tecnologias de rastreamento...",
          "Analisando cookies com IA...",
          "Classificando por categoria LGPD...",
          "Gerando recomendações...",
        ];
        const idx = stages.indexOf(prev);
        return stages[Math.min(idx + 1, stages.length - 1)] || prev;
      });
    }, 2000);

    try {
      const { data, error } = await supabase.functions.invoke("scan-domain-cookies", {
        body: { url: scanUrl.trim() },
      });

      clearInterval(progressInterval);

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || "Erro desconhecido");
      }

      setScanProgress(100);
      setScanStatus("Varredura concluída!");
      setScanResults(data.data);
      toast({ title: "Varredura concluída", description: `${data.data.cookies?.length || 0} cookies encontrados` });
    } catch (err: any) {
      clearInterval(progressInterval);
      setScanProgress(0);
      setScanStatus("");
      toast({ title: "Erro na varredura", description: err.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const applyScanResults = async () => {
    if (!scanResults || !user) return;

    // Apply banner config
    setPolicyForm((f) => ({
      ...f,
      banner_title: scanResults.banner_title || f.banner_title,
      banner_description: scanResults.banner_description || f.banner_description,
    }));

    // Save cookies found
    let saved = 0;
    for (const cookie of scanResults.cookies) {
      const { error } = await supabase.from("cookie_definitions").insert({
        name: cookie.name,
        provider: cookie.provider,
        category: cookie.category,
        description: cookie.description,
        duration: cookie.duration,
        is_required: cookie.is_required,
        policy_id: editingPolicyId,
        user_id: user.id,
      } as any);
      if (!error) saved++;
    }

    toast({
      title: "Resultados aplicados",
      description: `${saved} cookies adicionados e banner atualizado`,
    });

    setScanResults(null);
    setScanProgress(0);
    setScanStatus("");
    fetchAll();
    setActiveTab("banner");
  };

  // ─── Filtered Records ───
  const filteredRecords = records.filter((r) => {
    if (recordSearch && !r.visitor_id.toLowerCase().includes(recordSearch.toLowerCase())) return false;
    if (recordFilter !== "all" && r.action !== recordFilter) return false;
    return true;
  });

  // ─── KPIs ───
  const totalRecords = records.length;
  const accepted = records.filter((r) => r.action === "aceito").length;
  const rejected = records.filter((r) => r.action === "recusado").length;
  const acceptRate = totalRecords > 0 ? Math.round((accepted / totalRecords) * 100) : 0;

  const kpis = [
    { label: "Total Consentimentos", value: totalRecords, icon: Users, color: "text-foreground" },
    { label: "Aceitos", value: accepted, icon: CheckCircle2, color: "text-primary" },
    { label: "Recusados", value: rejected, icon: XCircle, color: "text-destructive" },
    { label: "Taxa de Aceite", value: `${acceptRate}%`, icon: BarChart3, color: "text-sky-500" },
  ];

  const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const cookiesByCategory = (Object.keys(CATEGORY_INFO) as CookieCategory[]).map((cat) => ({
    ...CATEGORY_INFO[cat],
    category: cat,
    cookies: cookies.filter((c) => c.category === cat),
  }));

  // ─── Generate Script Snippet ───
  const generateSnippet = () => {
    const snippet = `<!-- Cookie Banner - LGPD Compliance -->
<script>
  (function() {
    var config = {
      title: "${policyForm.banner_title}",
      description: "${policyForm.banner_description.replace(/"/g, '\\"')}",
      position: "${policyForm.banner_position}",
      theme: "${policyForm.banner_theme}",
      showRejectAll: ${policyForm.show_reject_all},
      showPreferences: ${policyForm.show_preferences},
      privacyPolicyUrl: "${policyForm.privacy_policy_url || ""}",
      cookiePolicyUrl: "${policyForm.cookie_policy_url || ""}"
    };
    // Implementação do banner aqui
    console.log("Cookie Banner Config:", config);
  })();
</script>`;
    navigator.clipboard.writeText(snippet);
    toast({ title: "Código copiado para a área de transferência" });
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto flex items-center justify-center py-24">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Consentimento & Cookies</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestão de consentimento, banner de cookies e registro de preferências</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent">
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scanner" className="gap-2"><Radar className="h-4 w-4" /> Scanner</TabsTrigger>
          <TabsTrigger value="banner" className="gap-2"><Cookie className="h-4 w-4" /> Banner</TabsTrigger>
          <TabsTrigger value="cookies" className="gap-2"><Settings className="h-4 w-4" /> Cookies</TabsTrigger>
          <TabsTrigger value="records" className="gap-2"><Clock className="h-4 w-4" /> Registros</TabsTrigger>
        </TabsList>

        {/* ─── Domain Scanner ─── */}
        <TabsContent value="scanner" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Scanner Input */}
            <div className="space-y-4">
              <Card className="shadow-card">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-display flex items-center gap-2">
                    <Radar className="h-4 w-4 text-primary" /> Scanner de Domínio
                  </CardTitle>
                  <CardDescription>
                    Escaneie um site para detectar automaticamente cookies e tecnologias de rastreamento
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>URL do Domínio</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={scanUrl}
                          onChange={(e) => setScanUrl(e.target.value)}
                          placeholder="https://www.exemplo.com.br"
                          className="pl-9"
                          disabled={scanning}
                          onKeyDown={(e) => { if (e.key === "Enter") handleScan(); }}
                        />
                      </div>
                      <Button onClick={handleScan} disabled={scanning} className="shrink-0">
                        {scanning ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Escaneando...</>
                        ) : (
                          <><Radar className="h-4 w-4 mr-2" /> Escanear</>
                        )}
                      </Button>
                    </div>
                  </div>

                  {scanning && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      <Progress value={scanProgress} className="h-2" />
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <p className="text-xs text-muted-foreground">{scanStatus}</p>
                      </div>
                    </motion.div>
                  )}

                  {!scanning && !scanResults && (
                    <div className="rounded-lg border-2 border-dashed p-8 text-center">
                      <Radar className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="font-display text-sm font-semibold">Nenhuma varredura realizada</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Insira a URL do site e clique em "Escanear" para detectar cookies automaticamente
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center mt-4">
                        <Badge variant="outline" className="text-xs gap-1"><Shield className="h-3 w-3" /> Essenciais</Badge>
                        <Badge variant="outline" className="text-xs gap-1"><BarChart3 className="h-3 w-3" /> Desempenho</Badge>
                        <Badge variant="outline" className="text-xs gap-1"><Settings className="h-3 w-3" /> Funcionalidade</Badge>
                        <Badge variant="outline" className="text-xs gap-1"><Megaphone className="h-3 w-3" /> Marketing</Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {scanResults && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="shadow-card border-primary/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-display flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary" /> Resumo da Varredura
                        </CardTitle>
                        <Badge className="bg-primary/10 text-primary border-0">{scanResults.cookies.length} cookies</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="rounded-lg bg-muted/50 p-3 text-sm">{scanResults.summary}</div>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="rounded-lg border p-2">
                          <p className="text-lg font-bold font-display">{scanResults.scripts_found}</p>
                          <p className="text-[10px] text-muted-foreground">Scripts detectados</p>
                        </div>
                        <div className="rounded-lg border p-2">
                          <p className="text-lg font-bold font-display">{scanResults.cookies.length}</p>
                          <p className="text-[10px] text-muted-foreground">Cookies identificados</p>
                        </div>
                      </div>
                      <Button onClick={applyScanResults} className="w-full gap-2">
                        <Zap className="h-4 w-4" /> Aplicar Resultados
                      </Button>
                      <p className="text-[10px] text-muted-foreground text-center">
                        Isso preencherá o banner e adicionará os cookies encontrados
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Scan Results Detail */}
            <div className="space-y-4">
              {scanResults ? (
                <>
                  {/* Banner preview from scan */}
                  <Card className="shadow-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-display">Banner Sugerido</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-lg border p-4 bg-card space-y-2">
                        <div className="flex items-start gap-2">
                          <Cookie className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                          <div>
                            <p className="font-display text-sm font-semibold">{scanResults.banner_title}</p>
                            <p className="text-xs mt-1 text-muted-foreground leading-relaxed">{scanResults.banner_description}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Cookies found by category */}
                  <Card className="shadow-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-display">Cookies Encontrados</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
                      {(Object.keys(CATEGORY_INFO) as CookieCategory[]).map((cat) => {
                        const catCookies = scanResults.cookies.filter((c) => c.category === cat);
                        if (catCookies.length === 0) return null;
                        const info = CATEGORY_INFO[cat];
                        const CatIcon = info.icon;
                        return (
                          <div key={cat} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <CatIcon className={`h-3.5 w-3.5 ${info.color}`} />
                              <p className="text-xs font-semibold">{info.label}</p>
                              <Badge variant="outline" className="text-[10px] ml-auto">{catCookies.length}</Badge>
                            </div>
                            {catCookies.map((c, i) => (
                              <div key={i} className="rounded-lg border p-2.5 ml-5">
                                <div className="flex items-center justify-between">
                                  <code className="text-xs font-semibold bg-muted px-1.5 py-0.5 rounded">{c.name}</code>
                                  <span className="text-[10px] text-muted-foreground">{c.duration}</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-1">{c.provider} — {c.description}</p>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="shadow-card">
                  <CardContent className="p-8 text-center">
                    <div className="space-y-4">
                      <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-accent">
                        <Globe className="h-8 w-8 text-accent-foreground" />
                      </div>
                      <div>
                        <p className="font-display text-sm font-semibold">Como funciona?</p>
                        <div className="mt-3 space-y-2 text-left">
                          {[
                            { step: "1", text: "Insira a URL do site que deseja escanear" },
                            { step: "2", text: "O scanner analisa scripts, tags e tecnologias" },
                            { step: "3", text: "IA classifica os cookies por categoria LGPD" },
                            { step: "4", text: "Aplique os resultados para preencher automaticamente" },
                          ].map((item) => (
                            <div key={item.step} className="flex items-start gap-2.5">
                              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold mt-0.5">
                                {item.step}
                              </div>
                              <p className="text-xs text-muted-foreground">{item.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                          <p className="text-[11px] text-amber-700 dark:text-amber-400">
                            O scanner identifica cookies com base nos scripts encontrados no HTML. Para resultados completos, certifique-se de que o site está acessível publicamente.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>


        {/* ─── Banner Configuration ─── */}
        <TabsContent value="banner" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Config Form */}
            <div className="lg:col-span-3 space-y-4">
              <Card className="shadow-card">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-display">Configuração do Banner</CardTitle>
                  <CardDescription>Personalize o banner de cookies exibido no seu site</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Título do Banner</Label>
                      <Input value={policyForm.banner_title} onChange={(e) => setPolicyForm((f) => ({ ...f, banner_title: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Nome da Configuração</Label>
                      <Input value={policyForm.name} onChange={(e) => setPolicyForm((f) => ({ ...f, name: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição do Banner</Label>
                    <Textarea
                      value={policyForm.banner_description}
                      onChange={(e) => setPolicyForm((f) => ({ ...f, banner_description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Posição</Label>
                      <Select value={policyForm.banner_position} onValueChange={(v) => setPolicyForm((f) => ({ ...f, banner_position: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bottom">Inferior</SelectItem>
                          <SelectItem value="top">Superior</SelectItem>
                          <SelectItem value="bottom-left">Inferior Esquerdo</SelectItem>
                          <SelectItem value="bottom-right">Inferior Direito</SelectItem>
                          <SelectItem value="center">Central (Modal)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tema</Label>
                      <Select value={policyForm.banner_theme} onValueChange={(v) => setPolicyForm((f) => ({ ...f, banner_theme: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Claro</SelectItem>
                          <SelectItem value="dark">Escuro</SelectItem>
                          <SelectItem value="auto">Automático</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>URL da Política de Privacidade</Label>
                      <Input value={policyForm.privacy_policy_url || ""} onChange={(e) => setPolicyForm((f) => ({ ...f, privacy_policy_url: e.target.value }))} placeholder="https://..." />
                    </div>
                    <div className="space-y-2">
                      <Label>URL da Política de Cookies</Label>
                      <Input value={policyForm.cookie_policy_url || ""} onChange={(e) => setPolicyForm((f) => ({ ...f, cookie_policy_url: e.target.value }))} placeholder="https://..." />
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Botão "Rejeitar Todos"</p>
                        <p className="text-xs text-muted-foreground">Exibe opção de rejeitar todos os cookies não essenciais</p>
                      </div>
                      <Switch checked={policyForm.show_reject_all} onCheckedChange={(v) => setPolicyForm((f) => ({ ...f, show_reject_all: v }))} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Gerenciar Preferências</p>
                        <p className="text-xs text-muted-foreground">Permite ao visitante gerenciar categorias individualmente</p>
                      </div>
                      <Switch checked={policyForm.show_preferences} onCheckedChange={(v) => setPolicyForm((f) => ({ ...f, show_preferences: v }))} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Bloqueio Automático de Scripts</p>
                        <p className="text-xs text-muted-foreground">Bloqueia scripts de terceiros até o consentimento</p>
                      </div>
                      <Switch checked={policyForm.auto_block_scripts} onCheckedChange={(v) => setPolicyForm((f) => ({ ...f, auto_block_scripts: v }))} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Banner Ativo</p>
                        <p className="text-xs text-muted-foreground">Ativar exibição do banner no site</p>
                      </div>
                      <Switch checked={policyForm.is_active} onCheckedChange={(v) => setPolicyForm((f) => ({ ...f, is_active: v }))} />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSavePolicy} disabled={saving} className="flex-1">
                      {saving ? "Salvando..." : "Salvar Configuração"}
                    </Button>
                    <Button variant="outline" onClick={() => setPreviewOpen(true)}>
                      <Eye className="h-4 w-4 mr-2" /> Pré-visualizar
                    </Button>
                    <Button variant="outline" onClick={generateSnippet}>
                      <Code className="h-4 w-4 mr-2" /> Copiar Script
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Live Preview */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="shadow-card sticky top-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-display flex items-center gap-2">
                    <Monitor className="h-4 w-4" /> Pré-visualização
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`rounded-lg border-2 border-dashed p-3 min-h-[300px] flex flex-col ${policyForm.banner_theme === "dark" ? "bg-sidebar-background text-sidebar-foreground" : "bg-background"}`}>
                    {/* Mock page */}
                    <div className="flex-1 space-y-2 opacity-30 mb-4">
                      <div className="h-4 rounded bg-muted w-3/4" />
                      <div className="h-3 rounded bg-muted w-full" />
                      <div className="h-3 rounded bg-muted w-5/6" />
                      <div className="h-20 rounded bg-muted mt-4" />
                      <div className="h-3 rounded bg-muted w-full" />
                      <div className="h-3 rounded bg-muted w-2/3" />
                    </div>

                    {/* Banner Preview */}
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className={`rounded-lg border p-4 space-y-3 ${policyForm.banner_theme === "dark" ? "bg-sidebar-accent border-sidebar-border" : "bg-card border-border shadow-elevated"}`}
                    >
                      <div className="flex items-start gap-2">
                        <Cookie className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="font-display text-sm font-semibold">{policyForm.banner_title || "Utilizamos cookies"}</p>
                          <p className="text-xs mt-1 opacity-70 leading-relaxed">
                            {policyForm.banner_description?.slice(0, 120) || "Descrição do banner..."}
                            {(policyForm.banner_description?.length || 0) > 120 && "..."}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" className="h-7 text-xs">Aceitar Todos</Button>
                        {policyForm.show_reject_all && (
                          <Button size="sm" variant="outline" className="h-7 text-xs">Rejeitar</Button>
                        )}
                        {policyForm.show_preferences && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs">Preferências</Button>
                        )}
                      </div>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─── Cookie Definitions ─── */}
        <TabsContent value="cookies" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">Cookies Cadastrados</h2>
              <p className="text-sm text-muted-foreground">Defina quais cookies seu site utiliza por categoria</p>
            </div>
            <Button onClick={() => { setCookieForm(emptyCookie); setEditingCookieId(null); setCookieDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar Cookie
            </Button>
          </div>

          <div className="grid gap-4">
            {cookiesByCategory.map((group) => {
              const Icon = group.icon;
              return (
                <Card key={group.category} className="shadow-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${group.bg}`}>
                          <Icon className={`h-4 w-4 ${group.color}`} />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-display">{group.label}</CardTitle>
                          <CardDescription className="text-xs">{group.desc}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline">{group.cookies.length} cookie{group.cookies.length !== 1 ? "s" : ""}</Badge>
                    </div>
                  </CardHeader>
                  {group.cookies.length > 0 && (
                    <CardContent className="pt-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Fornecedor</TableHead>
                            <TableHead>Duração</TableHead>
                            <TableHead>Obrigatório</TableHead>
                            <TableHead className="w-[80px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.cookies.map((c) => (
                            <TableRow key={c.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm">{c.name}</p>
                                  {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{c.provider}</TableCell>
                              <TableCell className="text-sm">{c.duration}</TableCell>
                              <TableCell>
                                {c.is_required ? (
                                  <Badge className="bg-primary/10 text-primary border-0 text-xs">Sim</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">Não</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editCookie(c)}>
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteCookieTarget(c)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  )}
                  {group.cookies.length === 0 && (
                    <CardContent className="pt-0 pb-4">
                      <p className="text-xs text-muted-foreground text-center py-4">Nenhum cookie cadastrado nesta categoria</p>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ─── Consent Records ─── */}
        <TabsContent value="records" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">Registros de Consentimento</h2>
              <p className="text-sm text-muted-foreground">Histórico auditável de consentimentos coletados</p>
            </div>
          </div>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={recordSearch} onChange={(e) => setRecordSearch(e.target.value)} placeholder="Buscar por ID do visitante..." className="pl-9" />
                </div>
                <Select value={recordFilter} onValueChange={setRecordFilter}>
                  <SelectTrigger className="w-[180px]"><Filter className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Ações</SelectItem>
                    <SelectItem value="aceito">Aceitos</SelectItem>
                    <SelectItem value="recusado">Recusados</SelectItem>
                    <SelectItem value="revogado">Revogados</SelectItem>
                    <SelectItem value="atualizado">Atualizados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {filteredRecords.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="p-12 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <p className="font-display font-semibold text-lg">Nenhum registro encontrado</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Os registros de consentimento aparecerão aqui quando visitantes interagirem com o banner de cookies.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-card">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Visitante</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Categorias</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Expiração</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredRecords.map((r, i) => {
                        const actionInfo = ACTION_INFO[r.action];
                        const ActionIcon = actionInfo.icon;
                        return (
                          <motion.tr
                            key={r.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            className="border-b transition-colors hover:bg-muted/50"
                          >
                            <TableCell>
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.visitor_id.slice(0, 12)}...</code>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${actionInfo.bg} ${actionInfo.color} border-0 gap-1 text-xs`}>
                                <ActionIcon className="h-3 w-3" />
                                {actionInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                {r.cookie_categories?.map((cat) => {
                                  const catInfo = CATEGORY_INFO[cat as CookieCategory];
                                  return catInfo ? (
                                    <Badge key={cat} variant="outline" className="text-[10px] px-1.5 py-0">{catInfo.label}</Badge>
                                  ) : null;
                                })}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(r.consent_given_at)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{r.expires_at ? formatDate(r.expires_at) : "—"}</TableCell>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Cookie Dialog ─── */}
      <Dialog open={cookieDialogOpen} onOpenChange={(o) => { if (!o) { setCookieDialogOpen(false); setCookieForm(emptyCookie); setEditingCookieId(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editingCookieId ? "Editar Cookie" : "Adicionar Cookie"}</DialogTitle>
            <DialogDescription>Defina as propriedades do cookie rastreado</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={cookieForm.name} onChange={(e) => setCookieForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: _ga" />
              </div>
              <div className="space-y-2">
                <Label>Fornecedor</Label>
                <Input value={cookieForm.provider} onChange={(e) => setCookieForm((f) => ({ ...f, provider: e.target.value }))} placeholder="Ex: Google Analytics" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={cookieForm.category} onValueChange={(v) => setCookieForm((f) => ({ ...f, category: v as CookieCategory }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CATEGORY_INFO) as CookieCategory[]).map((cat) => (
                      <SelectItem key={cat} value={cat}>{CATEGORY_INFO[cat].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duração</Label>
                <Input value={cookieForm.duration} onChange={(e) => setCookieForm((f) => ({ ...f, duration: e.target.value }))} placeholder="Ex: 2 anos" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={cookieForm.description} onChange={(e) => setCookieForm((f) => ({ ...f, description: e.target.value }))} placeholder="Para que este cookie é utilizado..." rows={2} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Cookie Obrigatório</p>
                <p className="text-xs text-muted-foreground">Não pode ser desativado pelo visitante</p>
              </div>
              <Switch checked={cookieForm.is_required} onCheckedChange={(v) => setCookieForm((f) => ({ ...f, is_required: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCookieDialogOpen(false); setCookieForm(emptyCookie); setEditingCookieId(null); }}>Cancelar</Button>
            <Button onClick={handleSaveCookie} disabled={saving}>
              {saving ? "Salvando..." : editingCookieId ? "Atualizar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Banner Preview Dialog ─── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Pré-visualização do Banner</DialogTitle>
            <DialogDescription>Assim ficará o banner no site dos seus clientes</DialogDescription>
          </DialogHeader>
          <div className={`rounded-xl border-2 p-6 mt-2 ${policyForm.banner_theme === "dark" ? "bg-sidebar-background text-sidebar-foreground border-sidebar-border" : "bg-card border-border"}`}>
            <div className="flex items-start gap-3">
              <Cookie className="h-6 w-6 text-primary mt-1 shrink-0" />
              <div className="flex-1 space-y-3">
                <div>
                  <p className="font-display text-lg font-bold">{policyForm.banner_title}</p>
                  <p className="text-sm mt-2 opacity-80 leading-relaxed">{policyForm.banner_description}</p>
                </div>

                {policyForm.show_preferences && (
                  <div className="space-y-2 pt-2">
                    {(Object.keys(CATEGORY_INFO) as CookieCategory[]).map((cat) => {
                      const info = CATEGORY_INFO[cat];
                      const CatIcon = info.icon;
                      return (
                        <div key={cat} className="flex items-center justify-between rounded-lg border p-2.5">
                          <div className="flex items-center gap-2">
                            <CatIcon className={`h-4 w-4 ${info.color}`} />
                            <div>
                              <p className="text-xs font-medium">{info.label}</p>
                              <p className="text-[10px] opacity-60">{info.desc}</p>
                            </div>
                          </div>
                          <Switch defaultChecked={cat === "essencial"} disabled={cat === "essencial"} />
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm">Aceitar Todos</Button>
                  {policyForm.show_reject_all && <Button size="sm" variant="outline">Rejeitar Todos</Button>}
                  <Button size="sm" variant="ghost">Salvar Preferências</Button>
                </div>

                {(policyForm.privacy_policy_url || policyForm.cookie_policy_url) && (
                  <div className="flex gap-3 pt-1">
                    {policyForm.privacy_policy_url && (
                      <a className="text-xs text-primary flex items-center gap-1 hover:underline">
                        Política de Privacidade <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {policyForm.cookie_policy_url && (
                      <a className="text-xs text-primary flex items-center gap-1 hover:underline">
                        Política de Cookies <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Cookie Confirmation ─── */}
      <AlertDialog open={!!deleteCookieTarget} onOpenChange={(o) => !o && setDeleteCookieTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cookie?</AlertDialogTitle>
            <AlertDialogDescription>
              O cookie "{deleteCookieTarget?.name}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCookie} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
