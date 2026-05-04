import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Shield, ArrowLeft, ArrowRight, CheckCircle2, BarChart3, Play, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer
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
  const scores: Record<string, number> = {};
  let sum = 0, count = 0;
  Object.entries(domains).forEach(([d, v]) => {
    const pct = Math.round((v.total / v.max) * 100);
    scores[d] = pct;
    sum += pct;
    count++;
  });
  return { scores, overall: Math.round(sum / count) };
}

function getLevel(score: number) {
  if (score >= 80) return { label: "Avançado", color: "text-primary" };
  if (score >= 60) return { label: "Intermediário", color: "text-amber-warning" };
  if (score >= 40) return { label: "Básico", color: "text-amber-warning" };
  return { label: "Inicial", color: "text-destructive" };
}

export default function DemoDiagnostico() {
  const [step, setStep] = useState<"intro" | "quiz" | "result">("intro");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const handleAnswer = (score: number) => {
    setAnswers((prev) => ({ ...prev, [current]: score }));
    if (current < questions.length - 1) {
      setCurrent(current + 1);
    } else {
      setStep("result");
    }
  };

  const { scores, overall } = computeScores(answers);
  const level = getLevel(overall);

  const radarData = Object.entries(scores).map(([d, v]) => ({
    subject: d,
    value: v,
    fullMark: 100,
  }));

  const recommendations: Record<string, string> = {
    Governança: "Nomeie um DPO/Encarregado e institua um comitê de privacidade com agenda recorrente.",
    "Bases Legais": "Documente a base legal de cada atividade de tratamento no módulo de Mapeamento.",
    "Direitos do Titular": "Configure o Portal do Titular para receber e gerenciar solicitações com SLA.",
    Segurança: "Implemente MFA em todos os sistemas e crie uma política de retenção de dados.",
    Terceiros: "Revise contratos com fornecedores e inclua cláusulas de proteção de dados (DPA).",
    Incidentes: "Documente e teste seu plano de resposta a incidentes periodicamente.",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao site
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-display text-sm font-bold">AdequaFácil</span>
            <Badge variant="outline" className="ml-2 text-xs border-amber-warning/40 text-amber-warning">DEMO</Badge>
          </div>
          <Button size="sm" className="shadow-glow" asChild>
            <Link to="/auth">Criar Conta</Link>
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Demo banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-xl border border-amber-warning/30 bg-amber-warning/5 p-4 text-center"
        >
          <p className="text-sm text-muted-foreground">
            🎯 <strong className="text-foreground">Modo Demonstração</strong> — Experimente o diagnóstico. Os resultados não serão salvos.{" "}
            <Link to="/auth" className="font-semibold text-primary underline underline-offset-2 hover:text-emerald-glow">
              Crie sua conta
            </Link>{" "}
            para salvar e acompanhar sua evolução.
          </p>
        </motion.div>

        {/* INTRO */}
        {step === "intro" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-accent">
              <BarChart3 className="h-10 w-10 text-accent-foreground" />
            </div>
            <h1 className="font-display text-3xl font-bold">Diagnóstico de Maturidade LGPD</h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-lg mx-auto">
              Responda {questions.length} perguntas rápidas e descubra o nível de conformidade da sua empresa com a LGPD.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-4 max-w-sm mx-auto">
              <div className="text-center">
                <div className="font-display text-2xl font-bold text-primary">{questions.length}</div>
                <div className="text-xs text-muted-foreground">Perguntas</div>
              </div>
              <div className="text-center">
                <div className="font-display text-2xl font-bold text-primary">5 min</div>
                <div className="text-xs text-muted-foreground">Tempo médio</div>
              </div>
              <div className="text-center">
                <div className="font-display text-2xl font-bold text-primary">6</div>
                <div className="text-xs text-muted-foreground">Domínios</div>
              </div>
            </div>
            <Button size="lg" className="mt-8 shadow-glow" onClick={() => setStep("quiz")}>
              <Play className="mr-2 h-4 w-4" /> Iniciar Diagnóstico
            </Button>
          </motion.div>
        )}

        {/* QUIZ */}
        {step === "quiz" && (
          <motion.div key={current} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>Pergunta {current + 1} de {questions.length}</span>
                <Badge variant="outline">{questions[current].domain}</Badge>
              </div>
              <Progress value={((current + 1) / questions.length) * 100} className="h-2" />
            </div>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-lg leading-relaxed">
                  {questions[current].text}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {questions[current].options.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => handleAnswer(opt.score)}
                    className="w-full rounded-xl border border-border bg-card p-4 text-left text-sm transition-all hover:border-primary hover:bg-accent hover:shadow-card"
                  >
                    {opt.label}
                  </button>
                ))}
              </CardContent>
            </Card>

            {current > 0 && (
              <Button variant="ghost" size="sm" className="mt-4" onClick={() => setCurrent(current - 1)}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
              </Button>
            )}
          </motion.div>
        )}

        {/* RESULT */}
        {step === "result" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-center mb-8">
              <h1 className="font-display text-3xl font-bold">Resultado do Diagnóstico</h1>
              <p className="mt-2 text-muted-foreground">Veja o nível de maturidade LGPD da sua empresa</p>
            </div>

            {/* Overall score */}
            <Card className="shadow-elevated mb-6">
              <CardContent className="flex flex-col items-center gap-4 p-8">
                <div className="relative flex h-32 w-32 items-center justify-center">
                  <svg className="absolute inset-0" viewBox="0 0 128 128">
                    <circle cx="64" cy="64" r="56" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                    <circle
                      cx="64" cy="64" r="56" fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
                      strokeDasharray={`${(overall / 100) * 352} 352`}
                      strokeLinecap="round"
                      transform="rotate(-90 64 64)"
                    />
                  </svg>
                  <span className="font-display text-4xl font-extrabold">{overall}%</span>
                </div>
                <div>
                  <p className={`text-center text-lg font-semibold ${level.color}`}>{level.label}</p>
                  <p className="text-sm text-muted-foreground text-center">Score geral de maturidade</p>
                </div>
              </CardContent>
            </Card>

            {/* Radar + bars */}
            <div className="grid gap-6 md:grid-cols-2 mb-6">
              <Card className="shadow-card">
                <CardHeader><CardTitle className="font-display text-base">Radar por Domínio</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader><CardTitle className="font-display text-base">Score por Domínio</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(scores).map(([d, v]) => {
                    const l = getLevel(v);
                    return (
                      <div key={d}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{d}</span>
                          <span className={`font-semibold ${l.color}`}>{v}%</span>
                        </div>
                        <Progress value={v} className="h-2" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            <Card className="shadow-card mb-8">
              <CardHeader>
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Recomendações Prioritárias
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(scores)
                  .sort((a, b) => a[1] - b[1])
                  .slice(0, 4)
                  .map(([domain, score]) => (
                    <div key={domain} className="flex items-start gap-3 rounded-lg border border-border p-3">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent">
                        <ArrowRight className="h-3 w-3 text-accent-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{domain} ({score}%)</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{recommendations[domain]}</p>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>

            {/* CTA */}
            <div className="rounded-2xl bg-hero p-8 text-center">
              <h2 className="font-display text-xl font-bold text-primary-foreground sm:text-2xl">
                Salve seu diagnóstico e comece a adequação
              </h2>
              <p className="mt-2 text-sm text-primary-foreground/60">
                Crie sua conta para salvar resultados, gerar documentos e acompanhar sua evolução.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button size="lg" className="shadow-glow" asChild>
                  <Link to="/auth">Criar Conta</Link>
                </Button>
                <Button size="lg" variant="ghost" className="border border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10" asChild>
                  <Link to="/demo/dashboard">Ver Dashboard Demo</Link>
                </Button>
              </div>
            </div>

            {/* Restart */}
            <div className="mt-6 text-center">
              <Button variant="ghost" onClick={() => { setStep("intro"); setCurrent(0); setAnswers({}); }}>
                Refazer Diagnóstico
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
