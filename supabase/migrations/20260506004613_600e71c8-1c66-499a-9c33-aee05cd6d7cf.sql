-- 1. Revogar execução pública baseada nos tipos corretos identificados
-- has_role(_user_id uuid, _role app_role)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- get_user_tenant_id(_user_id uuid)
REVOKE EXECUTE ON FUNCTION public.get_user_tenant_id(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id(uuid) TO authenticated;

-- is_tenant_member(_user_id uuid, _tenant_id uuid)
REVOKE EXECUTE ON FUNCTION public.is_tenant_member(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_tenant_member(uuid, uuid) TO authenticated;

-- has_tenant_role(_user_id uuid, _tenant_id uuid, _role app_role)
REVOKE EXECUTE ON FUNCTION public.has_tenant_role(uuid, uuid, public.app_role) FROM public;
GRANT EXECUTE ON FUNCTION public.has_tenant_role(uuid, uuid, public.app_role) TO authenticated;

-- 2. Garantir RLS em tabelas que possam conter dados sensíveis
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view audit logs of their tenant" ON public.audit_logs;
CREATE POLICY "Users can view audit logs of their tenant" 
ON public.audit_logs 
FOR SELECT 
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE user_id = auth.uid()));

-- 3. Corrigir trigger de perfil para ser mais resiliente
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, is_active)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', true)
  ON CONFLICT (user_id) DO UPDATE 
  SET email = EXCLUDED.email, 
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
