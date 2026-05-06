import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  skipPasswordCheck?: boolean;
  skipMfaCheck?: boolean;
  requireSuperadmin?: boolean;
}

const ProtectedRoute = ({ children, skipPasswordCheck, skipMfaCheck, requireSuperadmin }: Props) => {
  const {
    isAuthenticated,
    isLoading,
    profile,
    isMfaVerified,
    isMfaRequired,
    isSuperadmin,
    currentTenant,
    availableTenants,
  } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // MFA check — before anything else after auth
  if (
    !skipMfaCheck &&
    isMfaRequired &&
    !isMfaVerified &&
    location.pathname !== "/mfa-setup" &&
    location.pathname !== "/mfa-challenge"
  ) {
    // Check if user has enrolled — if not, send to setup; otherwise challenge
    return <Navigate to="/mfa-challenge" replace />;
  }

  if (!skipPasswordCheck && profile?.must_change_password && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  if (requireSuperadmin && !isSuperadmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Superadmin can access admin routes, but should also be able to access tenant routes for support
  if (!requireSuperadmin && isSuperadmin && !skipPasswordCheck && !skipMfaCheck) {
    // Se o superadmin estiver no meio de um fluxo de auth ou não estiver impersonando, 
    // e tentar acessar uma rota de tenant sem um tenant selecionado, vai para admin.
    if (!currentTenant && location.pathname !== "/select-tenant") {
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  if (
    !requireSuperadmin &&
    !isSuperadmin &&
    availableTenants.length > 1 &&
    !currentTenant &&
    location.pathname !== "/select-tenant"
  ) {
    return <Navigate to="/select-tenant" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
