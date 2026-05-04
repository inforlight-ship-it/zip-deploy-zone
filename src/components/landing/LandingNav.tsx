import { Link } from "react-router-dom";
import { Shield, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-border/30 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-glow-sm">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold text-foreground">
            AdequaFácil
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          <a href="#funcionalidades" className="text-sm text-muted-foreground transition hover:text-foreground">Funcionalidades</a>
          <a href="#como-funciona" className="text-sm text-muted-foreground transition hover:text-foreground">Como Funciona</a>
          <a href="#diferenciais" className="text-sm text-muted-foreground transition hover:text-foreground">Diferenciais</a>
          <a href="#faq" className="text-sm text-muted-foreground transition hover:text-foreground">FAQ</a>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-muted/30" asChild>
            <Link to="/auth">Entrar</Link>
          </Button>
          <Button className="shadow-glow-sm" asChild>
            <Link to="/auth">Criar Conta</Link>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border/30 bg-background/95 backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col gap-4 px-4 py-6">
              <a href="#funcionalidades" onClick={() => setOpen(false)} className="text-sm text-muted-foreground">Funcionalidades</a>
              <a href="#como-funciona" onClick={() => setOpen(false)} className="text-sm text-muted-foreground">Como Funciona</a>
              <a href="#diferenciais" onClick={() => setOpen(false)} className="text-sm text-muted-foreground">Diferenciais</a>
              <a href="#faq" onClick={() => setOpen(false)} className="text-sm text-muted-foreground">FAQ</a>
              <div className="flex flex-col gap-2 pt-2">
                <Button variant="outline" className="border-border text-foreground" asChild>
                  <Link to="/auth">Entrar</Link>
                </Button>
                <Button className="shadow-glow-sm" asChild>
                  <Link to="/auth">Criar Conta</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
