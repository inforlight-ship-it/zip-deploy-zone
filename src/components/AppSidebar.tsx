import {
  LayoutDashboard, ClipboardCheck, Database, FileText, Cookie,
  UserCog, ShieldCheck, AlertTriangle, Building2, LogOut, Shield, FileBarChart,
  ChevronsUpDown, Check, ListTodo
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mainItems = [
  { title: "Painel Geral", url: "/dashboard", icon: LayoutDashboard },
  { title: "Maturidade LGPD", url: "/diagnostico", icon: ClipboardCheck },
  { title: "Mapeamento de Dados", url: "/mapeamento", icon: Database },
  { title: "Documentos", url: "/documentos", icon: FileText },
  { title: "Tarefas", url: "/tarefas", icon: ListTodo },
];

const complianceItems = [
  { title: "Consentimento & Cookies", url: "/consentimento", icon: Cookie },
  { title: "Portal do DPO", url: "/dpo", icon: UserCog },
  { title: "Auditoria de Segurança", url: "/auditoria", icon: ShieldCheck },
  { title: "Incidentes", url: "/incidentes", icon: AlertTriangle },
  { title: "Avaliação de Fornecedores", url: "/fornecedores", icon: Building2 },
  { title: "Relatórios ANPD", url: "/relatorios-anpd", icon: FileBarChart },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, currentTenant, availableTenants, switchTenant, isSuperadmin } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleSwitchTenant = async (tenantId: string) => {
    await switchTenant(tenantId);
    navigate("/dashboard");
  };

  const renderItems = (items: typeof mainItems) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild isActive={isActive(item.url)}>
            <NavLink
              to={item.url}
              end
              className="hover:bg-sidebar-accent/50 transition-colors"
              activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-sidebar-border/50">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary shadow-glow-sm">
            <Shield className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-display text-sm font-bold text-sidebar-foreground">
              Adequa<span className="text-sidebar-primary">Fácil</span>
            </span>
          )}
        </div>

        {/* Tenant Switcher */}
        {availableTenants.length > 0 && (
          <div className="px-3 py-2 border-b border-sidebar-border/50">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-sidebar-accent/50 transition-colors">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10"
                    style={currentTenant?.primary_color ? { backgroundColor: currentTenant.primary_color + '20' } : {}}
                  >
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                  </div>
                  {!collapsed && (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-sidebar-foreground truncate">
                          {currentTenant?.name || "Selecionar empresa"}
                        </p>
                        <p className="text-[10px] text-sidebar-foreground/40 truncate">
                          {currentTenant?.role || ""}
                        </p>
                      </div>
                      <ChevronsUpDown className="h-3.5 w-3.5 text-sidebar-foreground/40 shrink-0" />
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Alternar empresa</p>
                </div>
                <DropdownMenuSeparator />
                {availableTenants.map((tenant) => (
                  <DropdownMenuItem
                    key={tenant.id}
                    onClick={() => void handleSwitchTenant(tenant.id)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm">{tenant.name}</span>
                    {currentTenant?.id === tenant.id && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
                {isSuperadmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => navigate("/admin/dashboard")}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm font-medium">Painel Global</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest">Principal</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(mainItems)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest">Conformidade</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(complianceItems)}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-3">
        {user && !collapsed && (
          <div className="mb-2 truncate text-xs text-sidebar-foreground/40">
            {user.email}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
