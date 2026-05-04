import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Play,
  TrendingUp,
  Calendar,
  Target,
  History,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface Question {
  domain: string;
  text: string;
  options: { label: string; score: number }[];
}

const questions: Question[] = [
  { domain: "Governança", text: "A organização possui um DPO/Encarregado formalmente nomeado e publicado?", options: [{ label: "Sim, nomeado e publicado", score: 3 }, { label: "Nomeado, mas não publicado", score: 2 }, { label: "Em processo de nomeação", score: 1 }, { label: "Não possui", score: 0 }] },
  { domain: "Governança", text: "Existe um comitê ou grupo de trabalho de privacidade instituído?", options: [{ label: "Sim, ativo e com reuniões periódicas", score: 3 }, { label: "Existe, mas sem agenda regular", score: 2 }, { label: "Está sendo estruturado", score: 1 }, { label: "Não existe", score: 0 }] },
  { domain: "Bases Legais", text: "As atividades de tratamento possuem base legal definida e documentada?", options: [{ label: "Todas documentadas e revisadas", score: 3 }, { label: "Maioria documentada", score: 2 }, { label: "Parcialmente documentada", score: 1 }, { label: "Não documentada", score: 0 }] },
  { domain: "Direitos do Titular", text: "Existe canal acessível para que titulares exerçam seus direitos?", options: [{ label: "Portal digital com SLA definido", score: 3 }, { label: "E-mail dedicado com processo definido", score: 2 }, { label: "Canal genérico sem processo formal", score: 1 }, { label: "Não existe canal", score: 0 }] },
  { domain: "Segurança", text: "A organização utiliza autenticação multifator (MFA) para sistemas críticos?", options: [{ label: "Sim, para todos os sistemas", score: 3 }, { label: "Para a maioria", score: 2 }, { label: "Apenas para alguns", score: 1 }, { label: "Não utiliza", score: 0 }] },
  { domain: "Segurança", text: "Existe política de retenção e descarte seguro de dados pessoais?", options: [{ label: "Sim, implementada e auditada", score: 3 }, { label: "Política existe, parcialmente implementada", score: 2 }, { label: "Em elaboração", score: 1 }, { label: "Não existe", score: 0 }] },
  { domain: "Terceiros", text: "Contratos com operadores/processadores incluem cláusulas de proteção de dados?", options: [{ label: "Todos os contratos revisados", score: 3 }, { label: "Maioria revisada", score: 2 }, { label: "Alguns revisados", score: 1 }, { label: "Nenhum revisado", score: 0 }] },
  { domain: "Incidentes", text: "Existe plano de resposta a incidentes de segurança documentado?", options: [{ label: "Sim, testado periodicamente", score: 3 }, { label: "Documentado, não testado", score: 2 }, { label: "Em elaboração", score: 1 }, { label: "Não existe", score: 0 }] },
];

function computeScores(answers: Record<number, number>) {
  const domains: Record<string, { total: number; max: number }> = {};
  questions.forEach((q, i) => {
    if (!domains[q.domain]) domains[q.domain] = { total: 0, max: 0 };
    domains[q.domain].max += 3;
    domains[q.domain].total += answers[i] ?? 0;
  });
  return Object.entries(domains).map(([name, d]) => ({
    name,
    score: Math.round((d.total / d.max) * 100),
  }));
}

interface DiagnosticRecord {
  id: string;
  created_at: string;
  overall_score: number;
  scores: Record<string, number>;
  answers: Record<number, number>;
}

function maturityLabel(score: number) {
  if (score >= 75) return { label: "Avançado", color: "text-primary" };
  if (score >= 50) return { label: "Intermediário", color: "text-amber-500" };
  if (score >= 25) return { label: "Inicial", color: "text-orange-500" };
  return { label: "Crítico", color: "text-destructive" };
}

export default function Diagnostico() {
  const [view, setView] = useState<"dashboard" | "quiz" | "result" | "history">("dashboard");
  const [selectedDiag, setSelectedDiag] = useState<DiagnosticRecord | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<DiagnosticRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchHistory = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("diagnostics")
      .select("id, created_at, overall_score, scores, answers")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (!error && data) {
      setHistory(data as unknown as DiagnosticRecord[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const progress = (Object.keys(answers).length / questions.length) * 100;

  const handleAnswer = (score: number) => {
    setAnswers((prev) => ({ ...prev, [current]: score }));
  };

  const finishQuiz = async () => {
    setView("result");
    if (user) {
      setSaving(true);
      const ds = computeScores(answers);
      const overall = Math.round(ds.reduce((s, d) => s + d.score, 0) / ds.length);
      const scoresObj = Object.fromEntries(ds.map((d) => [d.name, d.score]));
      const { error } = await supabase.from("diagnostics").insert({
        user_id: user.id,
        answers: answers as any,
        scores: scoresObj as any,
        overall_score: overall,
      });
      setSaving(false);
      if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Diagnóstico salvo!" });
        fetchHistory();
      }
    }
  };

  const next = () => {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      finishQuiz();
    }
  };

  const prev = () => setCurrent((c) => Math.max(0, c - 1));

  const startQuiz = () => {
    setCurrent(0);
    setAnswers({});
    setView("quiz");
  };

  const backToDashboard = () => {
    setView("dashboard");
  };

  const latestDiag = history.length > 0 ? history[history.length - 1] : null;
  const latestScores = latestDiag?.scores ?? {};
  const latestOverall = latestDiag?.overall_score ?? 0;
  const maturity = maturityLabel(latestOverall);

  // Radar data
  const radarData = Object.entries(latestScores).map(([name, score]) => ({
    domain: name,
    score: score as number,
    fullMark: 100,
  }));

  // Evolution data
  const evolutionData = history.map((h) => ({
    date: new Date(h.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    score: h.overall_score,
  }));

  const previousScore = history.length >= 2 ? history[history.length - 2].overall_score : null;
  const scoreDelta = previousScore !== null ? latestOverall - previousScore : null;

  // ─── QUIZ VIEW ───
  if (view === "quiz") {
    const q = questions[current];
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Button variant="ghost" size="sm" onClick={backToDashboard} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao painel
        </Button>
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>Pergunta {current + 1} de {questions.length}</span>
            <span>{Math.round(progress)}% completo</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={current} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
            <Card className="shadow-elevated">
              <CardContent className="p-6 sm:p-8">
                <span className="inline-block mb-3 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">{q.domain}</span>
                <h2 className="font-display text-xl font-semibold leading-snug sm:text-2xl">{q.text}</h2>
                <div className="mt-6 space-y-3">
                  {q.options.map((opt) => (
                    <button key={opt.label} onClick={() => handleAnswer(opt.score)} className={`w-full rounded-xl border p-4 text-left text-sm font-medium transition-all ${answers[current] === opt.score ? "border-primary bg-accent text-accent-foreground shadow-glow" : "border-border hover:border-primary/40 hover:bg-accent/50"}`}>
                      <div className="flex items-center gap-3">
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${answers[current] === opt.score ? "border-primary bg-primary" : "border-muted-foreground/30"}`}>
                          {answers[current] === opt.score && <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />}
                        </div>
                        {opt.label}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-8 flex justify-between">
                  <Button variant="ghost" onClick={prev} disabled={current === 0}><ArrowLeft className="mr-2 h-4 w-4" /> Anterior</Button>
                  <Button onClick={next} disabled={answers[current] === undefined}>{current === questions.length - 1 ? "Ver Resultado" : "Próxima"} <ArrowRight className="ml-2 h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ─── RESULT VIEW ───
  if (view === "result") {
    const ds = computeScores(answers);
    const overallScore = Math.round(ds.reduce((s, d) => s + d.score, 0) / ds.length);
    const m = maturityLabel(overallScore);
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="shadow-elevated">
            <CardContent className="p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
                <BarChart3 className="h-8 w-8 text-accent-foreground" />
              </div>
              <h2 className="font-display text-2xl font-bold">Resultado do Diagnóstico</h2>
              <p className="mt-1 text-sm text-muted-foreground">Nível: <span className={`font-semibold ${m.color}`}>{m.label}</span></p>
              <div className={`mt-6 font-display text-6xl font-extrabold ${m.color}`}>
                {overallScore}%
              </div>
              {saving && <p className="mt-2 text-xs text-muted-foreground">Salvando...</p>}
              <div className="mt-8 space-y-3 text-left">
                {ds.map((d) => {
                  const dm = maturityLabel(d.score);
                  return (
                    <div key={d.name}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium">{d.name}</span>
                        <span className={`font-semibold ${dm.color}`}>{d.score}%</span>
                      </div>
                      <Progress value={d.score} className="h-2.5" />
                    </div>
                  );
                })}
              </div>
              <div className="mt-8 flex gap-3 justify-center">
                <Button variant="outline" onClick={backToDashboard}>
                  <BarChart3 className="mr-2 h-4 w-4" /> Ver Painel
                </Button>
                <Button className="shadow-glow" onClick={startQuiz}>
                  Refazer Diagnóstico
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ─── HISTORY VIEW ───
  if (view === "history") {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="ghost" size="sm" onClick={backToDashboard} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao painel
        </Button>
        <h1 className="font-display text-2xl font-bold mb-1">Histórico de Diagnósticos</h1>
        <p className="text-sm text-muted-foreground mb-6">Todos os diagnósticos realizados</p>

        {history.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Nenhum diagnóstico realizado ainda.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {[...history].reverse().map((h, idx) => {
              const m = maturityLabel(h.overall_score);
              const isLatest = idx === 0;
              return (
                <Card
                  key={h.id}
                  className={`shadow-card transition-all hover:shadow-elevated ${selectedDiag?.id === h.id ? "ring-2 ring-primary" : ""}`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                          <BarChart3 className="h-5 w-5 text-accent-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">
                              {new Date(h.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                            </p>
                            {isLatest && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Mais recente</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(h.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-display text-2xl font-extrabold ${m.color}`}>{h.overall_score}%</p>
                        <p className={`text-xs font-medium ${m.color}`}>{m.label}</p>
                      </div>
                    </div>

                    {/* Expand toggle */}
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={(e) => { e.stopPropagation(); setSelectedDiag(selectedDiag?.id === h.id ? null : h); }}
                      >
                        {selectedDiag?.id === h.id ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                        {selectedDiag?.id === h.id ? "Ocultar detalhes" : "Ver respostas"}
                      </Button>
                    </div>

                    {/* Expanded detail */}
                    {selectedDiag?.id === h.id && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 pt-4 border-t border-border">
                        {/* Scores by domain */}
                        <div className="space-y-3 mb-6">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Scores por Domínio</p>
                          {Object.entries(h.scores).map(([name, score]) => {
                            const s = score as number;
                            const dm = maturityLabel(s);
                            return (
                              <div key={name}>
                                <div className="mb-1 flex justify-between text-sm">
                                  <span className="font-medium">{name}</span>
                                  <span className={`font-semibold ${dm.color}`}>{s}%</span>
                                </div>
                                <Progress value={s} className="h-2" />
                              </div>
                            );
                          })}
                        </div>

                        {/* Actual answers */}
                        {h.answers && Object.keys(h.answers).length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Respostas Preenchidas</p>
                            <div className="space-y-3">
                              {questions.map((q, qIdx) => {
                                const chosenScore = (h.answers as Record<string, number>)[String(qIdx)];
                                const chosenOption = q.options.find((o) => o.score === chosenScore);
                                return (
                                  <div key={qIdx} className="rounded-lg border border-border p-3">
                                    <div className="flex items-start gap-2">
                                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                                        {qIdx + 1}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs text-muted-foreground mb-0.5">{q.domain}</p>
                                        <p className="text-sm font-medium leading-snug">{q.text}</p>
                                        {chosenOption ? (
                                          <div className="mt-1.5 flex items-center gap-2">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                                            <span className="text-sm text-primary font-medium">{chosenOption.label}</span>
                                            <span className="text-xs text-muted-foreground">({chosenScore}/3)</span>
                                          </div>
                                        ) : (
                                          <p className="mt-1.5 text-xs text-muted-foreground italic">Não respondida</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── DASHBOARD VIEW ───
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Maturidade LGPD</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe a evolução da conformidade da sua organização
          </p>
        </div>
        <div className="flex items-center gap-3">
          {history.length > 0 && (
            <Button variant="outline" onClick={() => setView("history")}>
              <History className="h-4 w-4 mr-2" /> Ver Histórico
            </Button>
          )}
          <Button onClick={startQuiz} className="shadow-glow">
            <Play className="h-4 w-4 mr-2" />
            {history.length > 0 ? "Novo Diagnóstico" : "Iniciar Diagnóstico"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="shadow-card animate-pulse">
              <CardContent className="p-6 h-24" />
            </Card>
          ))}
        </div>
      ) : !latestDiag ? (
        /* Empty state */
        <Card className="shadow-elevated">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
              <Target className="h-8 w-8 text-accent-foreground" />
            </div>
            <h2 className="font-display text-xl font-bold">Nenhum diagnóstico realizado</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Responda ao questionário de maturidade para obter uma visão completa do nível de conformidade LGPD da sua organização.
            </p>
            <Button onClick={startQuiz} className="mt-6 shadow-glow" size="lg">
              <Play className="h-4 w-4 mr-2" /> Iniciar Primeiro Diagnóstico
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Score Atual</p>
                    <p className={`mt-1 font-display text-3xl font-extrabold ${maturity.color}`}>{latestOverall}%</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                    <Target className="h-5 w-5 text-accent-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nível</p>
                    <p className={`mt-1 font-display text-2xl font-bold ${maturity.color}`}>{maturity.label}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                    <BarChart3 className="h-5 w-5 text-accent-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Evolução</p>
                    <p className={`mt-1 font-display text-2xl font-bold ${scoreDelta !== null ? (scoreDelta >= 0 ? "text-primary" : "text-destructive") : "text-muted-foreground"}`}>
                      {scoreDelta !== null ? `${scoreDelta >= 0 ? "+" : ""}${scoreDelta}%` : "—"}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                    <TrendingUp className="h-5 w-5 text-accent-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Diagnósticos</p>
                    <p className="mt-1 font-display text-2xl font-bold">{history.length}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                    <History className="h-5 w-5 text-accent-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Radar */}
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Maturidade por Domínio</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="domain" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Evolution */}
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Evolução ao Longo do Tempo</CardTitle>
              </CardHeader>
              <CardContent>
                {evolutionData.length >= 2 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={evolutionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                          fontSize: 12,
                        }}
                      />
                      <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: "hsl(var(--primary))", r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    <div className="text-center">
                      <Calendar className="mx-auto h-8 w-8 mb-2 opacity-40" />
                      <p>Realize mais diagnósticos para visualizar a evolução.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Domain breakdown */}
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Detalhamento por Domínio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(latestScores).map(([name, score]) => {
                const s = score as number;
                const dm = maturityLabel(s);
                return (
                  <div key={name}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-medium">{name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${dm.color}`}>{dm.label}</span>
                        <span className={`text-sm font-bold ${dm.color}`}>{s}%</span>
                      </div>
                    </div>
                    <Progress value={s} className="h-2.5" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
