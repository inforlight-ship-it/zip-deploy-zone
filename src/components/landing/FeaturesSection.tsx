import { motion } from "framer-motion";
import {
  ClipboardCheck, Search, FileText, Cookie, UserCheck,
  AlertTriangle, BarChart3, ShieldCheck
} from "lucide-react";

const features = [
  {
    icon: ClipboardCheck,
    title: "Diagnóstico de Maturidade",
    desc: "Questionário inteligente que gera score por domínio e plano de ação automatizado.",
  },
  {
    icon: Search,
    title: "Mapeamento de Dados",
    desc: "Inventário completo de atividades de tratamento, ROPA e registro de bases legais.",
  },
  {
    icon: FileText,
    title: "Geração de Documentos",
    desc: "Políticas de privacidade, RIPD, termos de uso e minutas gerados automaticamente.",
  },
  {
    icon: Cookie,
    title: "Consentimento & Cookies",
    desc: "Banner embarcável, logs de aceite por visitante e versionamento de política.",
  },
  {
    icon: UserCheck,
    title: "Portal do Titular",
    desc: "Canal de atendimento com SLA, classificação de direitos e trilha de auditoria.",
  },
  {
    icon: AlertTriangle,
    title: "Gestão de Incidentes",
    desc: "Workflow: cadastro, análise de impacto, comunicação à ANPD e plano corretivo.",
  },
  {
    icon: ShieldCheck,
    title: "Auditoria Técnica",
    desc: "Controles de segurança, evidências e scoring de conformidade técnica.",
  },
  {
    icon: BarChart3,
    title: "Relatórios ANPD",
    desc: "ROPA, RIPD, DPIA e comunicados gerados a partir dos dados já cadastrados.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5 },
  }),
};

export default function FeaturesSection() {
  return (
    <section id="funcionalidades" className="relative py-24 lg:py-32">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(162_60%_55%/0.04),transparent_60%)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            Funcionalidades
          </span>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Tudo que sua empresa precisa para{" "}
            <span className="text-gradient-emerald">estar em conformidade</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Do diagnóstico à geração de relatórios, cada módulo resolve um pilar da LGPD.
          </p>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              className="group relative rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 shadow-card transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 hover:border-primary/20"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-all duration-300 group-hover:bg-primary group-hover:shadow-glow-sm">
                <f.icon className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
              <h3 className="font-display text-base font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
