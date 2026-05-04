import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CTASection() {
  return (
    <section className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl border border-border/30 bg-card/40 backdrop-blur-md p-12 text-center sm:p-16 lg:p-20"
        >
          {/* Glow effects */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(162_60%_55%/0.08),transparent_60%)]" />
          <div className="absolute inset-0 bg-grid opacity-20" />

          <div className="relative">
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Sua empresa merece estar{" "}
              <span className="text-gradient-emerald">em conformidade</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
              Teste todos os módulos por 30 dias sem compromisso. Depois, apenas R$ 199/mês.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" className="shadow-glow text-base px-10 h-12" asChild>
                <Link to="/auth">
                  Começar 30 dias grátis <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="border border-border bg-card/30 text-foreground hover:bg-card/50 text-base h-12"
                asChild
              >
                <Link to="/demo/diagnostico">Ver Diagnóstico Demo</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
