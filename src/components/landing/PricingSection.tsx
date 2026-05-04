import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const included = [
  "Diagnóstico de Maturidade LGPD",
  "Mapeamento de Dados Pessoais",
  "Geração Automática de Documentos",
  "Gestão de Consentimento & Cookies",
  "Portal do Titular (DSAR)",
  "Gestão de Incidentes",
  "Auditoria de Segurança",
  "Relatórios para ANPD",
  "Gestão de Fornecedores",
  "Portal DPO Completo",
  "Multi-tenant & Multi-usuário",
  "Suporte prioritário",
];

export default function PricingSection() {
  return (
    <section id="precos" className="relative py-24 lg:py-32">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(162_60%_55%/0.06),transparent_60%)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary"
          >
            Preços
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Comece com{" "}
            <span className="text-gradient-emerald">30 dias grátis</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-lg text-muted-foreground"
          >
            Teste todos os módulos sem compromisso. Após o trial, aproveite nossa oferta de lançamento.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mx-auto mt-14 max-w-lg"
        >
          <div className="relative rounded-3xl border-2 border-primary/30 bg-card/60 backdrop-blur-md shadow-elevated overflow-hidden">
            {/* Top banner */}
            <div className="bg-primary px-6 py-3 text-center">
              <div className="flex items-center justify-center gap-2 text-primary-foreground font-semibold text-sm">
                <Sparkles className="h-4 w-4" />
                Oferta de Lançamento — Economize R$ 100/mês
                <Sparkles className="h-4 w-4" />
              </div>
            </div>

            <div className="p-8 lg:p-10">
              {/* Trial badge */}
              <div className="flex items-center justify-center mb-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-accent border border-primary/20 px-4 py-2 text-sm font-semibold text-accent-foreground">
                  <Clock className="h-4 w-4" />
                  30 dias de teste — todos os recursos inclusos
                </div>
              </div>

              <h3 className="font-display text-xl font-bold text-foreground text-center">
                Plano Completo
              </h3>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Acesso total a todos os módulos da plataforma
              </p>

              {/* Pricing */}
              <div className="mt-6 flex items-baseline justify-center gap-3">
                <span className="text-2xl font-medium text-muted-foreground line-through decoration-destructive/60 decoration-2">
                  R$ 299
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-6xl font-extrabold tracking-tight text-foreground">
                    R$ 199
                  </span>
                  <span className="text-lg text-muted-foreground font-medium">/mês</span>
                </div>
              </div>

              <p className="mt-2 text-center text-xs text-muted-foreground">
                Cobrado mensalmente após o período de teste
              </p>

              {/* CTA */}
              <div className="mt-8">
                <Button size="lg" className="w-full shadow-glow text-base h-12" asChild>
                  <Link to="/auth">
                    Começar 30 dias grátis <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Sem cartão de crédito necessário para o trial
                </p>
              </div>

              {/* Divider */}
              <div className="my-8 border-t border-border/50" />

              {/* Features */}
              <p className="text-sm font-semibold text-foreground mb-4">Tudo incluído:</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {included.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
