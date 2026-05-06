import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ListTodo, Plus, Trash2, Calendar as CalendarIcon, AlertTriangle, 
  CheckCircle2, Clock, Filter, User, Search, 
  MoreVertical, Edit2, CheckCircle, Brain, 
  Zap, Settings, Activity, MessageSquare, 
  History, Send, AtSign, LayoutGrid, CalendarDays
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogTrigger, DialogFooter 
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Task Components
import { TaskCard } from "@/components/tasks/TaskCard";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskCalendar } from "@/components/tasks/TaskCalendar";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string | null;
  due_date: string | null;
  assigned_to: string | null;
  created_at: string;
  ai_priority_score?: number;
  ai_recommendation?: string;
  profiles?: {
    full_name: string | null;
  } | null;
}

interface TenantUser {
  id: string;
  full_name: string | null;
  email: string;
}

export default function Tasks() {
  const { user, currentTenant } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Collab state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [isCollabOpen, setIsCollabOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  // Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTask, setCurrentTask] = useState<Partial<Task>>({
    title: "",
    description: "",
    priority: "media",
    status: "pendente",
    category: "Geral",
    due_date: "",
    assigned_to: "",
  });

  const fetchTasks = async () => {
    if (!currentTenant) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select(`
        *,
        profiles!tasks_assigned_to_user_profile_fkey (full_name)
      `)
      .eq("tenant_id", currentTenant.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar tarefas: " + error.message);
    } else {
      setTasks(data as any[]);
    }
    setLoading(false);
  };

  const fetchTenantUsers = async () => {
    if (!currentTenant) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .eq("tenant_id", currentTenant.id);

    if (!error && data) {
      setTenantUsers(data.map(u => ({ id: u.user_id, full_name: u.full_name, email: u.email })) as TenantUser[]);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchTenantUsers();

    // Realtime subscription
    const channel = supabase
      .channel('realtime_engagement')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        fetchTasks();
        if (payload.new && (payload.new as any).assigned_to === user?.id && payload.eventType === 'UPDATE') {
          toast.info("Tarefa Atualizada: Uma tarefa atribuída a você foi modificada.");
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_comments' }, (payload) => {
        if (selectedTask && payload.new.task_id === selectedTask.id) {
          fetchComments(selectedTask.id);
        }
        if (payload.new.content.includes(`@${user?.id}`) || payload.new.content.includes(`@${user?.email}`)) {
          toast.info("Nova Menção: Você foi mencionado em um comentário.");
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'invitations' }, (payload) => {
        if (payload.new.email === user?.email) {
          toast.info("Novo Convite: Você recebeu um novo convite para um Tenant.");
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenant, user?.id, selectedTask?.id]);

  const fetchComments = async (taskId: string) => {
    const { data } = await supabase
      .from("task_comments")
      .select("*, profiles:user_id(full_name)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });
    if (data) setComments(data);
  };

  const fetchHistory = async (taskId: string) => {
    const { data } = await supabase
      .from("activity_logs")
      .select("*, profiles:user_id(full_name)")
      .eq("entity_id", taskId)
      .eq("entity_type", "task")
      .order("created_at", { ascending: false });
    if (data) setActivityLogs(data);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTask || !user) return;
    const { error } = await supabase
      .from("task_comments")
      .insert({
        task_id: selectedTask.id,
        user_id: user.id,
        content: newComment
      });
    if (!error) {
      setNewComment("");
      fetchComments(selectedTask.id);
    }
  };

  const openCollab = (task: Task) => {
    setSelectedTask(task);
    fetchComments(task.id);
    setIsCollabOpen(true);
  };

  const openHistory = (task: Task) => {
    setSelectedTask(task);
    fetchHistory(task.id);
    setIsHistoryOpen(true);
  };

  const handleSaveTask = async () => {
    if (!currentTenant || !user || !currentTask.title) return;

    const taskData = {
      tenant_id: currentTenant.id,
      title: currentTask.title,
      description: currentTask.description,
      priority: currentTask.priority,
      status: currentTask.status,
      category: currentTask.category,
      due_date: currentTask.due_date || null,
      assigned_to: currentTask.assigned_to || null,
      created_by: user.id,
    };

    if (isEditing && currentTask.id) {
      const { error } = await supabase
        .from("tasks")
        .update(taskData)
        .eq("id", currentTask.id);

      if (error) {
        toast.error("Erro ao atualizar tarefa: " + error.message);
      } else {
        toast.success("Tarefa atualizada com sucesso");
        setIsCreateDialogOpen(false);
        supabase.functions.invoke('ai-priority-worker', { body: { taskId: currentTask.id } });
        fetchTasks();
      }
    } else {
      const { data, error } = await supabase
        .from("tasks")
        .insert([taskData])
        .select()
        .single();

      if (error) {
        toast.error("Erro ao criar tarefa: " + error.message);
      } else {
        toast.success("Tarefa criada com sucesso");
        setIsCreateDialogOpen(false);
        if (data) {
          supabase.functions.invoke('ai-priority-worker', { body: { taskId: data.id } });
        }
        fetchTasks();
      }
    }
  };

  const handleDeleteTask = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
    } else {
      toast.success("Tarefa excluída");
      fetchTasks();
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === "concluida" ? "pendente" : "concluida";
    const update: any = { status: newStatus };
    if (newStatus === "concluida") update.completed_at = new Date().toISOString();
    else update.completed_at = null;

    const { error } = await supabase
      .from("tasks")
      .update(update)
      .eq("id", task.id);

    if (error) {
      toast.error("Erro ao alterar status: " + error.message);
    } else {
      fetchTasks();
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (task.description?.toLowerCase() || "").includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchQuery, statusFilter]);

  const openEditDialog = (task: Task) => {
    setCurrentTask(task);
    setIsEditing(true);
    setIsCreateDialogOpen(true);
  };

  const openCreateDialog = () => {
    setCurrentTask({
      title: "",
      description: "",
      priority: "media",
      status: "pendente",
      category: "Geral",
      due_date: "",
      assigned_to: "",
    });
    setIsEditing(false);
    setIsCreateDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient-primary">Tarefas Inteligentes</h1>
          <p className="text-muted-foreground">Gerencie atividades com automação e inteligência artificial.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Settings className="h-4 w-4" /> Automar
          </Button>
          <Button onClick={openCreateDialog} className="shadow-glow-sm">
            <Plus className="mr-2 h-4 w-4" /> Nova Tarefa
          </Button>
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <TabsList className="grid w-full md:w-auto grid-cols-3 p-1 bg-muted/30">
            <TabsTrigger value="list" className="gap-2"><ListTodo className="h-4 w-4" /> Lista</TabsTrigger>
            <TabsTrigger value="kanban" className="gap-2"><LayoutGrid className="h-4 w-4" /> Kanban</TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2"><CalendarDays className="h-4 w-4" /> Calendário</TabsTrigger>
          </TabsList>

          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar tarefas..." 
                className="pl-10 h-10" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_andamento">Em andamento</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* AI Insights Bar */}
        {filteredTasks.some(t => t.ai_priority_score && t.ai_priority_score > 70) && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-4 mb-6 shadow-sm"
          >
            <div className="bg-primary/10 p-2.5 rounded-full text-primary">
              <Brain className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary">Sugestão da IA para hoje</p>
              <p className="text-xs text-muted-foreground">
                Detectamos tarefas críticas que precisam de atenção imediata baseado em prazos e impacto.
              </p>
            </div>
            <Button size="sm" variant="outline" className="text-xs border-primary/20 hover:bg-primary/5">Ver Recomendações</Button>
          </motion.div>
        )}

        <TabsContent value="list" className="mt-0 outline-none">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <Card className="border-dashed py-20 bg-muted/10">
              <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <ListTodo className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="max-w-md">
                  <h3 className="text-xl font-semibold">Nenhuma tarefa encontrada</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Crie sua primeira tarefa inteligente para começar a gerenciar sua conformidade.
                  </p>
                </div>
                <Button variant="outline" onClick={openCreateDialog} className="mt-4">
                  Criar primeira tarefa
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTasks.map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onEdit={openEditDialog} 
                  onDelete={handleDeleteTask}
                  onToggle={toggleTaskStatus}
                  onCollab={openCollab}
                  onHistory={openHistory}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="kanban" className="mt-0 outline-none">
          <KanbanBoard 
            tasks={filteredTasks} 
            onTaskMove={async (id, status) => {
              const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
              if (!error) fetchTasks();
            }}
            onEdit={openEditDialog}
            onCollab={openCollab}
          />
        </TabsContent>

        <TabsContent value="calendar" className="mt-0 outline-none">
          <TaskCalendar tasks={filteredTasks} onSelectTask={openEditDialog} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[550px] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{isEditing ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-sm font-semibold">Título</Label>
              <Input 
                id="title" 
                placeholder="Ex: Revisar política de privacidade" 
                value={currentTask.title}
                onChange={(e) => setCurrentTask({...currentTask, title: e.target.value})}
                className="h-11"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description" className="text-sm font-semibold">Descrição</Label>
              <Textarea 
                id="description" 
                placeholder="Detalhes sobre o que precisa ser feito..." 
                rows={4}
                value={currentTask.description || ""}
                onChange={(e) => setCurrentTask({...currentTask, description: e.target.value})}
                className="resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="priority" className="text-sm font-semibold">Prioridade</Label>
                <Select 
                  value={currentTask.priority} 
                  onValueChange={(val) => setCurrentTask({...currentTask, priority: val})}
                >
                  <SelectTrigger id="priority" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa text-slate-600">Baixa</SelectItem>
                    <SelectItem value="media text-sky-600">Média</SelectItem>
                    <SelectItem value="alta text-amber-600">Alta</SelectItem>
                    <SelectItem value="critica text-destructive font-bold">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status" className="text-sm font-semibold">Status</Label>
                <Select 
                  value={currentTask.status} 
                  onValueChange={(val) => setCurrentTask({...currentTask, status: val})}
                >
                  <SelectTrigger id="status" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em andamento</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="due_date" className="text-sm font-semibold">Data de Vencimento</Label>
                <Input 
                  id="due_date" 
                  type="date" 
                  value={currentTask.due_date || ""}
                  onChange={(e) => setCurrentTask({...currentTask, due_date: e.target.value})}
                  className="h-11"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assigned_to" className="text-sm font-semibold">Atribuído a</Label>
                <Select 
                  value={currentTask.assigned_to || "none"} 
                  onValueChange={(val) => setCurrentTask({...currentTask, assigned_to: val === "none" ? null : val})}
                >
                  <SelectTrigger id="assigned_to" className="h-11">
                    <SelectValue placeholder="Selecionar usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não atribuído</SelectItem>
                    {tenantUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="h-11 px-6">Cancelar</Button>
            <Button onClick={handleSaveTask} className="h-11 px-8 shadow-glow-sm">Salvar Tarefa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Collaboration Dialog */}
      <Dialog open={isCollabOpen} onOpenChange={setIsCollabOpen}>
        <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <MessageSquare className="h-6 w-6 text-primary" />
              Comentários
            </DialogTitle>
            <CardDescription className="truncate">{selectedTask?.title}</CardDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 p-6 pt-2 pr-4 scrollbar-thin">
            {comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-50 grayscale scale-90">
                <MessageSquare className="h-16 w-16 mb-2" />
                <p className="text-sm">Nenhum comentário ainda.</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className={`flex flex-col ${comment.user_id === user?.id ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm ${
                    comment.user_id === user?.id ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-muted rounded-tl-none'
                  }`}>
                    <p className="text-[10px] font-black uppercase tracking-wider mb-1 opacity-70">
                      {comment.profiles?.full_name || 'Usuário'}
                    </p>
                    <p className="text-sm leading-relaxed">{comment.content}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1.5 px-1">
                    {format(new Date(comment.created_at), "HH:mm")}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="p-6 border-t bg-muted/20 space-y-3">
            {showMentions && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="bg-background border rounded-xl shadow-2xl p-2 max-h-40 overflow-y-auto border-primary/20"
              >
                <p className="text-[10px] text-muted-foreground mb-1 uppercase font-black px-2 py-1">Mencionar usuário</p>
                {tenantUsers.map(u => (
                  <button
                    key={u.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 rounded-lg transition-colors flex items-center gap-2"
                    onClick={() => {
                      setNewComment(prev => prev.split('@')[0] + `@${u.full_name || u.email} `);
                      setShowMentions(false);
                    }}
                  >
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">
                      {u.full_name?.[0] || 'U'}
                    </div>
                    {u.full_name || u.email}
                  </button>
                ))}
              </motion.div>
            )}
            <div className="flex gap-2">
              <Input 
                placeholder="Escreva um comentário... (@ para mencionar)" 
                value={newComment}
                onChange={(e) => {
                  setNewComment(e.target.value);
                  if (e.target.value.endsWith('@')) setShowMentions(true);
                  else if (!e.target.value.includes('@')) setShowMentions(false);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                className="h-11 rounded-xl bg-background border-muted-foreground/20"
              />
              <Button size="icon" onClick={handleAddComment} className="h-11 w-11 rounded-xl shadow-glow-sm">
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-[550px] h-[600px] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b bg-muted/10">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <History className="h-6 w-6 text-primary" />
              Linha do Tempo
            </DialogTitle>
            <CardDescription className="truncate">{selectedTask?.title}</CardDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-8 pr-6 scrollbar-thin">
            <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-muted/50">
              {activityLogs.map((log) => (
                <div key={log.id} className="relative pl-8">
                  <div className="absolute left-0 top-1 h-[24px] w-[24px] rounded-full bg-background border-2 border-primary shadow-sm flex items-center justify-center z-10">
                    <Activity className="h-3 w-3 text-primary" />
                  </div>
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-bold">{log.profiles?.full_name || 'Sistema'}</p>
                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
                      {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl border border-border/50">
                    <p className="font-medium text-foreground mb-1">
                      {log.action === 'task_insert' ? '✨ Criou a tarefa' : 
                       log.action === 'task_update' ? '📝 Atualizou a tarefa' : 
                       log.action === 'task_delete' ? '🗑️ Removeu a tarefa' : log.action}
                    </p>
                    {log.new_data && log.new_data.status && (
                      <p className="opacity-70">Novo status: <span className="font-bold">{log.new_data.status}</span></p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
