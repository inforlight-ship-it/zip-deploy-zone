import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const checks = [
  "Sem necessidade de consultoria externa",
  "Relatórios prontos para a ANPD",
  "Comece em menos de 5 minutos",
];

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-hero pt-32 pb-24 lg:pt-44 lg:pb-36">
      {/* Background effects */}
      <div className="absolute inset-0 bg-radial-glow" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(199_89%_48%/0.05),transparent_50%)]" />
      <div className="absolute inset-0 bg-grid opacity-30" />
      
      {/* Animated orb */}
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emerald/5 blur-[100px]" 
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-glow/20 bg-emerald/5 px-4 py-1.5 text-sm font-medium text-emerald-glow backdrop-blur-sm">
              <Shield className="h-3.5 w-3.5" />
              30 dias grátis · Plataforma de conformidade LGPD
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-5xl xl:text-7xl"
          >
            Adequação à LGPD{" "}
            <span className="text-gradient-emerald">simplificada.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-6 mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground"
          >
            Chega de planilhas e consultorias caras. O AdequaFácil automatiza
            diagnóstico, documentos, gestão de incidentes e relatórios exigidos
            pela ANPD — tudo num só lugar.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center"
          >
            <Button size="lg" className="shadow-glow text-base px-8 h-12" asChild>
              <Link to="/auth">
                Começar 30 dias grátis <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="border border-border bg-card/30 backdrop-blur-sm text-foreground hover:bg-card/50 text-base h-12"
              asChild
            >
              <Link to="/demo/dashboard">Ver Demonstração</Link>
            </Button>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-10 flex flex-wrap justify-center gap-6"
          >
            {checks.map((c) => (
              <li key={c} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-glow" />
                {c}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* Dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-20 relative"
        >
          {/* Glow behind */}
          <div className="absolute -inset-4 rounded-3xl bg-emerald/5 blur-3xl" />
          
          <div className="relative rounded-2xl border border-border/50 bg-card/60 p-6 lg:p-8 backdrop-blur-md shadow-elevated">
            {/* Browser bar */}
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border/30">
              <div className="h-3 w-3 rounded-full bg-destructive/40" />
              <div className="h-3 w-3 rounded-full bg-amber-warning/40" />
              <div className="h-3 w-3 rounded-full bg-emerald/40" />
              <div className="ml-4 h-5 flex-1 max-w-xs rounded-md bg-muted/30" />
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
              {[
                { label: "Score Geral", value: "78%", change: "+8%" },
                { label: "Diagnósticos", value: "12", change: "+3" },
                { label: "Tarefas Ativas", value: "32", change: "IA ativa" },
                { label: "Conformidade", value: "87%", change: "+5%" },
                { label: "Alertas Risco", value: "0", change: "Seguro" },
              ].map((k) => (
                <div key={k.label} className="rounded-xl bg-muted/20 border border-border/30 p-3">
                  <p className="text-[11px] text-muted-foreground">{k.label}</p>
                  <p className="font-display text-xl font-bold text-foreground mt-1">{k.value}</p>
                  <p className="text-[10px] text-emerald-glow mt-0.5">{k.change}</p>
                </div>
              ))}
            </div>

            {/* Chart mockup */}
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-xl bg-muted/20 border border-border/30 p-4 h-40 flex items-end gap-1">
                {[40, 55, 35, 70, 50, 80, 65, 90, 75, 85, 60, 95].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 0.8, delay: 0.7 + i * 0.05 }}
                    className="flex-1 rounded-t-sm bg-gradient-to-t from-primary/60 to-primary/20"
                  />
                ))}
              </div>
              <div className="rounded-xl bg-muted/20 border border-border/30 p-4">
                <p className="text-xs font-semibold text-foreground mb-3">Maturidade</p>
                {[
                  { label: "Legal", pct: 82 },
                  { label: "Operacional", pct: 65 },
                  { label: "Técnica", pct: 91 },
                ].map((b) => (
                  <div key={b.label} className="mb-3">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-muted-foreground">{b.label}</span>
                      <span className="text-foreground font-medium">{b.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/30">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${b.pct}%` }}
                        transition={{ duration: 1, delay: 0.8 }}
                        className="h-full rounded-full bg-primary"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-8 sm:grid-cols-4"
        >
          {[
            { value: "8+", label: "Módulos integrados" },
            { value: "100%", label: "Aderente à LGPD" },
            { value: "3x", label: "Mais rápido" },
            { value: "24/7", label: "Operação contínua" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-display text-3xl font-extrabold text-emerald-glow">{s.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
