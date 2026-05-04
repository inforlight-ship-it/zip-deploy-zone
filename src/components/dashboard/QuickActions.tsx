import { Link } from "react-router-dom";
import { BarChart3, Users, FileText, ShieldCheck, AlertTriangle, Building2, ArrowRight } from "lucide-react";

const actions = [
  { icon: BarChart3, label: "Diagnóstico", desc: "Avaliar maturidade", href: "/diagnostico", accent: "bg-primary/10 border-primary/20 text-primary" },
  { icon: Users, label: "Portal Titular", desc: "Formulário público", href: "/portal-titular", accent: "bg-sky/10 border-sky/20 text-sky" },
  { icon: FileText, label: "Documentos", desc: "Políticas e termos", href: "/documentos", accent: "bg-amber-warning/10 border-amber-warning/20 text-amber-warning" },
  { icon: ShieldCheck, label: "Auditoria", desc: "Controles técnicos", href: "/auditoria", accent: "bg-primary/10 border-primary/20 text-primary" },
  { icon: AlertTriangle, label: "Incidentes", desc: "Gestão de brechas", href: "/incidentes", accent: "bg-destructive/10 border-destructive/20 text-destructive" },
  { icon: Building2, label: "Fornecedores", desc: "Due diligence", href: "/fornecedores", accent: "bg-sky/10 border-sky/20 text-sky" },
];

export default function QuickActions() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {actions.map((a) => (
        <Link to={a.href} key={a.label}>
          <div className="group flex items-center gap-3 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 shadow-card cursor-pointer transition-all hover:shadow-elevated hover:-translate-y-0.5 hover:border-primary/20">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${a.accent}`}>
              <a.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-foreground">{a.label}</p>
              <p className="text-[11px] text-muted-foreground">{a.desc}</p>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </div>
        </Link>
      ))}
    </div>
  );
}
