import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertCircle, BarChart3, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function TenantAnalytics() {
  const { currentTenant } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["tenant-analytics", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return null;
      const { data, error } = await supabase
        .from("tenant_task_analytics")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentTenant,
  });

  if (isLoading) return <div className="animate-pulse h-32 bg-muted rounded-xl" />;

  const completionRate = stats?.total_tasks > 0 
    ? Math.round((stats.completed_tasks / stats.total_tasks) * 100) 
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completionRate}%</div>
          <p className="text-xs text-muted-foreground">Total de {stats?.total_tasks || 0} tarefas</p>
        </CardContent>
      </Card>
      
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.completed_tasks || 0}</div>
          <p className="text-xs text-muted-foreground">Tarefas finalizadas</p>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
          <Clock className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.pending_tasks || 0}</div>
          <p className="text-xs text-muted-foreground">Aguardando execução</p>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
          <BarChart3 className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats?.avg_completion_time ? `${Math.round(stats.avg_completion_time / 3600)}h` : "—"}
          </div>
          <p className="text-xs text-muted-foreground">Média de encerramento</p>
        </CardContent>
      </Card>
    </div>
  );
}
