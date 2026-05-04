import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Plus, Search, CheckCircle2, XCircle, Pencil, Trash2, UserX, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import InviteUserDialog from "@/components/admin/InviteUserDialog";
import EditUserDialog from "@/components/admin/EditUserDialog";

const UsersListPage = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [showInvite, setShowInvite] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [profilesResult, userRolesResult, userTenantsResult] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("user_tenants").select("id, user_id, tenant_id, tenants(name), user_tenant_roles(id, role_id, roles(id, name))"),
      ]);
      if (profilesResult.error) throw profilesResult.error;
      const rolesByUserId = (userRolesResult.data || []).reduce<Record<string, Array<{ role: string }>>>((acc, item: any) => {
        if (!acc[item.user_id]) acc[item.user_id] = [];
        acc[item.user_id].push({ role: item.role });
        return acc;
      }, {});
      const tenantsByUserId = (userTenantsResult.data || []).reduce<Record<string, any[]>>((acc, item: any) => {
        if (!acc[item.user_id]) acc[item.user_id] = [];
        acc[item.user_id].push(item);
        return acc;
      }, {});
      return (profilesResult.data || []).map((profile: any) => ({
        ...profile,
        user_roles: rolesByUserId[profile.user_id] || [],
        user_tenants: tenantsByUserId[profile.user_id] || [],
      }));
    },
  });

  const callUserAction = async (userId: string, action: "delete" | "deactivate" | "activate") => {
    const { data, error } = await supabase.functions.invoke("delete-user", {
      body: { user_id: userId, action },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setIsProcessing(true);
    try {
      await callUserAction(deletingUser.user_id, "delete");
      toast({ title: "Usuário excluído permanentemente!" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDeletingUser(null);
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleActive = async () => {
    if (!deactivatingUser) return;
    setIsProcessing(true);
    const action = deactivatingUser.is_active ? "deactivate" : "activate";
    try {
      await callUserAction(deactivatingUser.user_id, action);
      toast({ title: action === "deactivate" ? "Usuário inativado!" : "Usuário reativado!" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDeactivatingUser(null);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const filtered = useMemo(() => {
    return profiles.filter((u: any) => {
      const matchesSearch =
        (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && u.is_active) ||
        (statusFilter === "inactive" && !u.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [profiles, search, statusFilter]);

  const activeCount = profiles.filter((u: any) => u.is_active).length;
  const inactiveCount = profiles.filter((u: any) => !u.is_active).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestão global de usuários da plataforma</p>
        </div>
        <Button onClick={() => setShowInvite(true)} className="h-9 text-sm gap-1.5">
          <Plus className="h-4 w-4" /> Convidar Usuário
        </Button>
      </div>

      <div className="rounded-md border border-border bg-card shadow-sm">
        <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-secondary/50 p-0.5">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${statusFilter === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Todos ({profiles.length})
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${statusFilter === "active" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Ativos ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter("inactive")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${statusFilter === "inactive" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Inativos ({inactiveCount})
            </button>
          </div>
          <div className="relative max-w-sm sm:ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar usuário..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 pl-9 text-sm" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Usuário</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Global</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Tenants</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((user: any) => {
                const isSuperadmin = user.user_roles?.some((r: any) => r.role === "superadmin");
                return (
                  <tr key={user.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-card-foreground">{user.full_name || "Sem nome"}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {isSuperadmin && <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">Superadmin</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {!user.user_tenants?.length ? (
                          <span className="text-xs text-muted-foreground">Nenhum</span>
                        ) : user.user_tenants.map((ut: any) => (
                          <Badge key={ut.tenant_id} variant="outline" className="text-[10px]">
                            {ut.tenants?.name || "—"}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                          <XCircle className="h-3.5 w-3.5" /> Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => setEditingUserId(user.id)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {!isSuperadmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title={user.is_active ? "Inativar" : "Reativar"}
                              onClick={() => setDeactivatingUser(user)}
                            >
                              {user.is_active ? <UserX className="h-3.5 w-3.5 text-amber-500" /> : <UserCheck className="h-3.5 w-3.5 text-green-500" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              title="Excluir permanentemente"
                              onClick={() => setDeletingUser(user)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
          </div>
        )}
      </div>

      <InviteUserDialog open={showInvite} onOpenChange={setShowInvite} />
      <EditUserDialog open={!!editingUserId} onOpenChange={(v) => { if (!v) setEditingUserId(null); }} user={profiles.find((p: any) => p.id === editingUserId) || null} />

      {/* Inativar / Reativar */}
      <AlertDialog open={!!deactivatingUser} onOpenChange={(v) => { if (!v) setDeactivatingUser(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deactivatingUser?.is_active ? "Inativar usuário" : "Reativar usuário"}</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivatingUser?.is_active
                ? <>Tem certeza que deseja inativar <strong>{deactivatingUser?.full_name || deactivatingUser?.email}</strong>? O usuário não conseguirá acessar a plataforma.</>
                : <>Deseja reativar <strong>{deactivatingUser?.full_name || deactivatingUser?.email}</strong>? O acesso será restaurado.</>
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleActive} disabled={isProcessing} className={deactivatingUser?.is_active ? "bg-amber-600 hover:bg-amber-700" : ""}>
              {isProcessing ? "Processando..." : deactivatingUser?.is_active ? "Inativar" : "Reativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Excluir permanentemente */}
      <AlertDialog open={!!deletingUser} onOpenChange={(v) => { if (!v) setDeletingUser(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário permanentemente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deletingUser?.full_name || deletingUser?.email}</strong>? Esta ação é <strong>irreversível</strong>. O usuário será removido completamente da plataforma, incluindo autenticação, perfil e todos os vínculos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={isProcessing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isProcessing ? "Excluindo..." : "Excluir permanentemente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default UsersListPage;
