-- 1. Aplicar search_path em funções críticas para segurança (Fix Linter 0011)
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = public;
ALTER FUNCTION public.get_user_tenant_id(uuid) SET search_path = public;
ALTER FUNCTION public.is_tenant_member(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.has_tenant_role(uuid, uuid, public.app_role) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 2. Garantir isolamento de Tenant em todas as tabelas de auditoria e segurança
ALTER TABLE public.security_audits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view security audits of their tenant" ON public.security_audits;
CREATE POLICY "Users can view security audits of their tenant" 
ON public.security_audits 
FOR SELECT 
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE user_id = auth.uid()));

ALTER TABLE public.audit_controls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view audit controls of their tenant" ON public.audit_controls;
CREATE POLICY "Users can view audit controls of their tenant" 
ON public.audit_controls 
FOR SELECT 
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE user_id = auth.uid()));

-- 3. Restringir visibilidade de perfis
-- Usuários só devem ver o próprio perfil ou perfis de membros do mesmo Tenant
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by self or same tenant members"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id 
  OR 
  tenant_id IN (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())
  OR
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
);

-- 4. Otimização de Índices para performance de RLS
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
