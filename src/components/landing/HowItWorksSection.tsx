import { motion } from "framer-motion";
import { ClipboardList, Settings, FileCheck, Brain, Zap, MessageSquare } from "lucide-react";

const steps = [
  {
    icon: ClipboardList,
    step: "01",
    title: "Faça o diagnóstico",
    desc: "Responda um questionário rápido e receba seu score de maturidade LGPD com plano de ação.",
  },
  {
    icon: Settings,
    step: "02",
    title: "Configure sua operação",
    desc: "Cadastre atividades de tratamento, fornecedores e configure o portal do titular.",
  },
  {
    icon: Brain,
    step: "03",
    title: "IA analisa e prioriza",
    desc: "Nossa IA processa seus dados, calcula riscos e sugere as tarefas prioritárias para sua equipe.",
  },
  {
    icon: Zap,
    step: "04",
    title: "Automação e Auditoria",
    desc: "Gere documentos em segundos e mantenha uma trilha de auditoria imutável para a ANPD.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="como-funciona" className="relative border-t border-border/30 py-24 lg:py-32">
      <div className="absolute inset-0 bg-muted/5" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            Como funciona
          </span>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Da primeira visita à conformidade em{" "}
            <span className="text-gradient-emerald">4 passos</span>
          </h2>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="relative text-center"
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="absolute top-8 left-[calc(50%+32px)] hidden h-px w-[calc(100%-64px)] bg-border/30 lg:block">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary/40" />
                </div>
              )}

              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-card border border-border/50 shadow-card transition-all hover:shadow-glow-sm hover:border-primary/20">
                <s.icon className="h-7 w-7 text-primary" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                Passo {s.step}
              </span>
              <h3 className="mt-2 font-display text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
