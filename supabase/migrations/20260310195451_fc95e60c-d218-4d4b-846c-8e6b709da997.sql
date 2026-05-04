
-- Cookie category type
CREATE TYPE public.cookie_category AS ENUM (
  'essencial',
  'desempenho',
  'funcionalidade',
  'marketing'
);

-- Consent purpose type
CREATE TYPE public.consent_purpose AS ENUM (
  'cookies_essenciais',
  'cookies_desempenho',
  'cookies_funcionalidade',
  'cookies_marketing',
  'comunicacao_email',
  'comunicacao_sms',
  'compartilhamento_terceiros',
  'pesquisa',
  'outro'
);

-- Consent action type
CREATE TYPE public.consent_action AS ENUM (
  'aceito',
  'recusado',
  'revogado',
  'atualizado'
);

-- Cookie policies / banner configurations
CREATE TABLE public.cookie_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Configuração Padrão',
  is_active BOOLEAN NOT NULL DEFAULT false,
  banner_title TEXT NOT NULL DEFAULT 'Utilizamos cookies',
  banner_description TEXT NOT NULL DEFAULT 'Nosso site utiliza cookies para melhorar sua experiência. Ao continuar navegando, você concorda com nossa Política de Cookies.',
  banner_position TEXT NOT NULL DEFAULT 'bottom',
  banner_theme TEXT NOT NULL DEFAULT 'light',
  show_reject_all BOOLEAN NOT NULL DEFAULT true,
  show_preferences BOOLEAN NOT NULL DEFAULT true,
  auto_block_scripts BOOLEAN NOT NULL DEFAULT false,
  privacy_policy_url TEXT,
  cookie_policy_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cookie definitions (individual cookies tracked)
CREATE TABLE public.cookie_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID NOT NULL,
  policy_id UUID REFERENCES public.cookie_policies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'Próprio',
  category cookie_category NOT NULL DEFAULT 'essencial',
  description TEXT,
  duration TEXT NOT NULL DEFAULT 'Sessão',
  is_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Consent records (audit trail)
CREATE TABLE public.consent_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  visitor_id TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  action consent_action NOT NULL DEFAULT 'aceito',
  purposes consent_purpose[] NOT NULL DEFAULT '{}',
  cookie_categories cookie_category[] NOT NULL DEFAULT '{}',
  consent_given_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for cookie_policies
ALTER TABLE public.cookie_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or tenant cookie policies"
  ON public.cookie_policies FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert own cookie policies"
  ON public.cookie_policies FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own cookie policies"
  ON public.cookie_policies FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own cookie policies"
  ON public.cookie_policies FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RLS for cookie_definitions
ALTER TABLE public.cookie_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or tenant cookie definitions"
  ON public.cookie_definitions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert own cookie definitions"
  ON public.cookie_definitions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own cookie definitions"
  ON public.cookie_definitions FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own cookie definitions"
  ON public.cookie_definitions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RLS for consent_records
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tenant consent records"
  ON public.consent_records FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR tenant_id IS NULL);

CREATE POLICY "Anyone can insert consent records"
  ON public.consent_records FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Triggers
CREATE TRIGGER update_cookie_policies_updated_at
  BEFORE UPDATE ON public.cookie_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
