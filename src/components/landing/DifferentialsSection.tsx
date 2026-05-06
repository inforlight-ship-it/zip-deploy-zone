import { motion } from "framer-motion";
import { Zap, DollarSign, Clock, ShieldCheck, Building2, Headphones } from "lucide-react";

const diffs = [
  {
    icon: Building2,
    title: "Feito para pequenas empresas",
    desc: "Interface simples, sem termos complicados. Você não precisa ser jurista nem especialista em TI.",
  },
  {
    icon: Zap,
    title: "Automação inteligente",
    desc: "Documentos, relatórios e diagnósticos gerados automaticamente com os dados da plataforma.",
  },
  {
    icon: DollarSign,
    title: "Sem custos de consultoria",
    desc: "Substitua consultorias caras por uma plataforma acessível que guia você passo a passo.",
  },
  {
    icon: Clock,
    title: "Operação contínua",
    desc: "Não é projeto pontual. Monitore, atualize e mantenha a conformidade 24 horas por dia.",
  },
  {
    icon: ShieldCheck,
    title: "Evidência técnica real",
    desc: "Controles auditáveis, trilha de atividades e registros prontos para fiscalização.",
  },
  {
    icon: Headphones,
    title: "IA & Automação Real",
    desc: "Não somos apenas repositório de arquivos. Nossa IA trabalha 24/7 priorizando riscos e automatizando fluxos.",
  },
];

export default function DifferentialsSection() {
  return (
    <section id="diferenciais" className="relative py-24 lg:py-32">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(162_60%_55%/0.04),transparent_60%)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            Diferenciais
          </span>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            A única plataforma com <br className="hidden sm:block" />
            <span className="text-gradient-emerald">Inteligência Operacional</span>
          </h2>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {diffs.map((d, i) => (
            <motion.div
              key={d.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="group flex gap-4 rounded-2xl border border-border/30 bg-card/40 backdrop-blur-sm p-5 transition-all hover:border-primary/20 hover:bg-card/60"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                <d.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-foreground">{d.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{d.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
