import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthHashRouter from "@/components/AuthHashRouter";
import AppLayout from "@/layouts/AppLayout";
import AdminLayout from "@/layouts/AdminLayout";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import PortalTitular from "@/pages/PortalTitular";
import DemoDashboard from "@/pages/DemoDashboard";
import DemoDiagnostico from "@/pages/DemoDiagnostico";
import Dashboard from "@/pages/Dashboard";
import Diagnostico from "@/pages/Diagnostico";
import Solicitacoes from "@/pages/Solicitacoes";
import PortalDPO from "@/pages/PortalDPO";
import Mapeamento from "@/pages/Mapeamento";
import Documentos from "@/pages/Documentos";
import Consentimento from "@/pages/Consentimento";
import Auditoria from "@/pages/Auditoria";
import Incidentes from "@/pages/Incidentes";
import Fornecedores from "@/pages/Fornecedores";
import RelatoriosANPD from "@/pages/RelatoriosANPD";
import AvaliacaoExterna from "@/pages/AvaliacaoExterna";
import TenantSelectionPage from "@/pages/auth/TenantSelectionPage";
import ChangePasswordPage from "@/pages/auth/ChangePasswordPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import MfaSetupPage from "@/pages/auth/MfaSetupPage";
import MfaChallengePage from "@/pages/auth/MfaChallengePage";
import SuperAdminDashboard from "@/pages/admin/SuperAdminDashboard";
import TenantsListPage from "@/pages/admin/TenantsListPage";
import UsersListPage from "@/pages/admin/UsersListPage";
import AuditLogPage from "@/pages/admin/AuditLogPage";
import AdminSettingsPage from "@/pages/admin/AdminSettingsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AuthHashRouter />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/portal-titular" element={<PortalTitular />} />
            <Route path="/portal/:slug" element={<PortalTitular />} />
            <Route path="/demo/dashboard" element={<DemoDashboard />} />
            <Route path="/demo/diagnostico" element={<DemoDiagnostico />} />
            <Route path="/avaliacao-externa/:token" element={<AvaliacaoExterna />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Auth flow routes (protected, no sidebar) */}
            <Route path="/select-tenant" element={<ProtectedRoute skipPasswordCheck skipMfaCheck><TenantSelectionPage /></ProtectedRoute>} />
            <Route path="/change-password" element={<ProtectedRoute skipPasswordCheck skipMfaCheck><ChangePasswordPage /></ProtectedRoute>} />
            <Route path="/mfa-setup" element={<ProtectedRoute skipPasswordCheck skipMfaCheck><MfaSetupPage /></ProtectedRoute>} />
            <Route path="/mfa-challenge" element={<ProtectedRoute skipPasswordCheck skipMfaCheck><MfaChallengePage /></ProtectedRoute>} />

            {/* SuperAdmin routes */}
            <Route element={<ProtectedRoute requireSuperadmin><AdminLayout /></ProtectedRoute>}>
              <Route path="/admin/dashboard" element={<SuperAdminDashboard />} />
              <Route path="/admin/tenants" element={<TenantsListPage />} />
              <Route path="/admin/users" element={<UsersListPage />} />
              <Route path="/admin/audit" element={<AuditLogPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
            </Route>

            {/* Tenant routes with sidebar layout */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/diagnostico" element={<Diagnostico />} />
              <Route path="/solicitacoes" element={<Solicitacoes />} />
              <Route path="/dpo" element={<PortalDPO />} />
              <Route path="/mapeamento" element={<Mapeamento />} />
              <Route path="/documentos" element={<Documentos />} />
              <Route path="/consentimento" element={<Consentimento />} />
              <Route path="/auditoria" element={<Auditoria />} />
              <Route path="/incidentes" element={<Incidentes />} />
              <Route path="/fornecedores" element={<Fornecedores />} />
              <Route path="/relatorios-anpd" element={<RelatoriosANPD />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
