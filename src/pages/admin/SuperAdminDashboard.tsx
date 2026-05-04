import {
  Building2, Users, ShieldCheck, ScrollText, Activity,
  TrendingUp, Boxes, Clock, UserPlus,
} from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AnomalyMonitorPanel from "@/components/admin/AnomalyMonitorPanel";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(262, 83%, 58%)",
];

const SuperAdminDashboard = () => {
  const { data: tenants = [] } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: async () => {
      const { data } = await supabase.from("tenants").select("*, subscription_plans(name)");
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data || [];
    },
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["admin-audit-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const { data: modules = [] } = useQuery({
    queryKey: ["admin-modules"],
    queryFn: async () => {
      const { data } = await supabase.from("tenant_modules").select("*");
      return data || [];
    },
  });

  const activeTenants = tenants.filter((t: any) => t.is_active).length;
  const activeUsers = profiles.filter((u: any) => u.is_active).length;
  const enabledModules = modules.filter((m: any) => m.is_enabled).length;

  const planDistribution = (() => {
    const counts: Record<string, number> = {};
    tenants.forEach((t: any) => {
      const plan = (t as any).subscription_plans?.name || "Sem plano";
      counts[plan] = (counts[plan] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const { data: recentUsers = [] } = useQuery({
    queryKey: ["admin-recent-users"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, created_at, is_active")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium text-primary uppercase tracking-wide">Superadmin</span>
        </div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard Global</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Visão geral da plataforma AdequaFácil</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Tenants Ativos" value={activeTenants} description={`${tenants.length} total`} icon={Building2}
          trend={tenants.length > 0 ? { value: `${Math.round((activeTenants / tenants.length) * 100)}% ativos`, positive: true } : undefined} />
        <StatCard label="Usuários" value={activeUsers} description={`${profiles.length} registrados`} icon={Users}
          trend={profiles.length > 0 ? { value: `${Math.round((activeUsers / profiles.length) * 100)}% ativos`, positive: true } : undefined} />
        <StatCard label="Logs de Auditoria" value={auditLogs.length} description="Recentes" icon={Activity} />
        <StatCard label="Módulos Ativos" value={enabledModules} description={`${modules.length} total`} icon={Boxes} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="rounded-md border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-card-foreground">Tenants por Plano</h2>
          </div>
          {planDistribution.length > 0 ? (
            <div className="h-56 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={planDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                    {planDistribution.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Nenhum tenant cadastrado</p>
            </div>
          )}
          <div className="flex flex-wrap gap-3 mt-2">
            {planDistribution.map((item, i) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="text-xs text-muted-foreground">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-card-foreground">Usuários Recentes</h2>
            </div>
            <a href="/admin/users" className="text-xs text-primary hover:underline">Ver todos</a>
          </div>
          <div className="divide-y divide-border">
            {recentUsers.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum usuário registrado.</p>
              </div>
            ) : (
              recentUsers.map((user: any) => (
                <div key={user.id} className="flex items-center gap-3 px-5 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
                    {user.full_name?.charAt(0) || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-card-foreground truncate">{user.full_name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <div className={`h-2 w-2 rounded-full ${user.is_active ? "bg-green-500" : "bg-muted"}`} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-md border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-card-foreground">Atividade Recente</h2>
            </div>
            <a href="/admin/audit" className="text-xs text-primary hover:underline">Ver todos</a>
          </div>
          <div className="divide-y divide-border">
            {auditLogs.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <ScrollText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
              </div>
            ) : (
              auditLogs.slice(0, 6).map((log: any) => (
                <div key={log.id} className="flex items-center gap-3 px-5 py-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-secondary">
                    <ScrollText className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-card-foreground font-medium">{log.action}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Anomaly Monitor */}
      <AnomalyMonitorPanel />
    </motion.div>
  );
};

export default SuperAdminDashboard;
