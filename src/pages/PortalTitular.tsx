import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { UserCheck, Send, CheckCircle2, Shield, Search, Clock, FileText, ArrowLeft, Mail, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import Navbar from "@/components/Navbar";
import { dsarRequestSchema } from "@/lib/validators";

type RightType = Database["public"]["Enums"]["right_type"];
type RequestStatus = Database["public"]["Enums"]["request_status"];

const rightTypes: { value: RightType; label: string; desc: string }[] = [
  { value: "access", label: "Acesso aos dados", desc: "Saber quais dados pessoais são tratados" },
  { value: "correction", label: "Correção de dados", desc: "Corrigir dados incompletos ou desatualizados" },
  { value: "deletion", label: "Exclusão/Eliminação", desc: "Solicitar a eliminação dos dados pessoais" },
  { value: "portability", label: "Portabilidade", desc: "Transferir dados para outro fornecedor" },
  { value: "opposition", label: "Oposição ao tratamento", desc: "Opor-se a um tratamento específico" },
  { value: "revoke", label: "Revogação de consentimento", desc: "Retirar consentimento previamente concedido" },
  { value: "info", label: "Informação sobre compartilhamento", desc: "Saber com quem os dados são compartilhados" },
  { value: "other", label: "Outro", desc: "Outra solicitação relacionada a dados pessoais" },
];

const statusLabels: Record<string, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-amber-500/15 text-amber-700 border-amber-200" },
  em_andamento: { label: "Em Andamento", color: "bg-sky-500/15 text-sky-700 border-sky-200" },
  concluido: { label: "Concluído", color: "bg-primary/15 text-primary border-primary/20" },
  cancelado: { label: "Cancelado", color: "bg-muted text-muted-foreground border-border" },
};

function generateProtocol(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const time = now.toTimeString().slice(0, 5).replace(":", "");
  const seq = Math.floor(Math.random() * 9000 + 1000);
  return `DSR-${date}-${time}-${seq}`;
}

export default function PortalTitular() {
  const { slug } = useParams<{ slug?: string }>();
  const [submitted, setSubmitted] = useState(false);
  const [protocol, setProtocol] = useState("");
  const [submittedAt, setSubmittedAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [rightType, setRightType] = useState<RightType | "">("");
  const { toast } = useToast();

  // Tenant context
  const [tenant, setTenant] = useState<{ id: string; name: string } | null>(null);
  const [tenantLoading, setTenantLoading] = useState(!!slug);
  const [tenantNotFound, setTenantNotFound] = useState(false);

  // Track request state
  const [trackProtocol, setTrackProtocol] = useState("");
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackedRequest, setTrackedRequest] = useState<{
    protocol: string;
    name: string;
    right_type: string;
    status: RequestStatus;
    response: string | null;
    created_at: string;
    updated_at: string;
  } | null>(null);
  const [trackNotFound, setTrackNotFound] = useState(false);

  // Load tenant by slug
  useEffect(() => {
    if (!slug) return;
    setTenantLoading(true);
    supabase
      .rpc("get_tenant_by_slug", { _slug: slug })
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setTenant(data as { id: string; name: string });
        } else {
          setTenantNotFound(true);
        }
        setTenantLoading(false);
      });
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    // Zod validation
    const validation = dsarRequestSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      cpf: formData.get("cpf"),
      right_type: rightType,
      details: formData.get("details"),
    });

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({ title: "Erro de validação", description: firstError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const proto = generateProtocol();
    const now = new Date();

    const insertData: Record<string, unknown> = {
      protocol: proto,
      name: validation.data.name,
      email: validation.data.email,
      cpf: validation.data.cpf,
      right_type: validation.data.right_type as RightType,
      details: validation.data.details,
    };

    if (tenant) {
      insertData.tenant_id = tenant.id;
    }

    const { error } = await supabase.from("data_subject_requests").insert(insertData as any);

    setLoading(false);

    if (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
    } else {
      setProtocol(proto);
      setSubmittedAt(now.toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      }));
      setSubmitted(true);
    }
  };

  const handleTrack = async () => {
    if (!trackProtocol.trim()) return;
    setTrackLoading(true);
    setTrackedRequest(null);
    setTrackNotFound(false);

    const { data, error } = await supabase
      .rpc("track_request_by_protocol", { _protocol: trackProtocol.trim().toUpperCase() })
      .maybeSingle();

    setTrackLoading(false);

    if (error || !data) {
      setTrackNotFound(true);
    } else {
      setTrackedRequest(data as typeof trackedRequest);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setRightType("");
    setProtocol("");
    setSubmittedAt("");
  };

  // ── Tenant loading/not found ──
  if (tenantLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (slug && tenantNotFound) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-lg px-4 pt-28 pb-20 text-center">
          <Card className="shadow-elevated">
            <CardContent className="p-10">
              <Shield className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="font-display text-xl font-bold">Portal não encontrado</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                A organização solicitada não existe ou está inativa.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Success screen ──
  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-lg px-4 pt-28 pb-20">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="shadow-elevated text-center">
              <CardContent className="p-10">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <h2 className="font-display text-xl font-bold">Solicitação Registrada</h2>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  Sua solicitação foi registrada com sucesso. O prazo de resposta é de até <strong>15 dias úteis</strong>, conforme a LGPD (Art. 18, §5º).
                </p>

                <div className="mt-6 space-y-3 rounded-xl border border-border bg-secondary/30 p-5 text-left">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Nº do Protocolo</p>
                    <p className="font-display text-lg font-bold text-foreground select-all">{protocol}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Data e Hora do Registro</p>
                    <p className="text-sm font-semibold text-foreground">{submittedAt}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</p>
                    <Badge variant="outline" className="mt-1 bg-amber-500/15 text-amber-700 border-amber-200">
                      Pendente
                    </Badge>
                  </div>
                </div>

                <p className="mt-4 text-xs text-muted-foreground">
                  Guarde o número do protocolo para acompanhar o andamento da sua solicitação.
                </p>

                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  <Button variant="outline" className="flex-1" onClick={resetForm}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Nova Solicitação
                  </Button>
                  <Button className="flex-1" onClick={() => {
                    navigator.clipboard.writeText(protocol);
                    toast({ title: "Protocolo copiado!" });
                  }}>
                    Copiar Protocolo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Main form ──
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 pt-28 pb-16">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent">
            <UserCheck className="h-7 w-7 text-accent-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Portal do <span className="text-gradient-emerald">Titular</span>
          </h1>
          {tenant && (
            <p className="mt-1 text-sm font-medium text-primary">{tenant.name}</p>
          )}
          <p className="mt-2 text-muted-foreground">
            Exerça seus direitos previstos na LGPD (Lei 13.709/2018)
          </p>
        </div>

        <Tabs defaultValue="new-request" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new-request" className="gap-1.5">
              <Send className="h-3.5 w-3.5" /> Nova Solicitação
            </TabsTrigger>
            <TabsTrigger value="track" className="gap-1.5">
              <Search className="h-3.5 w-3.5" /> Consultar Protocolo
            </TabsTrigger>
          </TabsList>

          {/* ══════════ NEW REQUEST TAB ══════════ */}
          <TabsContent value="new-request">
            <Card className="shadow-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-base">
                  <Shield className="h-4 w-4 text-primary" /> Formulário de Solicitação
                </CardTitle>
                <CardDescription>
                  Preencha os dados abaixo para exercer seus direitos como titular de dados pessoais.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome completo *</Label>
                      <Input id="name" name="name" placeholder="Seu nome completo" required maxLength={200} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail *</Label>
                      <Input id="email" name="email" type="email" placeholder="seu@email.com" required maxLength={255} />
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF *</Label>
                      <Input id="cpf" name="cpf" placeholder="000.000.000-00" required maxLength={14} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Tipo de solicitação *</Label>
                      <Select value={rightType} onValueChange={(v) => setRightType(v as RightType)} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o direito" />
                        </SelectTrigger>
                        <SelectContent>
                          {rightTypes.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              <div>
                                <span className="font-medium">{r.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {rightType && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                      <div className="rounded-lg border border-primary/20 bg-accent/50 p-3">
                        <p className="text-xs text-accent-foreground">
                          <strong>{rightTypes.find(r => r.value === rightType)?.label}:</strong>{" "}
                          {rightTypes.find(r => r.value === rightType)?.desc}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="details">Detalhes da solicitação *</Label>
                    <Textarea
                      id="details"
                      name="details"
                      placeholder="Descreva com o máximo de detalhes o que você deseja. Quanto mais informações, mais rápido poderemos atendê-lo(a)."
                      rows={5}
                      required
                      maxLength={2000}
                    />
                  </div>

                  <div className="rounded-lg border border-border bg-secondary/50 p-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <strong>Aviso de privacidade:</strong> Os dados informados serão utilizados exclusivamente para atender sua solicitação,
                      conforme Art. 18 da LGPD. O prazo legal de resposta é de até 15 dias úteis. Ao enviar, você confirma a veracidade das
                      informações e autoriza a verificação de identidade.
                    </p>
                  </div>

                  <Button type="submit" className="w-full shadow-glow" size="lg" disabled={loading || !rightType}>
                    <Send className="mr-2 h-4 w-4" /> {loading ? "Registrando solicitação..." : "Enviar Solicitação"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════ TRACK TAB ══════════ */}
          <TabsContent value="track">
            <Card className="shadow-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-base">
                  <Search className="h-4 w-4 text-primary" /> Acompanhar Solicitação
                </CardTitle>
                <CardDescription>
                  Insira o número do protocolo recebido para verificar o andamento da sua solicitação.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex gap-3">
                  <Input
                    placeholder="Ex: DSR-20260310-1430-1234"
                    value={trackProtocol}
                    onChange={(e) => { setTrackProtocol(e.target.value.toUpperCase()); setTrackNotFound(false); }}
                    maxLength={30}
                    className="flex-1 font-mono"
                  />
                  <Button onClick={handleTrack} disabled={trackLoading || !trackProtocol.trim()}>
                    {trackLoading ? "Buscando..." : "Consultar"}
                  </Button>
                </div>

                {trackNotFound && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-center">
                    <p className="text-sm text-destructive font-medium">Protocolo não encontrado</p>
                    <p className="mt-1 text-xs text-muted-foreground">Verifique o número informado e tente novamente.</p>
                  </motion.div>
                )}

                {trackedRequest && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className="rounded-xl border border-border bg-secondary/30 p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Protocolo</p>
                          <p className="font-display text-base font-bold">{trackedRequest.protocol}</p>
                        </div>
                        <Badge variant="outline" className={statusLabels[trackedRequest.status]?.color || ""}>
                          {statusLabels[trackedRequest.status]?.label || trackedRequest.status}
                        </Badge>
                      </div>

                      <Separator />

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Titular</p>
                          <p className="text-sm font-medium">{trackedRequest.name}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Tipo de Direito</p>
                          <p className="text-sm font-medium">
                            {rightTypes.find(r => r.value === trackedRequest.right_type)?.label || trackedRequest.right_type}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Data de Abertura</p>
                          <p className="text-sm font-medium">
                            {new Date(trackedRequest.created_at).toLocaleString("pt-BR", {
                              day: "2-digit", month: "2-digit", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Última Atualização</p>
                          <p className="text-sm font-medium">
                            {new Date(trackedRequest.updated_at).toLocaleString("pt-BR", {
                              day: "2-digit", month: "2-digit", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Timeline */}
                      <Separator />
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">Histórico</p>
                        <div className="space-y-3">
                          <div className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </div>
                              <div className="mt-1 w-px flex-1 bg-border" />
                            </div>
                            <div className="pb-4">
                              <p className="text-sm font-medium">Solicitação registrada</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(trackedRequest.created_at).toLocaleString("pt-BR")}
                              </p>
                            </div>
                          </div>

                          {(trackedRequest.status === "em_andamento" || trackedRequest.status === "concluido") && (
                            <div className="flex gap-3">
                              <div className="flex flex-col items-center">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-white">
                                  <Clock className="h-3.5 w-3.5" />
                                </div>
                                <div className="mt-1 w-px flex-1 bg-border" />
                              </div>
                              <div className="pb-4">
                                <p className="text-sm font-medium">Em análise pelo DPO</p>
                                <p className="text-xs text-muted-foreground">Solicitação em andamento</p>
                              </div>
                            </div>
                          )}

                          {trackedRequest.status === "concluido" && (
                            <div className="flex gap-3">
                              <div className="flex flex-col items-center">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </div>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Solicitação concluída</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(trackedRequest.updated_at).toLocaleString("pt-BR")}
                                </p>
                              </div>
                            </div>
                          )}

                          {trackedRequest.status === "pendente" && (
                            <div className="flex gap-3">
                              <div className="flex flex-col items-center">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Aguardando análise do DPO</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Response */}
                      {trackedRequest.response && (
                        <>
                          <Separator />
                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Resposta do DPO</p>
                            <div className="rounded-lg border border-primary/20 bg-accent/50 p-4">
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{trackedRequest.response}</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}

                {!trackedRequest && !trackNotFound && (
                  <div className="py-8 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent">
                      <FileText className="h-6 w-6 text-accent-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Informe o protocolo recebido ao registrar sua solicitação para acompanhar o status.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Shield, title: "Seus Direitos", desc: "Acesso, correção, exclusão, portabilidade e oposição — todos garantidos pela LGPD." },
            { icon: Clock, title: "Prazo Legal", desc: "Até 15 dias úteis para resposta, conforme Art. 18, §5º da Lei 13.709/2018." },
            { icon: Mail, title: "Canal Seguro", desc: "Suas informações são tratadas com sigilo e proteção conforme a legislação vigente." },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
            >
              <Card className="h-full shadow-card">
                <CardContent className="p-5">
                  <item.icon className="mb-3 h-5 w-5 text-primary" />
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
