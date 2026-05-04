
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  max_users integer NOT NULL DEFAULT 5,
  max_modules integer NOT NULL DEFAULT 3,
  price_monthly numeric(10,2),
  features jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins can manage plans" ON public.subscription_plans FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans FOR SELECT TO authenticated USING (is_active = true);

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_users integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.subscription_plans(id),
  ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT (now() + interval '30 days'),
  ADD COLUMN IF NOT EXISTS is_trial boolean NOT NULL DEFAULT true;

UPDATE public.tenants SET slug = lower(replace(replace(name, ' ', '-'), '.', '')) WHERE slug IS NULL;
ALTER TABLE public.tenants ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_slug_unique UNIQUE (slug);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS password_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS mfa_enforced boolean NOT NULL DEFAULT false;

CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name public.app_role NOT NULL UNIQUE,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Superadmins manage roles" ON public.roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));
INSERT INTO public.roles (name, description, is_system) VALUES
  ('superadmin','Administrador global da plataforma',true),
  ('tenant_admin','Administrador do tenant',true),
  ('manager','Gerente com acesso amplo',true),
  ('analyst','Analista com acesso de leitura e edição',true),
  ('viewer','Visualizador com acesso somente leitura',true),
  ('dpo','Encarregado de Proteção de Dados',true),
  ('admin','Administrador do sistema',true);

CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource text NOT NULL, action text NOT NULL, description text,
  UNIQUE(resource, action)
);
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view permissions" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Superadmins manage permissions" ON public.permissions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));

CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission_id)
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Superadmins manage role_permissions" ON public.role_permissions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));

CREATE TABLE public.user_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  joined_at timestamptz NOT NULL DEFAULT now(),
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own memberships" ON public.user_tenants FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Superadmins manage all memberships" ON public.user_tenants FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));

CREATE TABLE public.user_tenant_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_tenant_id uuid NOT NULL REFERENCES public.user_tenants(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_tenant_id, role_id)
);
ALTER TABLE public.user_tenant_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tenant roles" ON public.user_tenant_roles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_tenants ut WHERE ut.id = user_tenant_roles.user_tenant_id AND ut.user_id = auth.uid())
);
CREATE POLICY "Superadmins manage tenant roles" ON public.user_tenant_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));

CREATE TABLE public.mfa_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  method public.mfa_method NOT NULL DEFAULT 'totp',
  totp_secret_encrypted text,
  backup_codes_hash text[],
  is_verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mfa_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own MFA" ON public.mfa_settings FOR ALL TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.password_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  password_hash text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own password history" ON public.password_history FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address inet, user_agent text,
  success boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins view login attempts" ON public.login_attempts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));

CREATE TABLE public.active_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ip_address inet, user_agent text, device_info text,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  is_revoked boolean NOT NULL DEFAULT false,
  revoked_at timestamptz
);
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sessions" ON public.active_sessions FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Superadmins view all sessions" ON public.active_sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));

CREATE TABLE public.tenant_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  platform_name text, logo_url text, favicon_url text,
  primary_color text, secondary_color text, login_bg_image_url text,
  footer_text text, custom_css text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tenant_branding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members view branding" ON public.tenant_branding FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_tenants ut WHERE ut.tenant_id = tenant_branding.tenant_id AND ut.user_id = auth.uid() AND ut.is_active = true)
);
CREATE POLICY "Superadmins manage branding" ON public.tenant_branding FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));

CREATE TABLE public.tenant_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_name text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  enabled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, module_name)
);
ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members view modules" ON public.tenant_modules FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_tenants ut WHERE ut.tenant_id = tenant_modules.tenant_id AND ut.user_id = auth.uid() AND ut.is_active = true)
);
CREATE POLICY "Superadmins manage modules" ON public.tenant_modules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));

CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role_id uuid NOT NULL REFERENCES public.roles(id),
  token_hash text NOT NULL,
  invited_by uuid NOT NULL,
  status public.invitation_status NOT NULL DEFAULT 'pending',
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins manage invitations" ON public.invitations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));

CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL UNIQUE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins manage settings" ON public.platform_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Authenticated view settings" ON public.platform_settings FOR SELECT TO authenticated USING (true);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, tenant_id uuid REFERENCES public.tenants(id),
  action text NOT NULL, resource_type text, resource_id text,
  details jsonb, ip_address inet, user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins view all audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Tenant members view tenant logs" ON public.audit_logs FOR SELECT TO authenticated USING (
  tenant_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.user_tenants ut WHERE ut.tenant_id = audit_logs.tenant_id AND ut.user_id = auth.uid() AND ut.is_active = true)
);

CREATE OR REPLACE FUNCTION public.has_tenant_role(_user_id uuid, _tenant_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_tenants ut JOIN public.user_tenant_roles utr ON utr.user_tenant_id = ut.id JOIN public.roles r ON r.id = utr.role_id WHERE ut.user_id = _user_id AND ut.tenant_id = _tenant_id AND ut.is_active = true AND r.name = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_member(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_tenants WHERE user_id = _user_id AND tenant_id = _tenant_id AND is_active = true)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, is_active, must_change_password)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), true, false);
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tenant_branding_updated_at BEFORE UPDATE ON public.tenant_branding FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_platform_settings_updated_at BEFORE UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.subscription_plans (name, max_users, max_modules, features) VALUES
  ('Free', 3, 3, '{"basic": true}'::jsonb),
  ('Professional', 15, 10, '{"basic": true, "advanced": true}'::jsonb),
  ('Enterprise', 100, 50, '{"basic": true, "advanced": true, "enterprise": true}'::jsonb);

INSERT INTO public.platform_settings (category, settings) VALUES
  ('security', '{"password_min_length": 8, "password_require_uppercase": true, "password_require_number": true, "password_require_special": true, "password_expiry_days": 90, "max_login_attempts": 5, "lockout_duration_minutes": 15, "session_timeout_hours": 24, "mfa_required": false}'::jsonb),
  ('general', '{"platform_name": "AdequaFácil", "default_language": "pt-BR", "maintenance_mode": false}'::jsonb);

INSERT INTO public.permissions (resource, action, description) VALUES
  ('dashboard','view','Visualizar dashboard'),
  ('diagnostico','view','Visualizar diagnóstico'),('diagnostico','manage','Gerenciar diagnóstico'),
  ('mapeamento','view','Visualizar mapeamento'),('mapeamento','manage','Gerenciar mapeamento'),
  ('documentos','view','Visualizar documentos'),('documentos','manage','Gerenciar documentos'),
  ('solicitacoes','view','Visualizar DSR'),('solicitacoes','manage','Gerenciar DSR'),
  ('consentimento','view','Visualizar consentimentos'),('consentimento','manage','Gerenciar consentimentos'),
  ('incidentes','view','Visualizar incidentes'),('incidentes','manage','Gerenciar incidentes'),
  ('auditoria','view','Visualizar auditorias'),('auditoria','manage','Gerenciar auditorias'),
  ('fornecedores','view','Visualizar fornecedores'),('fornecedores','manage','Gerenciar fornecedores'),
  ('relatorios','view','Visualizar relatórios'),('relatorios','manage','Gerenciar relatórios'),
  ('dpo','view','Visualizar portal DPO'),('dpo','manage','Gerenciar portal DPO');

DROP POLICY IF EXISTS "Admins can manage tenants" ON public.tenants;
CREATE POLICY "Superadmins can manage tenants" ON public.tenants FOR ALL TO authenticated USING (has_role(auth.uid(), 'superadmin'::app_role));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Superadmins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins view all profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'superadmin'::app_role));
CREATE POLICY "Superadmins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'superadmin'::app_role));
CREATE POLICY "Superadmins can delete all profiles" ON public.profiles FOR DELETE TO authenticated USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Users can view tenants they belong to" ON public.tenants FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_tenants ut WHERE ut.tenant_id = tenants.id AND ut.user_id = auth.uid() AND ut.is_active = true)
);
CREATE POLICY "Anon can view active tenant by slug" ON public.tenants FOR SELECT TO anon USING (is_active = true);
