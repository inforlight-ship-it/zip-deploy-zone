import { motion } from "framer-motion";
import { 
  CheckCircle, Clock, MoreVertical, Edit2, Trash2, 
  MessageSquare, History, Calendar, User, Zap 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const statusColors: Record<string, string> = {
  pendente: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  em_andamento: "bg-sky-500/15 text-sky-600 border-sky-500/20",
  concluida: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  cancelada: "bg-muted text-muted-foreground border-border",
};

const priorityLabels: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

const priorityColors: Record<string, string> = {
  baixa: "bg-slate-500/15 text-slate-600",
  media: "bg-sky-500/15 text-sky-600",
  alta: "bg-amber-500/15 text-amber-600",
  critica: "bg-destructive/15 text-destructive",
};

export function TaskCard({ task, onEdit, onDelete, onToggle, onCollab, onHistory }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      <Card className={`group relative hover:shadow-glow-sm transition-all duration-300 border-l-4 ${
        task.status === 'concluida' ? 'border-l-emerald-500 opacity-80' : 
        task.priority === 'critica' ? 'border-l-destructive' :
        task.priority === 'alta' ? 'border-l-amber-500' : 'border-l-primary'
      }`}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <Badge className={statusColors[task.status] + " border"}>
              {statusLabels[task.status]}
            </Badge>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full"
                onClick={() => onToggle(task)}
              >
                {task.status === 'concluida' ? 
                  <Clock className="h-4 w-4 text-amber-500" /> : 
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                }
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => onEdit(task)}>
                    <Edit2 className="mr-2 h-4 w-4" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCollab(task)}>
                    <MessageSquare className="mr-2 h-4 w-4" /> Comentários
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onHistory(task)}>
                    <History className="mr-2 h-4 w-4" /> Histórico
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(task.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <CardTitle className={`text-lg leading-tight mt-2 ${task.status === 'concluida' ? 'line-through text-muted-foreground' : ''}`}>
            {task.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground line-clamp-2 h-10">
            {task.description || "Sem descrição"}
          </p>
          
          {task.ai_recommendation && (
            <div className="bg-primary/5 border border-primary/10 rounded-md p-2 mt-2 flex items-start gap-2">
              <Zap className="h-3 w-3 text-primary shrink-0 mt-0.5" />
              <p className="text-[10px] text-primary leading-tight italic">
                {task.ai_recommendation}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="outline" className={priorityColors[task.priority] + " border-none text-[10px]"}>
              {priorityLabels[task.priority]}
            </Badge>
            {task.due_date && (
              <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(task.due_date), "dd MMM", { locale: ptBR })}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/50 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center border border-border">
                <User className="h-3 w-3" />
              </div>
              <span>{task.profiles?.full_name || "Não atribuído"}</span>
            </div>
            <span>{format(new Date(task.created_at), "dd/MM/yy")}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
