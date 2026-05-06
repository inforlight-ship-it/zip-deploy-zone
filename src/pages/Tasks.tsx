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
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

export default function Tasks() {
  const { user, currentTenant } = useAuth();
  const { toast } = useToast();
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
      toast({ title: "Erro ao carregar tarefas", description: error.message, variant: "destructive" });
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
          toast({ title: "Tarefa Atualizada", description: "Uma tarefa atribuída a você foi modificada." });
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_comments' }, (payload) => {
        if (selectedTask && payload.new.task_id === selectedTask.id) {
          fetchComments(selectedTask.id);
        }
        // Notification for mention (simulated check)
        if (payload.new.content.includes(`@${user?.id}`) || payload.new.content.includes(`@${user?.email}`)) {
          toast({ title: "Nova Menção", description: "Você foi mencionado em um comentário." });
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'invitations' }, (payload) => {
        if (payload.new.email === user?.email) {
          toast({ title: "Novo Convite", description: "Você recebeu um novo convite para um Tenant." });
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
        toast({ title: "Erro ao atualizar tarefa", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Tarefa atualizada com sucesso" });
        setIsCreateDialogOpen(false);
        // Trigger AI analysis for updated task
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
        toast({ title: "Erro ao criar tarefa", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Tarefa criada com sucesso" });
        setIsCreateDialogOpen(false);
        // Trigger AI analysis for new task
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
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tarefa excluída" });
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
      toast({ title: "Erro", description: error.message, variant: "destructive" });
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
          <h1 className="text-3xl font-bold tracking-tight">Tarefas Inteligentes</h1>
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

      {/* AI Insights Bar */}
      {filteredTasks.some(t => t.ai_priority_score && t.ai_priority_score > 70) && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center gap-4"
        >
          <div className="bg-primary/20 p-2 rounded-full text-primary">
            <Brain className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-primary">Sugestão da IA para hoje</p>
            <p className="text-xs text-muted-foreground">
              Detectamos {filteredTasks.filter(t => t.ai_priority_score && t.ai_priority_score > 70).length} tarefas críticas que precisam de atenção imediata baseado em prazos e impacto.
            </p>
          </div>
          <Button size="sm" variant="outline" className="text-xs">Ver Recomendações</Button>
        </motion.div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar tarefas..." 
            className="pl-10" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card className="border-dashed py-20">
          <CardContent className="flex flex-center flex-col items-center justify-center text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <ListTodo className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="max-w-[400px]">
              <h3 className="text-lg font-medium">Nenhuma tarefa encontrada</h3>
              <p className="text-sm text-muted-foreground">
                Comece criando uma nova tarefa para organizar o fluxo de trabalho do seu tenant.
              </p>
            </div>
            <Button variant="outline" onClick={openCreateDialog}>Criar primeira tarefa</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task) => (
            <motion.div
              key={task.id}
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
                        onClick={() => toggleTaskStatus(task)}
                        title={task.status === 'concluida' ? "Marcar como pendente" : "Marcar como concluída"}
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
                          <DropdownMenuItem onClick={() => openEditDialog(task)}>
                            <Edit2 className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openCollab(task)}>
                            <MessageSquare className="mr-2 h-4 w-4" /> Comentários
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openHistory(task)}>
                            <History className="mr-2 h-4 w-4" /> Histórico
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeleteTask(task.id)}
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
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título</Label>
              <Input 
                id="title" 
                placeholder="Ex: Revisar política de privacidade" 
                value={currentTask.title}
                onChange={(e) => setCurrentTask({...currentTask, title: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea 
                id="description" 
                placeholder="Detalhes sobre o que precisa ser feito..." 
                rows={3}
                value={currentTask.description || ""}
                onChange={(e) => setCurrentTask({...currentTask, description: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select 
                  value={currentTask.priority} 
                  onValueChange={(val) => setCurrentTask({...currentTask, priority: val})}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={currentTask.status} 
                  onValueChange={(val) => setCurrentTask({...currentTask, status: val})}
                >
                  <SelectTrigger id="status">
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
                <Label htmlFor="due_date">Data de Vencimento</Label>
                <Input 
                  id="due_date" 
                  type="date" 
                  value={currentTask.due_date || ""}
                  onChange={(e) => setCurrentTask({...currentTask, due_date: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assigned_to">Atribuído a</Label>
                <Select 
                  value={currentTask.assigned_to || "none"} 
                  onValueChange={(val) => setCurrentTask({...currentTask, assigned_to: val === "none" ? null : val})}
                >
                  <SelectTrigger id="assigned_to">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveTask}>Salvar Tarefa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    {/* Collaboration Dialog */}
    <Dialog open={isCollabOpen} onOpenChange={setIsCollabOpen}>
        <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Comentários: {selectedTask?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
            {comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">Nenhum comentário ainda.</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className={`flex flex-col ${comment.user_id === user?.id ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 ${comment.user_id === user?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <p className="text-xs font-bold mb-1">{comment.profiles?.full_name || 'Usuário'}</p>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1">
                    {format(new Date(comment.created_at), "HH:mm")}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="pt-4 border-t space-y-2">
            {showMentions && (
              <div className="bg-background border rounded-md shadow-lg p-2 max-h-32 overflow-y-auto">
                <p className="text-[10px] text-muted-foreground mb-1 uppercase font-bold px-2">Mencionar usuário</p>
                {tenantUsers.map(u => (
                  <button
                    key={u.id}
                    className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted rounded-sm transition-colors"
                    onClick={() => {
                      setNewComment(prev => prev.split('@')[0] + `@${u.full_name || u.email} `);
                      setShowMentions(false);
                    }}
                  >
                    {u.full_name || u.email}
                  </button>
                ))}
              </div>
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
              />
              <Button size="icon" onClick={handleAddComment}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-[550px] h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Histórico de Auditoria: {selectedTask?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            {activityLogs.map((log) => (
              <div key={log.id} className="relative pl-6 border-l-2 border-muted pb-4">
                <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-background border-2 border-primary" />
                <div className="flex justify-between items-start mb-1">
                  <p className="text-sm font-semibold">{log.profiles?.full_name || 'Sistema'}</p>
                  <span className="text-[10px] text-muted-foreground italic">
                    {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                  {log.action === 'task_insert' ? 'Criou a tarefa' : 
                   log.action === 'task_update' ? 'Atualizou a tarefa' : 
                   log.action === 'task_delete' ? 'Removeu a tarefa' : log.action}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}