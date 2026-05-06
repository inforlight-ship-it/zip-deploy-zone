import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Power, PowerOff, Pencil, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { logAudit } from "@/lib/audit";
import EditTenantDialog from "./EditTenantDialog";

interface Props {
  tenant: { id: string; name: string; slug: string; is_active: boolean; max_users: number; plan_id: string | null };
}

const TenantActionsMenu = ({ tenant }: Props) => {
  const [showEdit, setShowEdit] = useState(false);
  const queryClient = useQueryClient();
  const { impersonateUser } = useAuth();

  const handleImpersonate = async () => {
    // Buscar um usuário administrativo desse tenant para impersonar
    const { data: users } = await supabase
      .from("user_tenants")
      .select("user_id")
      .eq("tenant_id", tenant.id)
      .limit(1);
    
    if (users && users.length > 0) {
      await impersonateUser(users[0].user_id, tenant.id, "Suporte técnico via Super Admin");
      window.location.href = "/dashboard";
    } else {
      toast.error("Não há usuários disponíveis para suporte neste tenant.");
    }
  };

  const toggleActive = async () => {
    const { error } = await supabase.from("tenants").update({ is_active: !tenant.is_active }).eq("id", tenant.id);
    if (error) {
      toast.error("Erro ao atualizar: " + error.message);
    } else {
      await logAudit({ action: tenant.is_active ? "tenant.deactivated" : "tenant.activated", resourceType: "tenant", resourceId: tenant.id, details: { name: tenant.name } });
      toast.success(`Tenant ${tenant.is_active ? "desativado" : "ativado"} com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded p-1 text-muted-foreground hover:bg-secondary transition-colors"><MoreHorizontal className="h-4 w-4" /></button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setShowEdit(true)} className="gap-2 text-sm"><Pencil className="h-3.5 w-3.5" /> Editar</DropdownMenuItem>
          <DropdownMenuItem onClick={handleImpersonate} className="gap-2 text-sm text-primary font-medium"><UserCog className="h-3.5 w-3.5" /> Suporte (Entrar)</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={toggleActive} className="gap-2 text-sm">
            {tenant.is_active ? (<><PowerOff className="h-3.5 w-3.5" /> Desativar</>) : (<><Power className="h-3.5 w-3.5" /> Ativar</>)}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditTenantDialog open={showEdit} onOpenChange={setShowEdit} tenant={tenant} />
    </>
  );
};

export default TenantActionsMenu;
