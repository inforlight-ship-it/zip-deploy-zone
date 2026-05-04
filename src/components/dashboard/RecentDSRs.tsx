import { Link } from "react-router-dom";
import { Clock, ChevronRight, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DSRRow {
  id: string;
  protocol: string;
  name: string;
  right_type: string;
  status: string;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const statusColors: Record<string, string> = {
  pendente: "bg-amber-warning/10 text-amber-warning border-amber-warning/20",
  em_andamento: "bg-sky/10 text-sky border-sky/20",
  concluido: "bg-primary/10 text-primary border-primary/20",
  cancelado: "bg-muted text-muted-foreground border-border/30",
};

const rightLabels: Record<string, string> = {
  access: "Acesso",
  correction: "Correção",
  deletion: "Exclusão",
  portability: "Portabilidade",
  opposition: "Oposição",
  revoke: "Revogação",
  info: "Informação",
  other: "Outro",
};

export default function RecentDSRs({ dsrs }: { dsrs: DSRRow[] }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-card">
      <div className="flex items-center justify-between p-6 pb-2">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
          <Clock className="h-4 w-4 text-primary" /> Solicitações Recentes
        </h3>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground" asChild>
          <Link to="/solicitacoes">Ver todas <ChevronRight className="ml-1 h-3 w-3" /></Link>
        </Button>
      </div>
      <div className="p-6 pt-2 space-y-2">
        {dsrs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/20 border border-border/30 mb-3">
              <Inbox className="h-7 w-7 text-muted-foreground/30" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhuma solicitação recebida</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Solicitações do portal do titular aparecerão aqui</p>
          </div>
        ) : (
          dsrs.slice(0, 5).map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-muted/10 p-3 transition-all hover:bg-muted/20 hover:border-border/50">
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight truncate text-foreground">{d.name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${statusColors[d.status]}`}>
                    {statusLabels[d.status]}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">{rightLabels[d.right_type]}</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-[10px] font-mono text-muted-foreground/60">{d.protocol}</span>
                <p className="text-[10px] text-muted-foreground/40">{new Date(d.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
