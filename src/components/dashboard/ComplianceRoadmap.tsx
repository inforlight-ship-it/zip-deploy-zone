import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ClipboardCheck, Map, FileText, Cookie, ShieldCheck,
  AlertTriangle, Building2, CheckCircle2, Circle, ChevronRight
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface StepStatus {
  hasDiagnostic: boolean;
  hasMapping: boolean;
  hasDocuments: boolean;
  hasConsent: boolean;
  hasAudit: boolean;
  hasIncidentPlan: boolean;
  hasSuppliers: boolean;
}

const steps = [
  { key: "hasDiagnostic" as const, icon: ClipboardCheck, title: "Diagnóstico de Maturidade", desc: "Avalie o nível atual de conformidade LGPD da sua empresa.", href: "/diagnostico", cta: "Iniciar Diagnóstico" },
  { key: "hasMapping" as const, icon: Map, title: "Mapeamento de Dados", desc: "Identifique todos os dados pessoais tratados e seus fluxos.", href: "/mapeamento", cta: "Mapear Dados" },
  { key: "hasDocuments" as const, icon: FileText, title: "Documentação Legal", desc: "Crie políticas de privacidade, RIPD e termos de uso.", href: "/documentos", cta: "Criar Documentos" },
  { key: "hasConsent" as const, icon: Cookie, title: "Gestão de Consentimento", desc: "Configure banners de cookies e gerencie bases legais.", href: "/consentimento", cta: "Configurar Cookies" },
  { key: "hasAudit" as const, icon: ShieldCheck, title: "Auditoria de Segurança", desc: "Verifique controles técnicos e identifique gaps.", href: "/auditoria", cta: "Auditar Segurança" },
  { key: "hasIncidentPlan" as const, icon: AlertTriangle, title: "Plano de Incidentes", desc: "Prepare-se para responder a vazamentos e brechas.", href: "/incidentes", cta: "Preparar Plano" },
  { key: "hasSuppliers" as const, icon: Building2, title: "Avaliação de Fornecedores", desc: "Faça due diligence dos terceiros que tratam dados.", href: "/fornecedores", cta: "Avaliar Fornecedores" },
];

export default function ComplianceRoadmap({ status }: { status: StepStatus }) {
  const completedCount = steps.filter((s) => status[s.key]).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-card">
      <div className="p-6 pb-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-semibold flex items-center gap-2 text-foreground">
            <Map className="h-4 w-4 text-primary" />
            Trilha de Adequação LGPD
          </h3>
          <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary">
            {completedCount}/{steps.length}
          </span>
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progresso geral</span>
            <span className="font-semibold text-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>
      <div className="px-6 pb-6 pt-2">
        <div className="relative">
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border/30" />

          <div className="space-y-1">
            {steps.map((step, i) => {
              const done = status[step.key];
              const isNext = !done && steps.slice(0, i).every((s) => status[s.key]);

              return (
                <motion.div
                  key={step.key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.35 }}
                >
                  <div
                    className={`relative flex items-start gap-3 rounded-lg p-3 transition-all ${
                      isNext
                        ? "bg-primary/5 border border-primary/15 shadow-glow-sm"
                        : done
                        ? "opacity-70"
                        : ""
                    }`}
                  >
                    <div className="relative z-10 mt-0.5 shrink-0">
                      {done ? (
                        <CheckCircle2 className="h-[22px] w-[22px] text-primary" />
                      ) : isNext ? (
                        <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-primary shadow-glow-sm">
                          <span className="text-[10px] font-bold text-primary-foreground">{i + 1}</span>
                        </div>
                      ) : (
                        <Circle className="h-[22px] w-[22px] text-muted-foreground/30" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <step.icon className={`h-4 w-4 ${done ? "text-primary" : isNext ? "text-primary" : "text-muted-foreground/40"}`} />
                        <p className={`text-sm font-semibold ${done ? "text-foreground" : isNext ? "text-foreground" : "text-muted-foreground/60"}`}>
                          {step.title}
                        </p>
                        {done && (
                          <span className="rounded-md bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            Concluído
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground/60">{step.desc}</p>
                      {isNext && (
                        <Link
                          to={step.href}
                          className="mt-2 inline-flex items-center h-7 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-glow-sm hover:bg-primary/90 transition-colors"
                        >
                          {step.cta} <ChevronRight className="ml-1 h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
