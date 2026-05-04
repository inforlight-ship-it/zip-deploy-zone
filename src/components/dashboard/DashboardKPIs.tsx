import { motion } from "framer-motion";
import { Shield, FileText, Users, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

interface KPIData {
  diagScore: number | null;
  diagCount: number;
  dsrTotal: number;
  dsrPending: number;
  lastDiagDate: string | null;
}

export default function DashboardKPIs({ diagScore, diagCount, dsrTotal, dsrPending, lastDiagDate }: KPIData) {
  const kpis = [
    {
      icon: Shield,
      label: "Score de Maturidade",
      value: diagScore != null ? `${diagScore}%` : "—",
      sub: diagScore != null
        ? diagScore >= 70 ? "Bom nível" : diagScore >= 40 ? "Intermediário" : "Atenção"
        : "Sem dados",
      accent: "text-primary",
      iconBg: "bg-primary/10 border-primary/20",
      trendIcon: diagCount > 1 ? TrendingUp : null,
    },
    {
      icon: FileText,
      label: "Diagnósticos",
      value: String(diagCount),
      sub: lastDiagDate ? `Último: ${lastDiagDate}` : "Nenhum realizado",
      accent: "text-sky",
      iconBg: "bg-sky/10 border-sky/20",
      trendIcon: null,
    },
    {
      icon: Users,
      label: "Solicitações (DSR)",
      value: String(dsrTotal),
      sub: dsrPending > 0 ? `${dsrPending} aguardando ação` : "Todas respondidas",
      accent: "text-amber-warning",
      iconBg: "bg-amber-warning/10 border-amber-warning/20",
      trendIcon: null,
    },
    {
      icon: AlertTriangle,
      label: "Pendências",
      value: String(dsrPending),
      sub: dsrPending > 0 ? "Requer atenção" : "Nenhuma pendência",
      accent: dsrPending > 0 ? "text-destructive" : "text-primary",
      iconBg: dsrPending > 0 ? "bg-destructive/10 border-destructive/20" : "bg-primary/10 border-primary/20",
      trendIcon: dsrPending > 0 ? TrendingDown : null,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi, i) => (
        <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, duration: 0.4 }}>
          <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 shadow-card transition-all hover:border-border/80 hover:shadow-elevated">
            <div className="flex items-center justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${kpi.iconBg}`}>
                <kpi.icon className={`h-5 w-5 ${kpi.accent}`} />
              </div>
              {kpi.trendIcon && <kpi.trendIcon className="h-4 w-4 text-muted-foreground/40" />}
            </div>
            <p className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground">{kpi.value}</p>
            <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
            <p className="mt-1 text-[11px] text-muted-foreground/60">{kpi.sub}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
