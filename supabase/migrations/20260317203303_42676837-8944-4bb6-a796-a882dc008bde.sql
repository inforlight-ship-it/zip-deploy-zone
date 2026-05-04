
-- Fix tenants RLS: allow superadmins to manage tenants
DROP POLICY IF EXISTS "Admins can manage tenants" ON public.tenants;
CREATE POLICY "Superadmins can manage tenants"
  ON public.tenants FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Fix user_roles RLS: allow superadmins to manage roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Superadmins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Allow superadmins to view all profiles
CREATE POLICY "Superadmins view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Allow superadmins to manage user_tenants
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage user_tenants"
  ON public.user_tenants FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Users view own tenants"
  ON public.user_tenants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow superadmins to manage user_tenant_roles
ALTER TABLE public.user_tenant_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage user_tenant_roles"
  ON public.user_tenant_roles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Users view own tenant roles"
  ON public.user_tenant_roles FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_tenants ut WHERE ut.id = user_tenant_roles.user_tenant_id AND ut.user_id = auth.uid()
  ));
