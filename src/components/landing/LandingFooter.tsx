import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

export default function LandingFooter() {
  return (
    <footer className="border-t border-border/30 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-sm font-bold text-foreground">AdequaFácil</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <a href="#funcionalidades" className="transition hover:text-foreground">Funcionalidades</a>
            <a href="#como-funciona" className="transition hover:text-foreground">Como Funciona</a>
            <a href="#faq" className="transition hover:text-foreground">FAQ</a>
            <Link to="/portal-titular" className="transition hover:text-foreground">Portal do Titular</Link>
          </div>

          <p className="text-xs text-muted-foreground/60">
            © 2026 AdequaFácil. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
