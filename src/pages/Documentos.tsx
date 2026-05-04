import { useState, useEffect } from "react";
import {
  FileText, Plus, Search, Filter, Edit2, Trash2, Eye, Clock,
  CheckCircle2, AlertCircle, Archive, X, Copy, FilePlus2, Send,
  Tag, Sparkles, BookOpen, Download, LayoutGrid, List,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  TEMPLATES, TEMPLATE_CATEGORIES, DOC_TYPE_OPTIONS, STATUS_OPTIONS,
  getStatusInfo, getTypeInfo,
  type DocumentType, type DocumentStatus, type TemplateDefinition,
} from "@/lib/document-templates";

// ─── Types ───
interface DocumentRecord {
  id: string;
  title: string;
  description: string | null;
  document_type: DocumentType;
  status: DocumentStatus;
  content: string | null;
  version: number;
  approved_by: string | null;
  approved_at: string | null;
  expires_at: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

type View = "list" | "create" | "edit" | "view" | "templates";

const emptyForm = {
  title: "",
  description: "",
  document_type: "outro" as DocumentType,
  status: "rascunho" as DocumentStatus,
  content: "",
  tags: [] as string[],
  expires_at: "",
};

// ─── Tag Input ───
function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput("");
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder || "Adicionar tag..."}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={add}><Plus className="h-4 w-4" /></Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1 pr-1">
              {t}
              <button onClick={() => onChange(tags.filter((x) => x !== t))} className="rounded-full p-0.5 hover:bg-muted"><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Priority Badge ───
function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    essencial: { label: "Essencial", cls: "bg-destructive/10 text-destructive" },
    recomendado: { label: "Recomendado", cls: "bg-amber-warning/10 text-amber-warning" },
    complementar: { label: "Complementar", cls: "bg-sky/10 text-sky" },
  };
  const info = map[priority] || map.complementar;
  return <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${info.cls}`}>{info.label}</span>;
}

// ─── Main ───
export default function Documentos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<View>("list");
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<DocumentRecord | null>(null);
  const [viewDoc, setViewDoc] = useState<DocumentRecord | null>(null);
  const [templateCategory, setTemplateCategory] = useState<string>("all");

  const fetchDocuments = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.from("documents").select("*").order("updated_at", { ascending: false });
    if (error) toast({ title: "Erro ao carregar documentos", description: error.message, variant: "destructive" });
    else setDocuments((data as unknown as DocumentRecord[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchDocuments(); }, [user]);

  const handleSave = async () => {
    if (!user || !form.title.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title, description: form.description || null,
      document_type: form.document_type, status: form.status,
      content: form.content, tags: form.tags,
      expires_at: form.expires_at || null, user_id: user.id,
    };
    let error;
    if (editingId) ({ error } = await supabase.from("documents").update(payload as any).eq("id", editingId));
    else ({ error } = await supabase.from("documents").insert(payload as any));
    if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    else { toast({ title: editingId ? "Documento atualizado" : "Documento criado" }); setView("list"); setForm(emptyForm); setEditingId(null); fetchDocuments(); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("documents").delete().eq("id", deleteTarget.id);
    if (error) toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    else { toast({ title: "Documento excluído" }); fetchDocuments(); }
    setDeleteTarget(null);
  };

  const handleDuplicate = async (doc: DocumentRecord) => {
    if (!user) return;
    const { error } = await supabase.from("documents").insert({
      title: `${doc.title} (cópia)`, description: doc.description,
      document_type: doc.document_type, status: "rascunho",
      content: doc.content, tags: doc.tags, user_id: user.id,
    } as any);
    if (error) toast({ title: "Erro ao duplicar", description: error.message, variant: "destructive" });
    else { toast({ title: "Documento duplicado" }); fetchDocuments(); }
  };

  const useTemplate = (tpl: TemplateDefinition) => {
    setForm({ ...emptyForm, title: tpl.title, description: tpl.desc, document_type: tpl.type, content: tpl.content });
    setEditingId(null);
    setView("create");
  };

  const startEdit = (doc: DocumentRecord) => {
    setForm({
      title: doc.title, description: doc.description || "",
      document_type: doc.document_type, status: doc.status,
      content: doc.content || "", tags: doc.tags || [],
      expires_at: doc.expires_at ? doc.expires_at.slice(0, 10) : "",
    });
    setEditingId(doc.id);
    setView("edit");
  };

  const filtered = documents.filter((d) => {
    if (searchTerm && !d.title.toLowerCase().includes(searchTerm.toLowerCase()) && !d.description?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterType !== "all" && d.document_type !== filterType) return false;
    if (filterStatus !== "all" && d.status !== filterStatus) return false;
    return true;
  });

  const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

  const kpis = [
    { label: "Total", value: documents.length, icon: FileText, accent: "bg-primary/10 text-primary" },
    { label: "Publicados", value: documents.filter((d) => d.status === "publicado").length, icon: Send, accent: "bg-primary/10 text-primary" },
    { label: "Em Revisão", value: documents.filter((d) => d.status === "em_revisao").length, icon: Clock, accent: "bg-amber-warning/10 text-amber-warning" },
    { label: "Expirados", value: documents.filter((d) => d.status === "expirado").length, icon: AlertCircle, accent: "bg-destructive/10 text-destructive" },
  ];

  // ── Templates View ──
  const renderTemplates = () => {
    const filteredTpls = templateCategory === "all" ? TEMPLATES : TEMPLATES.filter((t) => t.category === templateCategory);
    const essentials = filteredTpls.filter((t) => t.priority === "essencial");
    const recommended = filteredTpls.filter((t) => t.priority === "recomendado");
    const complementary = filteredTpls.filter((t) => t.priority === "complementar");

    const renderGroup = (title: string, items: TemplateDefinition[], accent: string) => {
      if (items.length === 0) return null;
      return (
        <div className="space-y-3">
          <h3 className="font-display text-sm font-semibold text-muted-foreground">{title}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((tpl) => {
              const Icon = tpl.icon;
              return (
                <motion.div key={tpl.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <Card
                    className="shadow-card cursor-pointer hover:shadow-elevated transition-all hover:-translate-y-0.5 h-full"
                    onClick={() => useTemplate(tpl)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-display text-sm font-semibold truncate">{tpl.title}</p>
                            <PriorityBadge priority={tpl.priority} />
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{tpl.desc}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      );
    };

    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold sm:text-2xl">Biblioteca de Templates</h1>
              <p className="text-xs text-muted-foreground">{TEMPLATES.length} modelos prontos para adequação LGPD</p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => setView("list")}><X className="h-4 w-4 mr-2" /> Voltar</Button>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={templateCategory === "all" ? "default" : "outline"} onClick={() => setTemplateCategory("all")}>
            Todos ({TEMPLATES.length})
          </Button>
          {TEMPLATE_CATEGORIES.map((cat) => {
            const count = TEMPLATES.filter((t) => t.category === cat.key).length;
            const CatIcon = cat.icon;
            return (
              <Button key={cat.key} size="sm" variant={templateCategory === cat.key ? "default" : "outline"} onClick={() => setTemplateCategory(cat.key)}>
                <CatIcon className="h-3.5 w-3.5 mr-1.5" /> {cat.label} ({count})
              </Button>
            );
          })}
        </div>

        {/* Template groups */}
        <div className="space-y-6">
          {renderGroup("🔴 Essenciais para Adequação", essentials, "bg-destructive/10 text-destructive")}
          {renderGroup("🟡 Recomendados", recommended, "bg-amber-warning/10 text-amber-warning")}
          {renderGroup("🔵 Complementares", complementary, "bg-sky/10 text-sky")}
        </div>
      </motion.div>
    );
  };

  // ── Form View ──
  const renderForm = () => (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold sm:text-2xl">{editingId ? "Editar Documento" : "Novo Documento"}</h1>
          <p className="mt-1 text-xs text-muted-foreground">Preencha as informações do documento</p>
        </div>
        <Button variant="ghost" onClick={() => { setView("list"); setForm(emptyForm); setEditingId(null); }}><X className="h-4 w-4 mr-2" /> Cancelar</Button>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="content">Conteúdo</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card className="shadow-card">
            <CardContent className="p-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ex: Política de Privacidade v2" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Documento *</Label>
                  <Select value={form.document_type} onValueChange={(v) => setForm((f) => ({ ...f, document_type: v as DocumentType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DOC_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Breve descrição do documento..." rows={2} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as DocumentStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data de Expiração</Label>
                  <Input type="date" value={form.expires_at} onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <TagInput tags={form.tags} onChange={(t) => setForm((f) => ({ ...f, tags: t }))} placeholder="Adicionar tag e pressionar Enter..." />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Card className="shadow-card">
            <CardContent className="p-5 space-y-2">
              <Label>Conteúdo do Documento (Markdown)</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Escreva o conteúdo do documento em Markdown..."
                rows={24}
                className="font-mono text-sm leading-relaxed"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card className="shadow-card">
            <CardContent className="p-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Configurações adicionais como versionamento e aprovações serão exibidas aqui conforme o documento evolui.
              </p>
              {editingId && (
                <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
                  <p className="text-sm font-medium">Informações do Documento</p>
                  <p className="text-xs text-muted-foreground">ID: {editingId}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => { setView("list"); setForm(emptyForm); setEditingId(null); }}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : editingId ? "Atualizar" : "Criar Documento"}</Button>
      </div>
    </motion.div>
  );

  // ── View Document ──
  const renderViewDoc = () => {
    if (!viewDoc) return null;
    const statusInfo = getStatusInfo(viewDoc.status);
    const typeInfo = getTypeInfo(viewDoc.document_type);
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold sm:text-2xl">{viewDoc.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">{viewDoc.description}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { startEdit(viewDoc); setViewDoc(null); }}><Edit2 className="h-4 w-4 mr-2" /> Editar</Button>
            <Button variant="ghost" size="sm" onClick={() => { setViewDoc(null); setView("list"); }}><X className="h-4 w-4 mr-2" /> Fechar</Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge className={`${statusInfo.bg} ${statusInfo.color} border-0`}>{statusInfo.label}</Badge>
          <Badge variant="outline">{typeInfo.label}</Badge>
          <Badge variant="outline">v{viewDoc.version}</Badge>
          {viewDoc.tags?.map((t) => <Badge key={t} variant="secondary" className="gap-1"><Tag className="h-3 w-3" />{t}</Badge>)}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Criado em", value: formatDate(viewDoc.created_at) },
            { label: "Atualizado em", value: formatDate(viewDoc.updated_at) },
            { label: "Expira em", value: viewDoc.expires_at ? formatDate(viewDoc.expires_at) : "—" },
          ].map((item) => (
            <Card key={item.label} className="shadow-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap font-mono text-sm leading-relaxed">
              {viewDoc.content || <span className="text-muted-foreground italic">Sem conteúdo</span>}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // ── List View ──
  const renderList = () => (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold sm:text-2xl">Documentos</h1>
            <p className="text-xs text-muted-foreground">Gestão de políticas, termos e relatórios LGPD</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setView("templates")}>
            <BookOpen className="h-4 w-4 mr-2" /> Biblioteca ({TEMPLATES.length})
          </Button>
          <Button onClick={() => { setForm(emptyForm); setEditingId(null); setView("create"); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo Documento
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="shadow-card">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${kpi.accent}`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Compliance checklist banner */}
      {documents.length > 0 && (() => {
        const essentialTypes: DocumentType[] = ["politica_privacidade", "ripd", "termos_uso", "politica_cookies", "plano_resposta_incidentes", "politica_seguranca", "contrato_operador"];
        const existing = new Set(documents.map((d) => d.document_type));
        const missing = essentialTypes.filter((t) => !existing.has(t));
        if (missing.length === 0) return null;
        return (
          <Card className="shadow-card ring-1 ring-amber-warning/20 bg-amber-warning/5">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-warning/15">
                <AlertCircle className="h-5 w-5 text-amber-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Documentos essenciais faltando</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {missing.length} documento(s) essencial(is) ainda não criado(s): {missing.map((t) => getTypeInfo(t as DocumentType).label).join(", ")}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setView("templates")}>
                Ver Templates
              </Button>
            </CardContent>
          </Card>
        );
      })()}

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar documentos..." className="pl-9" />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]"><Filter className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                {DOC_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Document List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="font-display font-semibold text-lg">Nenhum documento encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              {documents.length === 0 ? "Comece usando um template ou criando do zero." : "Tente ajustar os filtros."}
            </p>
            {documents.length === 0 && (
              <div className="flex gap-2 justify-center mt-4">
                <Button variant="outline" onClick={() => setView("templates")}><BookOpen className="h-4 w-4 mr-2" /> Biblioteca</Button>
                <Button onClick={() => { setForm(emptyForm); setView("create"); }}><Plus className="h-4 w-4 mr-2" /> Novo</Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence>
            {filtered.map((doc, i) => {
              const statusInfo = getStatusInfo(doc.status);
              const typeInfo = getTypeInfo(doc.document_type);
              const TypeIcon = typeInfo.icon;
              return (
                <motion.div key={doc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ delay: i * 0.03 }}>
                  <Card className="shadow-card hover:shadow-elevated transition-all group">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent">
                          <TypeIcon className="h-5 w-5 text-accent-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-display text-sm font-semibold truncate">{doc.title}</p>
                            <Badge className={`${statusInfo.bg} ${statusInfo.color} border-0 text-[10px] shrink-0`}>{statusInfo.label}</Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground">{typeInfo.label}</span>
                            <span className="text-xs text-muted-foreground">v{doc.version}</span>
                            <span className="text-xs text-muted-foreground">{formatDate(doc.updated_at)}</span>
                            {doc.expires_at && new Date(doc.expires_at) < new Date() && (
                              <span className="text-[10px] font-medium text-destructive">Expirado</span>
                            )}
                          </div>
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="flex gap-1 mt-1.5">
                              {doc.tags.slice(0, 3).map((t) => <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">{t}</Badge>)}
                              {doc.tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{doc.tags.length - 3}</span>}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewDoc(doc); setView("view"); }}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(doc)}><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(doc)}><Copy className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(doc)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {view === "list" && renderList()}
      {view === "templates" && renderTemplates()}
      {(view === "create" || view === "edit") && renderForm()}
      {view === "view" && renderViewDoc()}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>O documento "{deleteTarget?.title}" será excluído permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
