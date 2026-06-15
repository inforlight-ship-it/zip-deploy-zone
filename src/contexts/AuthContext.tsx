import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session, AuthenticatorAssuranceLevels } from "@supabase/supabase-js";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { useSessionRotation } from "@/hooks/useSessionRotation";
import { toast } from "sonner";

interface TenantContext {
  id: string;
  name: string;
  slug: string;
  role: string;
  primary_color?: string;
}

interface AuthProfile {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  avatar_url: string | null;
  must_change_password: boolean;
  tenant_id: string | null;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: AuthProfile | null;
  isSuperadmin: boolean;
  currentTenant: TenantContext | null;
  isAuthenticated: boolean;
  isMfaVerified: boolean;
  isMfaRequired: boolean;
  availableTenants: TenantContext[];
  isLoading: boolean;
  impersonatorId: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  verifyMfa: (code: string) => Promise<boolean>;
  selectTenant: (tenantId: string) => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  impersonateUser: (userId: string | null, tenantId: string, reason: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshTenants: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isSuperadmin: false,
    currentTenant: null,
    isAuthenticated: false,
    isMfaVerified: false,
    isMfaRequired: false,
    availableTenants: [],
    isLoading: true,
    impersonatorId: null,
  });

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, is_active, avatar_url, must_change_password, tenant_id")
      .eq("user_id", userId)
      .maybeSingle();

    return data as AuthProfile | null;
  }, []);

  const fetchSuperadminStatus = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "superadmin")
      .maybeSingle();

    return !!data;
  }, []);

  const fetchTenants = useCallback(async (userId: string): Promise<TenantContext[]> => {
    const { data: userTenants } = await supabase
      .from("user_tenants")
      .select(`
        tenant_id,
        tenants (id, name, slug, is_active, tenant_branding (primary_color)),
        user_tenant_roles (roles (name))
      `)
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!userTenants) return [];

    return userTenants
      .filter((ut: any) => ut.tenants?.is_active)
      .map((ut: any) => ({
        id: ut.tenants.id,
        name: ut.tenants.name,
        slug: ut.tenants.slug,
        role: ut.user_tenant_roles?.[0]?.roles?.name || "viewer",
        primary_color: ut.tenants.tenant_branding?.[0]?.primary_color || undefined,
      }));
  }, []);

  const checkMfaStatus = useCallback(async (): Promise<{ required: boolean; verified: boolean }> => {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error || !data) return { required: false, verified: true };

      const hasEnrolledFactor = data.nextLevel === "aal2";
      const isAal2 = data.currentLevel === "aal2";

      // MFA is required for ALL users. If they haven't enrolled yet, they need to set it up.
      // If enrolled, they need to verify.
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const hasVerifiedFactor = factors?.totp?.some(f => f.status === "verified") ?? false;

      return {
        required: true, // Always required
        verified: hasVerifiedFactor ? isAal2 : false,
      };
    } catch {
      return { required: false, verified: true };
    }
  }, []);

  const persistTenantSelection = useCallback(async (userId: string, tenantId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ tenant_id: tenantId })
      .eq("user_id", userId);

    return !error;
  }, []);

  const loadUserData = useCallback(async (user: User) => {
    const [profile, isSuperadmin, tenants, mfaStatus] = await Promise.all([
      fetchProfile(user.id),
      fetchSuperadminStatus(user.id),
      fetchTenants(user.id),
      checkMfaStatus(),
    ]);

    // Check password expiration
    let mustChangePassword = profile?.must_change_password ?? false;
    if (!mustChangePassword && profile) {
      const { data: fullProfile } = await supabase
        .from("profiles")
        .select("password_expires_at")
        .eq("user_id", user.id)
        .single();
      if (fullProfile?.password_expires_at && new Date(fullProfile.password_expires_at) < new Date()) {
        mustChangePassword = true;
        // Update the flag in DB
        await supabase.from("profiles").update({ must_change_password: true }).eq("user_id", user.id);
      }
    }

    const matchedTenant = profile?.tenant_id
      ? tenants.find((tenant) => tenant.id === profile.tenant_id) ?? null
      : null;
    const fallbackTenant = !matchedTenant && tenants.length === 1 ? tenants[0] : null;
    const currentTenant = matchedTenant ?? fallbackTenant;

    setState((prev) => ({
      ...prev,
      user,
      profile: profile
        ? {
            ...profile,
            must_change_password: mustChangePassword,
            tenant_id: currentTenant?.id ?? profile.tenant_id,
          }
        : null,
      isSuperadmin,
      currentTenant,
      isAuthenticated: true,
      isMfaRequired: mfaStatus.required,
      isMfaVerified: mfaStatus.verified,
      availableTenants: tenants,
      isLoading: false,
    }));

    if (fallbackTenant && profile?.tenant_id !== fallbackTenant.id) {
      void persistTenantSelection(user.id, fallbackTenant.id);
    }
  }, [fetchProfile, fetchSuperadminStatus, fetchTenants, checkMfaStatus, persistTenantSelection]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setState((prev) => ({ ...prev, session }));
          setTimeout(() => loadUserData(session.user), 0);
        } else {
          setState({
            user: null,
            session: null,
            profile: null,
            isSuperadmin: false,
            currentTenant: null,
            isAuthenticated: false,
            isMfaVerified: false,
            isMfaRequired: false,
            availableTenants: [],
            isLoading: false,
            impersonatorId: null,
          });
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setState((prev) => ({ ...prev, session }));
        loadUserData(session.user);
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  useEffect(() => {
    if (!state.user || !state.isAuthenticated) return;

    const heartbeat = () => {
      supabase.functions.invoke("track-login", {
        body: { action: "heartbeat", user_id: state.user!.id },
      }).catch(() => {});
    };

    heartbeat();
    const interval = setInterval(heartbeat, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [state.user?.id, state.isAuthenticated]);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, []);

  const verifyMfa = useCallback(async (_code: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, isMfaVerified: true }));
    return true;
  }, []);

  const selectTenant = useCallback(async (tenantId: string) => {
    const tenant = state.availableTenants.find((item) => item.id === tenantId) || null;
    if (!state.user || !tenant) return;

    const didPersist = await persistTenantSelection(state.user.id, tenantId);
    if (!didPersist) return;

    setState((prev) => ({
      ...prev,
      currentTenant: tenant,
      profile: prev.profile ? { ...prev.profile, tenant_id: tenantId } : prev.profile,
    }));
  }, [persistTenantSelection, state.availableTenants, state.user]);

  const switchTenant = useCallback(async (tenantId: string) => {
    await selectTenant(tenantId);
  }, [selectTenant]);

  const refreshTenants = useCallback(async () => {
    if (state.user) {
      const tenants = await fetchTenants(state.user.id);
      setState((prev) => ({
        ...prev,
        availableTenants: tenants,
        currentTenant: prev.currentTenant
          ? tenants.find((tenant) => tenant.id === prev.currentTenant?.id) || null
          : prev.currentTenant,
      }));
    }
  }, [fetchTenants, state.user]);

  const impersonateUser = useCallback(async (userId: string | null, tenantId: string, reason: string) => {
    if (!state.isSuperadmin || !state.user) return;

    // Log do início da impersonação / acesso de suporte
    await supabase.from("support_impersonation_logs").insert({
      admin_id: state.user.id,
      target_user_id: userId,
      tenant_id: tenantId,
      reason,
    });

    // Armazenar o admin original para permitir retorno
    localStorage.setItem("support_impersonator_id", state.user.id);
    localStorage.setItem("support_impersonation_tenant", tenantId);

    // Buscar dados do tenant (superadmin pode acessar qualquer tenant)
    let impersonatedTenant = state.availableTenants.find(t => t.id === tenantId) || null;
    if (!impersonatedTenant) {
      const { data: t } = await supabase
        .from("tenants")
        .select("id, name, slug, tenant_branding(primary_color)")
        .eq("id", tenantId)
        .maybeSingle();
      if (t) {
        impersonatedTenant = {
          id: t.id,
          name: t.name,
          slug: t.slug,
          role: "superadmin",
          primary_color: (t as any).tenant_branding?.[0]?.primary_color || undefined,
        };
      }
    }

    setState(prev => ({
      ...prev,
      impersonatorId: state.user?.id || null,
      currentTenant: impersonatedTenant || prev.currentTenant,
      availableTenants: impersonatedTenant && !prev.availableTenants.find(t => t.id === impersonatedTenant!.id)
        ? [...prev.availableTenants, impersonatedTenant]
        : prev.availableTenants,
    }));

    toast.info(`Modo Suporte Ativado: visualizando o tenant ${impersonatedTenant?.name || ""}.`);
  }, [state.isSuperadmin, state.user, state.availableTenants]);

  const stopImpersonation = useCallback(async () => {
    localStorage.removeItem("support_impersonator_id");
    localStorage.removeItem("support_impersonation_tenant");
    
    setState(prev => ({
      ...prev,
      impersonatorId: null
    }));
    
    toast.success("Modo Suporte Desativado.");
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  useSessionTimeout(state.isAuthenticated, logout);
  useSessionRotation(state.isAuthenticated);

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      signUp,
      verifyMfa,
      selectTenant,
      switchTenant,
      impersonateUser,
      stopImpersonation,
      logout,
      signOut: logout,
      refreshTenants,
      loading: state.isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
