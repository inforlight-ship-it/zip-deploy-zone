
-- =============================================
-- ADEQUA FÁCIL - Schema Completo
-- =============================================

-- 1. Enum de papéis
CREATE TYPE public.app_role AS ENUM ('admin', 'dpo', 'juridico', 'ti', 'auditor', 'operador');

-- 2. Enum de status de solicitação do titular
CREATE TYPE public.request_status AS ENUM ('pendente', 'em_andamento', 'concluido', 'cancelado');

-- 3. Enum de tipo de direito do titular
CREATE TYPE public.right_type AS ENUM ('access', 'correction', 'deletion', 'portability', 'opposition', 'revoke', 'info', 'other');

-- 4. Tabela de tenants (organizações)
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 5. Tabela de perfis
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. Tabela de papéis
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 7. Tabela de diagnósticos
CREATE TABLE public.diagnostics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}',
  scores JSONB NOT NULL DEFAULT '{}',
  overall_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.diagnostics ENABLE ROW LEVEL SECURITY;

-- 8. Tabela de solicitações do titular (pública para inserção)
CREATE TABLE public.data_subject_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  protocol TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  cpf TEXT NOT NULL,
  right_type right_type NOT NULL,
  details TEXT NOT NULL,
  status request_status NOT NULL DEFAULT 'pendente',
  response TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;

-- 9. Função de updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers de updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_dsr_updated_at BEFORE UPDATE ON public.data_subject_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Security definer para verificar role sem recursão
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 11. Função para obter tenant_id do usuário
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = _user_id
$$;

-- 12. Trigger para criar perfil automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- RLS POLICIES
-- =============================================

-- Tenants: membros podem ver seu tenant
CREATE POLICY "Users can view own tenant" ON public.tenants
  FOR SELECT TO authenticated
  USING (id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can manage tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Profiles: ver próprio perfil + membros do mesmo tenant
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view tenant profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- User roles: ver próprios papéis
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Diagnostics: CRUD próprio + leitura do tenant
CREATE POLICY "Users can insert own diagnostics" ON public.diagnostics
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own diagnostics" ON public.diagnostics
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR tenant_id = public.get_user_tenant_id(auth.uid()));

-- Data subject requests: inserção pública, leitura restrita ao tenant
CREATE POLICY "Anyone can submit requests" ON public.data_subject_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Tenant members can view requests" ON public.data_subject_requests
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR tenant_id IS NULL);

CREATE POLICY "Tenant members can update requests" ON public.data_subject_requests
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR tenant_id IS NULL);
