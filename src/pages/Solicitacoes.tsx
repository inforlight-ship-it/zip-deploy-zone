import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, CheckCircle2, Clock, XCircle, Search, Send,
  Eye, ExternalLink, MessageSquare, Copy, AlertTriangle,
  FileText, ChevronDown, ChevronUp, Mail
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

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

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const statusColors: Record<string, string> = {
  pendente: "bg-amber-500/15 text-amber-600",
  em_andamento: "bg-sky-500/15 text-sky-600",
  concluido: "bg-primary/15 text-primary",
  cancelado: "bg-muted text-muted-foreground",
};

const rightLabels: Record<string, string> = {
  access: "Acesso aos dados",
  correction: "Correção",
  deletion: "Exclusão",
  portability: "Portabilidade",
  opposition: "Oposição",
  revoke: "Revogação",
  info: "Informação",
  other: "Outro",
};

export default function Solicitacoes() {
  const [dsrs, setDsrs] = useState<DSR[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast } = useToast();

  // Respond dialog
  const [respondDialog, setRespondDialog] = useState<DSR | null>(null);
  const [responseText, setResponseText] = useState("");
  const [responding, setResponding] = useState(false);

  // Cancel confirm
  const [cancelTarget, setCancelTarget] = useState<DSR | null>(null);

  const fetchDsrs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("data_subject_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setDsrs((data ?? []) as DSR[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDsrs(); }, []);

  const updateStatus = async (id: string, newStatus: RequestStatus, response?: string) => {
    const updateData: Record<string, unknown> = { status: newStatus };
    if (response !== undefined) updateData.response = response;

    const { error } = await supabase
      .from("data_subject_requests")
      .update(updateData as any)
      .eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Solicitação ${statusLabels[newStatus].toLowerCase()}` });
      fetchDsrs();
    }
  };

  const handleRespond = async () => {
    if (!respondDialog || !responseText.trim()) return;
    setResponding(true);

    await updateStatus(respondDialog.id, "concluido", responseText.trim());

    // Try to send notification email (will work once email is configured)
    try {
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "dsar-resolution",
          recipientEmail: respondDialog.email,
          idempotencyKey: `dsar-resolution-${respondDialog.id}`,
          templateData: {
            name: respondDialog.name,
            protocol: respondDialog.protocol,
            rightType: rightLabels[respondDialog.right_type] || respondDialog.right_type,
            response: responseText.trim(),
          },
        },
      });
    } catch {
      // Email not configured yet - silently continue
    }

    setResponding(false);
    setRespondDialog(null);
    setResponseText("");
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    await updateStatus(cancelTarget.id, "cancelado");
    setCancelTarget(null);
  };

  // Filtered + searched results
  const filtered = dsrs.filter((d) => {
    if (filter !== "all" && d.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        d.protocol.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        d.cpf.includes(q)
      );
    }
    return true;
  });

  // Stats
  const stats = {
    total: dsrs.length,
    pendente: dsrs.filter((d) => d.status === "pendente").length,
    em_andamento: dsrs.filter((d) => d.status === "em_andamento").length,
    concluido: dsrs.filter((d) => d.status === "concluido").length,
  };

  const statusIcon = (s: string) => {
    if (s === "concluido") return <CheckCircle2 className="h-4 w-4 text-primary" />;
    if (s === "cancelado") return <XCircle className="h-4 w-4 text-muted-foreground" />;
    if (s === "em_andamento") return <Clock className="h-4 w-4 text-sky-500" />;
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  };

  const portalUrl = "https://privacy-shield-automata.lovable.app/portal-titular";

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">
              <span className="text-gradient-emerald">Solicitações</span> de Titulares (DSAR)
            </h1>
            <p className="mt-1 text-muted-foreground">Gerencie pedidos de exercício de direitos LGPD</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(portalUrl);
                toast({ title: "Link do portal copiado!" });
              }}
            >
              <Copy className="mr-2 h-4 w-4" /> Copiar Link do Portal
            </Button>
            <Button
              size="sm"
              onClick={() => window.open(portalUrl, "_blank")}
            >
              <ExternalLink className="mr-2 h-4 w-4" /> Abrir Portal DSAR
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
          {[
            { label: "Total", value: stats.total, icon: FileText, color: "text-foreground" },
            { label: "Pendentes", value: stats.pendente, icon: AlertTriangle, color: "text-amber-500" },
            { label: "Em Andamento", value: stats.em_andamento, icon: Clock, color: "text-sky-500" },
            { label: "Concluídas", value: stats.concluido, icon: CheckCircle2, color: "text-primary" },
          ].map((s) => (
            <Card key={s.label} className="shadow-card">
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`h-5 w-5 ${s.color}`} />
                <div>
                  <p className="text-2xl font-bold font-display">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por protocolo, nome, email ou CPF..."
              className="pl-10"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="em_andamento">Em andamento</SelectItem>
              <SelectItem value="concluido">Concluídos</SelectItem>
              <SelectItem value="cancelado">Cancelados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-16 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <p className="mt-4 text-muted-foreground">
                {search || filter !== "all" ? "Nenhuma solicitação encontrada com esses filtros." : "Nenhuma solicitação registrada."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((dsr, i) => {
              const isExpanded = expandedId === dsr.id;
              const daysOpen = Math.floor(
                (Date.now() - new Date(dsr.created_at).getTime()) / (1000 * 60 * 60 * 24)
              );
              const isOverdue = daysOpen > 15 && dsr.status !== "concluido" && dsr.status !== "cancelado";

              return (
                <motion.div
                  key={dsr.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className={`shadow-card transition-all ${isOverdue ? "border-destructive/40" : ""}`}>
                    <CardContent className="p-0">
                      {/* Summary row */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : dsr.id)}
                        className="w-full flex items-center gap-4 p-5 text-left hover:bg-accent/30 transition-colors rounded-xl"
                      >
                        <div className="shrink-0">{statusIcon(dsr.status)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-display text-sm font-semibold">{dsr.protocol}</span>
                            <Badge className={statusColors[dsr.status]} variant="secondary">
                              {statusLabels[dsr.status]}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {rightLabels[dsr.right_type] ?? dsr.right_type}
                            </Badge>
                            {isOverdue && (
                              <Badge variant="destructive" className="text-[10px]">
                                SLA Excedido ({daysOpen} dias)
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm mt-1">{dsr.name} · <span className="text-muted-foreground">{dsr.email}</span></p>
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0 text-right">
                          <p>{new Date(dsr.created_at).toLocaleDateString("pt-BR")}</p>
                          <p>{daysOpen} dia{daysOpen !== 1 ? "s" : ""}</p>
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                      </button>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="border-t border-border px-5 pb-5 pt-4 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Nome</p>
                              <p className="font-medium">{dsr.name}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Email</p>
                              <p className="font-medium">{dsr.email}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">CPF</p>
                              <p className="font-medium">{dsr.cpf}</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Detalhes da Solicitação</p>
                            <p className="text-sm bg-secondary/30 rounded-lg p-3">{dsr.details}</p>
                          </div>

                          {dsr.response && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Resposta do DPO</p>
                              <p className="text-sm bg-primary/5 border border-primary/10 rounded-lg p-3">{dsr.response}</p>
                            </div>
                          )}

                          <Separator />

                          <div className="flex flex-wrap gap-2">
                            {dsr.status === "pendente" && (
                              <Button size="sm" variant="outline" onClick={() => updateStatus(dsr.id, "em_andamento")}>
                                <Clock className="mr-2 h-3.5 w-3.5" /> Iniciar Atendimento
                              </Button>
                            )}
                            {(dsr.status === "pendente" || dsr.status === "em_andamento") && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setRespondDialog(dsr);
                                  setResponseText(dsr.response || "");
                                }}
                              >
                                <MessageSquare className="mr-2 h-3.5 w-3.5" /> Responder e Concluir
                              </Button>
                            )}
                            {(dsr.status === "pendente" || dsr.status === "em_andamento") && (
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setCancelTarget(dsr)}>
                                <XCircle className="mr-2 h-3.5 w-3.5" /> Cancelar
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Respond Dialog */}
      <Dialog open={!!respondDialog} onOpenChange={(o) => { if (!o) { setRespondDialog(null); setResponseText(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Responder Solicitação</DialogTitle>
            <DialogDescription>
              Protocolo: <strong>{respondDialog?.protocol}</strong> · {respondDialog?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="rounded-lg bg-secondary/30 p-3 text-sm">
              <p className="text-xs font-medium text-muted-foreground mb-1">Solicitação do titular:</p>
              <p>{respondDialog?.details}</p>
            </div>

            <div>
              <Label>Resposta do DPO *</Label>
              <Textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Descreva as ações tomadas e a resposta ao titular..."
                rows={5}
                className="mt-1"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span>O titular receberá um email com a resposta (quando o serviço de email estiver configurado)</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setRespondDialog(null); setResponseText(""); }}>
              Cancelar
            </Button>
            <Button onClick={handleRespond} disabled={responding || !responseText.trim()}>
              {responding ? "Enviando..." : "Concluir e Notificar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirm */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => { if (!o) setCancelTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Solicitação?</AlertDialogTitle>
            <AlertDialogDescription>
              A solicitação <strong>{cancelTarget?.protocol}</strong> será marcada como cancelada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancelar Solicitação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
