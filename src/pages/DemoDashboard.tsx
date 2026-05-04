import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Shield, ArrowLeft, FileText, Users, AlertTriangle, Search,
  ClipboardCheck, Cookie, ShieldCheck, TrendingUp, CheckCircle2, Clock, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell
} from "recharts";

const maturityData = [
  { domain: "Governança", score: 78 },
  { domain: "Bases Legais", score: 65 },
  { domain: "Direitos do Titular", score: 82 },
  { domain: "Segurança", score: 71 },
  { domain: "Terceiros", score: 58 },
  { domain: "Incidentes", score: 45 },
];

const radarData = maturityData.map(d => ({ subject: d.domain, value: d.score, fullMark: 100 }));

const kpis = [
  { label: "Score Geral", value: "67%", icon: TrendingUp, color: "text-primary" },
  { label: "Atividades Mapeadas", value: "24", icon: Search, color: "text-sky" },
  { label: "Documentos Gerados", value: "12", icon: FileText, color: "text-emerald-glow" },
  { label: "Incidentes Abertos", value: "3", icon: AlertTriangle, color: "text-amber-warning" },
];

const recentDSRs = [
  { protocol: "DSR-2026-001", name: "Maria Silva", type: "Acesso", status: "concluido", date: "08/03/2026" },
  { protocol: "DSR-2026-002", name: "João Santos", type: "Exclusão", status: "em_andamento", date: "10/03/2026" },
  { protocol: "DSR-2026-003", name: "Ana Oliveira", type: "Portabilidade", status: "pendente", date: "11/03/2026" },
  { protocol: "DSR-2026-004", name: "Carlos Mendes", type: "Correção", status: "concluido", date: "05/03/2026" },
  { protocol: "DSR-2026-005", name: "Fernanda Lima", type: "Revogação", status: "em_andamento", date: "09/03/2026" },
];

const roadmapItems = [
  { label: "Diagnóstico de Maturidade", done: true, icon: ClipboardCheck },
  { label: "Mapeamento de Dados", done: true, icon: Search },
  { label: "Geração de Documentos", done: true, icon: FileText },
  { label: "Consentimento & Cookies", done: true, icon: Cookie },
  { label: "Auditoria de Segurança", done: false, icon: ShieldCheck },
  { label: "Plano de Incidentes", done: false, icon: AlertTriangle },
  { label: "Avaliação de Fornecedores", done: false, icon: Users },
];

const docsByType = [
  { name: "Política Privacidade", qty: 3 },
  { name: "RIPD", qty: 2 },
  { name: "Termos de Uso", qty: 1 },
  { name: "Política Cookies", qty: 2 },
  { name: "Plano Incidentes", qty: 1 },
  { name: "Contrato Operador", qty: 3 },
];

const riskPie = [
  { name: "Baixo", value: 14, color: "hsl(162, 63%, 35%)" },
  { name: "Médio", value: 7, color: "hsl(38, 92%, 50%)" },
  { name: "Alto", value: 2, color: "hsl(0, 72%, 51%)" },
  { name: "Crítico", value: 1, color: "hsl(0, 62%, 30%)" },
];

const statusBadge = (status: string) => {
  switch (status) {
    case "concluido": return <Badge className="bg-primary/10 text-primary border-primary/20"><CheckCircle2 className="h-3 w-3 mr-1" />Concluído</Badge>;
    case "em_andamento": return <Badge className="bg-amber-warning/10 text-amber-warning border-amber-warning/20"><Clock className="h-3 w-3 mr-1" />Em Andamento</Badge>;
    default: return <Badge className="bg-muted text-muted-foreground"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
  }
};

export default function DemoPage() {
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

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Demo banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-xl border border-amber-warning/30 bg-amber-warning/5 p-4 text-center"
        >
          <p className="text-sm text-muted-foreground">
            🎯 <strong className="text-foreground">Modo Demonstração</strong> — Dados fictícios de uma empresa exemplo.{" "}
            <Link to="/auth" className="font-semibold text-primary underline underline-offset-2 hover:text-emerald-glow">
              Crie sua conta
            </Link>{" "}
            para ver os dados reais da sua empresa.
          </p>
        </motion.div>

        {/* Page title */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Painel de Adequação</h1>
          <p className="mt-1 text-muted-foreground">Visão geral da conformidade LGPD — Empresa Exemplo Ltda.</p>
        </motion.div>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {kpis.map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className="shadow-card">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent">
                    <k.icon className={`h-5 w-5 ${k.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{k.label}</p>
                    <p className="font-display text-2xl font-bold">{k.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Maturity radar */}
          <Card className="shadow-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-display text-lg">Score de Maturidade por Domínio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="space-y-4">
                  {maturityData.map((d) => (
                    <div key={d.domain}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{d.domain}</span>
                        <span className="text-muted-foreground">{d.score}%</span>
                      </div>
                      <Progress value={d.score} className="h-2" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compliance Roadmap */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Trilha de Conformidade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {roadmapItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.done ? "bg-primary/10" : "bg-muted"}`}>
                      {item.done
                        ? <CheckCircle2 className="h-4 w-4 text-primary" />
                        : <item.icon className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <span className={`text-sm ${item.done ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg bg-accent/50 p-3 text-center">
                <p className="text-sm font-medium text-accent-foreground">4 de 7 etapas concluídas</p>
                <Progress value={57} className="mt-2 h-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Second row */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* DSR table */}
          <Card className="shadow-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-display text-lg">Últimas Solicitações de Titulares</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-3 font-medium">Protocolo</th>
                      <th className="pb-3 font-medium">Titular</th>
                      <th className="pb-3 font-medium">Tipo</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentDSRs.map((d) => (
                      <tr key={d.protocol} className="border-b border-border/50 last:border-0">
                        <td className="py-3 font-mono text-xs">{d.protocol}</td>
                        <td className="py-3">{d.name}</td>
                        <td className="py-3">{d.type}</td>
                        <td className="py-3">{statusBadge(d.status)}</td>
                        <td className="py-3 text-muted-foreground">{d.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Risk pie */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Distribuição de Risco</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={riskPie} dataKey="value" cx="50%" cy="50%" outerRadius={75} innerRadius={45} paddingAngle={3}>
                    {riskPie.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {riskPie.map((r) => (
                  <div key={r.name} className="flex items-center gap-2 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                    <span className="text-muted-foreground">{r.name}: {r.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Third row — Documents bar chart */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Documentos por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={docsByType} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} width={130} />
                  <Tooltip />
                  <Bar dataKey="qty" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Fornecedores por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: "Aprovados", value: 8, total: 15, color: "bg-primary" },
                  { label: "Em Revisão", value: 4, total: 15, color: "bg-amber-warning" },
                  { label: "Pendentes", value: 2, total: 15, color: "bg-muted-foreground" },
                  { label: "Reprovados", value: 1, total: 15, color: "bg-destructive" },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium">{s.label}</span>
                      <span className="text-muted-foreground">{s.value} de {s.total}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className={`h-full rounded-full ${s.color}`} style={{ width: `${(s.value / s.total) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 rounded-2xl bg-hero p-8 text-center sm:p-12"
        >
          <h2 className="font-display text-2xl font-bold text-primary-foreground sm:text-3xl">
            Gostou do que viu?
          </h2>
          <p className="mt-3 text-primary-foreground/60">
            Crie sua conta e tenha seu próprio painel de conformidade LGPD em minutos.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="shadow-glow" asChild>
              <Link to="/auth">Criar Conta</Link>
            </Button>
            <Button size="lg" variant="ghost" className="border border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10" asChild>
              <Link to="/demo/diagnostico">Ver Diagnóstico Demo</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
