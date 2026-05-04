import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Power, PowerOff, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import EditTenantDialog from "./EditTenantDialog";

interface Props {
  tenant: { id: string; name: string; slug: string; is_active: boolean; max_users: number; plan_id: string | null };
}

const TenantActionsMenu = ({ tenant }: Props) => {
  const [showEdit, setShowEdit] = useState(false);
  const queryClient = useQueryClient();

  const toggleActive = async () => {
    const { error } = await supabase.from("tenants").update({ is_active: !tenant.is_active }).eq("id", tenant.id);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } else {
      await logAudit({ action: tenant.is_active ? "tenant.deactivated" : "tenant.activated", resourceType: "tenant", resourceId: tenant.id, details: { name: tenant.name } });
      toast({ title: `Tenant ${tenant.is_active ? "desativado" : "ativado"} com sucesso.` });
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
