import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Building2, ChevronRight, ShieldCheck, User } from "lucide-react";
import { motion } from "framer-motion";

const roleLabels: Record<string, string> = {
  superadmin: "Superadmin",
  tenant_admin: "Administrador",
  manager: "Gerente",
  analyst: "Analista",
  viewer: "Visualizador",
};

const TenantSelectionPage = () => {
  const { profile, isAuthenticated, isSuperadmin, availableTenants, selectTenant } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth");
    }
  }, [isAuthenticated, navigate]);

  const handleSelectTenant = async (tenantId: string) => {
    await selectTenant(tenantId);
    navigate("/dashboard");
  };

  const handleSuperAdmin = () => {
    navigate("/admin/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-foreground">
            Adequa<span className="text-primary">Fácil</span>
          </span>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            Olá, {profile?.full_name?.split(" ")[0] || "Usuário"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Selecione a empresa para continuar.
          </p>
        </div>

        <div className="space-y-2">
          {isSuperadmin && (
            <motion.button
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
              onClick={handleSuperAdmin}
              className="w-full flex items-center gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-3.5 text-left transition-all hover:bg-primary/10 hover:border-primary/50 group"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary">
                <ShieldCheck className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Painel Global</p>
                <p className="text-xs text-primary">Superadmin</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </motion.button>
          )}

          {availableTenants.map((tenant, i) => (
            <motion.button
              key={tenant.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * (i + 1) }}
              onClick={() => void handleSelectTenant(tenant.id)}
              className="w-full flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3.5 text-left transition-all hover:bg-secondary hover:border-primary/30 group"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary"
                style={tenant.primary_color ? { backgroundColor: tenant.primary_color } : {}}
              >
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{tenant.name}</p>
                <p className="text-xs text-muted-foreground">{roleLabels[tenant.role] || tenant.role}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </motion.button>
          ))}

          {!isSuperadmin && availableTenants.length === 0 && (
            <div className="text-center py-8">
              <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Você ainda não está vinculado a nenhuma empresa.</p>
              <p className="text-xs text-muted-foreground mt-1">Solicite ao administrador que adicione você.</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <User className="h-3.5 w-3.5" />
            Meu Perfil
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Exibindo apenas as empresas às quais você tem acesso.
        </p>
      </motion.div>
    </div>
  );
};

export default TenantSelectionPage;
