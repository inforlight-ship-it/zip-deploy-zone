
-- ADEQUA FÁCIL Schema (Part 1)

CREATE TYPE public.app_role AS ENUM ('admin', 'dpo', 'juridico', 'ti', 'auditor', 'operador');
CREATE TYPE public.request_status AS ENUM ('pendente', 'em_andamento', 'concluido', 'cancelado');
CREATE TYPE public.right_type AS ENUM ('access', 'correction', 'deletion', 'portability', 'opposition', 'revoke', 'info', 'other');

CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

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

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

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

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_dsr_updated_at BEFORE UPDATE ON public.data_subject_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "Users can view own tenant" ON public.tenants FOR SELECT TO authenticated USING (id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Admins can manage tenants" ON public.tenants FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can view tenant profiles" ON public.profiles FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own diagnostics" ON public.diagnostics FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view own diagnostics" ON public.diagnostics FOR SELECT TO authenticated USING (user_id = auth.uid() OR tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Anyone can submit requests" ON public.data_subject_requests FOR INSERT TO anon, authenticated WITH CHECK (name IS NOT NULL AND email IS NOT NULL AND cpf IS NOT NULL AND details IS NOT NULL AND protocol IS NOT NULL);
CREATE POLICY "Tenant members can view requests" ON public.data_subject_requests FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR tenant_id IS NULL);
CREATE POLICY "Tenant members can update requests" ON public.data_subject_requests FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR tenant_id IS NULL);

CREATE TYPE public.risk_level AS ENUM ('baixo', 'medio', 'alto', 'critico');
CREATE TYPE public.process_status AS ENUM ('ativo', 'inativo', 'em_revisao', 'rascunho');
CREATE TYPE public.legal_basis AS ENUM ('consentimento','obrigacao_legal','execucao_contrato','exercicio_regular_direitos','protecao_vida','tutela_saude','interesse_legitimo','protecao_credito','estudo_pesquisa','execucao_politicas_publicas');

CREATE TABLE public.processing_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID NOT NULL,
  name TEXT NOT NULL, description TEXT, department TEXT NOT NULL,
  legal_basis public.legal_basis NOT NULL, legal_basis_detail TEXT, purpose TEXT NOT NULL,
  controller TEXT NOT NULL, operator TEXT, dpo_contact TEXT,
  data_subjects TEXT NOT NULL, data_types TEXT[] NOT NULL DEFAULT '{}',
  sensitive_data BOOLEAN NOT NULL DEFAULT false, sensitive_data_types TEXT[] DEFAULT '{}',
  data_source TEXT, storage_location TEXT, retention_period TEXT, disposal_method TEXT,
  shared_with TEXT, international_transfer BOOLEAN NOT NULL DEFAULT false,
  transfer_country TEXT, transfer_safeguard TEXT,
  risk_level public.risk_level NOT NULL DEFAULT 'baixo',
  status public.process_status NOT NULL DEFAULT 'rascunho',
  security_measures TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.processing_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own activities" ON public.processing_activities FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view own or tenant activities" ON public.processing_activities FOR SELECT TO authenticated USING (user_id = auth.uid() OR tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update own activities" ON public.processing_activities FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own activities" ON public.processing_activities FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER update_processing_activities_updated_at BEFORE UPDATE ON public.processing_activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TYPE public.document_type AS ENUM ('politica_privacidade','relatorio_impacto','registro_consentimento','contrato_dpa','politica_retencao','termo_consentimento','plano_resposta_incidentes','politica_seguranca','contrato_operador','relatorio_auditoria','outro');
CREATE TYPE public.document_status AS ENUM ('rascunho','em_revisao','aprovado','publicado','arquivado','expirado');

CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id), user_id UUID NOT NULL,
  title TEXT NOT NULL, description TEXT,
  document_type document_type NOT NULL DEFAULT 'outro',
  status document_status NOT NULL DEFAULT 'rascunho',
  content TEXT DEFAULT '', version INTEGER NOT NULL DEFAULT 1,
  parent_id UUID REFERENCES public.documents(id),
  approved_by TEXT, approved_at TIMESTAMPTZ, expires_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}', file_url TEXT, file_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own or tenant documents" ON public.documents FOR SELECT TO authenticated USING (user_id = auth.uid() OR tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert own documents" ON public.documents FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own documents" ON public.documents FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TYPE public.cookie_category AS ENUM ('essencial','desempenho','funcionalidade','marketing');
CREATE TYPE public.consent_purpose AS ENUM ('cookies_essenciais','cookies_desempenho','cookies_funcionalidade','cookies_marketing','comunicacao_email','comunicacao_sms','compartilhamento_terceiros','pesquisa','outro');
CREATE TYPE public.consent_action AS ENUM ('aceito','recusado','revogado','atualizado');

CREATE TABLE public.cookie_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id), user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Configuração Padrão',
  is_active BOOLEAN NOT NULL DEFAULT false,
  banner_title TEXT NOT NULL DEFAULT 'Utilizamos cookies',
  banner_description TEXT NOT NULL DEFAULT 'Nosso site utiliza cookies.',
  banner_position TEXT NOT NULL DEFAULT 'bottom',
  banner_theme TEXT NOT NULL DEFAULT 'light',
  show_reject_all BOOLEAN NOT NULL DEFAULT true,
  show_preferences BOOLEAN NOT NULL DEFAULT true,
  auto_block_scripts BOOLEAN NOT NULL DEFAULT false,
  privacy_policy_url TEXT, cookie_policy_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.cookie_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id), user_id UUID NOT NULL,
  policy_id UUID REFERENCES public.cookie_policies(id) ON DELETE CASCADE,
  name TEXT NOT NULL, provider TEXT NOT NULL DEFAULT 'Próprio',
  category cookie_category NOT NULL DEFAULT 'essencial',
  description TEXT, duration TEXT NOT NULL DEFAULT 'Sessão',
  is_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.consent_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  visitor_id TEXT NOT NULL, ip_address TEXT, user_agent TEXT,
  action consent_action NOT NULL DEFAULT 'aceito',
  purposes consent_purpose[] NOT NULL DEFAULT '{}',
  cookie_categories cookie_category[] NOT NULL DEFAULT '{}',
  consent_given_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ, metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cookie_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own or tenant cookie policies" ON public.cookie_policies FOR SELECT TO authenticated USING (user_id = auth.uid() OR tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert own cookie policies" ON public.cookie_policies FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own cookie policies" ON public.cookie_policies FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own cookie policies" ON public.cookie_policies FOR DELETE TO authenticated USING (user_id = auth.uid());
ALTER TABLE public.cookie_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own or tenant cookie definitions" ON public.cookie_definitions FOR SELECT TO authenticated USING (user_id = auth.uid() OR tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert own cookie definitions" ON public.cookie_definitions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own cookie definitions" ON public.cookie_definitions FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own cookie definitions" ON public.cookie_definitions FOR DELETE TO authenticated USING (user_id = auth.uid());
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view tenant consent records" ON public.consent_records FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR tenant_id IS NULL);
CREATE POLICY "Anyone can insert consent records" ON public.consent_records FOR INSERT TO anon, authenticated WITH CHECK (visitor_id IS NOT NULL AND array_length(cookie_categories, 1) IS NOT NULL);
CREATE TRIGGER update_cookie_policies_updated_at BEFORE UPDATE ON public.cookie_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE public.dpo_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, tenant_id uuid REFERENCES public.tenants(id),
  title text NOT NULL, description text,
  priority text NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa','media','alta','critica')),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em_andamento','concluida','cancelada')),
  category text NOT NULL DEFAULT 'geral' CHECK (category IN ('geral','solicitacao','incidente','auditoria','documento','treinamento','conformidade')),
  due_date date, completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dpo_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own or tenant tasks" ON public.dpo_tasks FOR SELECT TO authenticated USING (user_id = auth.uid() OR tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert own tasks" ON public.dpo_tasks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own tasks" ON public.dpo_tasks FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own tasks" ON public.dpo_tasks FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.dpo_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, tenant_id uuid REFERENCES public.tenants(id),
  action text NOT NULL, entity_type text NOT NULL, entity_id uuid,
  details jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dpo_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own or tenant activity" ON public.dpo_activity_log FOR SELECT TO authenticated USING (user_id = auth.uid() OR tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert own activity" ON public.dpo_activity_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE TRIGGER update_dpo_tasks_updated_at BEFORE UPDATE ON public.dpo_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION public.track_request_by_protocol(_protocol text)
RETURNS TABLE (protocol text, name text, right_type text, status text, response text, created_at timestamptz, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.protocol, d.name, d.right_type::text, d.status::text, d.response, d.created_at, d.updated_at
  FROM public.data_subject_requests d WHERE d.protocol = _protocol LIMIT 1
$$;

CREATE TYPE public.audit_status AS ENUM ('pendente','em_andamento','concluida');
CREATE TYPE public.audit_finding_severity AS ENUM ('informativo','baixo','medio','alto','critico');
CREATE TYPE public.incident_severity AS ENUM ('baixa','media','alta','critica');
CREATE TYPE public.incident_status AS ENUM ('detectado','em_analise','contido','erradicado','recuperado','encerrado');
CREATE TYPE public.supplier_risk AS ENUM ('baixo','medio','alto','critico');
CREATE TYPE public.supplier_status AS ENUM ('pendente','aprovado','reprovado','em_revisao');

CREATE TABLE public.security_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, tenant_id uuid REFERENCES public.tenants(id),
  name text NOT NULL, description text,
  status audit_status NOT NULL DEFAULT 'pendente',
  overall_score integer NOT NULL DEFAULT 0,
  total_controls integer NOT NULL DEFAULT 0,
  compliant_controls integer NOT NULL DEFAULT 0,
  started_at timestamptz, completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.security_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own audits" ON public.security_audits FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view own or tenant audits" ON public.security_audits FOR SELECT TO authenticated USING (user_id = auth.uid() OR tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update own audits" ON public.security_audits FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own audits" ON public.security_audits FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.audit_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES public.security_audits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, tenant_id uuid REFERENCES public.tenants(id),
  category text NOT NULL DEFAULT 'geral', title text NOT NULL, description text,
  is_compliant boolean DEFAULT false, evidence text, notes text,
  severity audit_finding_severity NOT NULL DEFAULT 'medio',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own controls" ON public.audit_controls FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view own or tenant controls" ON public.audit_controls FOR SELECT TO authenticated USING (user_id = auth.uid() OR tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update own controls" ON public.audit_controls FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own controls" ON public.audit_controls FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, tenant_id uuid REFERENCES public.tenants(id),
  title text NOT NULL, description text NOT NULL,
  severity incident_severity NOT NULL DEFAULT 'media',
  status incident_status NOT NULL DEFAULT 'detectado',
  category text NOT NULL DEFAULT 'vazamento',
  affected_data_types text[] DEFAULT '{}', affected_count integer DEFAULT 0,
  detected_at timestamptz NOT NULL DEFAULT now(),
  contained_at timestamptz, resolved_at timestamptz,
  reported_to_anpd boolean DEFAULT false, anpd_report_date timestamptz,
  reported_to_subjects boolean DEFAULT false,
  root_cause text, corrective_actions text, preventive_actions text, dpo_notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own incidents" ON public.incidents FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view own or tenant incidents" ON public.incidents FOR SELECT TO authenticated USING (user_id = auth.uid() OR tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update own incidents" ON public.incidents FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own incidents" ON public.incidents FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.incident_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, action text NOT NULL, details text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.incident_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own timeline" ON public.incident_timeline FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view incident timeline" ON public.incident_timeline FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.incidents i WHERE i.id = incident_id AND (i.user_id = auth.uid() OR i.tenant_id = get_user_tenant_id(auth.uid())))
);

CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, tenant_id uuid REFERENCES public.tenants(id),
  name text NOT NULL, cnpj text, contact_name text, contact_email text,
  category text NOT NULL DEFAULT 'tecnologia',
  services_description text, data_shared text,
  has_dpa boolean DEFAULT false, dpa_expires_at date,
  risk_level supplier_risk NOT NULL DEFAULT 'medio',
  status supplier_status NOT NULL DEFAULT 'pendente',
  overall_score integer DEFAULT 0, last_assessment_at timestamptz, notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view own or tenant suppliers" ON public.suppliers FOR SELECT TO authenticated USING (user_id = auth.uid() OR tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update own suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own suppliers" ON public.suppliers FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.supplier_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, tenant_id uuid REFERENCES public.tenants(id),
  question text NOT NULL, category text NOT NULL DEFAULT 'geral',
  answer text, score integer DEFAULT 0, notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.supplier_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own assessments" ON public.supplier_assessments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own assessments" ON public.supplier_assessments FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own assessments" ON public.supplier_assessments FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER update_security_audits_updated_at BEFORE UPDATE ON public.security_audits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_audit_controls_updated_at BEFORE UPDATE ON public.audit_controls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE public.supplier_assessment_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  completed_at timestamptz,
  supplier_name text NOT NULL DEFAULT '', supplier_email text
);
ALTER TABLE public.supplier_assessment_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own tokens" ON public.supplier_assessment_tokens FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can view own tokens" ON public.supplier_assessment_tokens FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Users can delete own tokens" ON public.supplier_assessment_tokens FOR DELETE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Anon can read valid tokens" ON public.supplier_assessment_tokens FOR SELECT TO anon USING (completed_at IS NULL AND expires_at > now());
CREATE POLICY "Anon can update token completion" ON public.supplier_assessment_tokens FOR UPDATE TO anon USING (completed_at IS NULL AND expires_at > now()) WITH CHECK (completed_at IS NOT NULL);
CREATE POLICY "Anon can insert assessments via token" ON public.supplier_assessments FOR INSERT TO anon WITH CHECK (EXISTS (SELECT 1 FROM public.supplier_assessment_tokens t WHERE t.supplier_id = supplier_assessments.supplier_id AND t.completed_at IS NULL AND t.expires_at > now()));
CREATE POLICY "Anon can update supplier after assessment" ON public.suppliers FOR UPDATE TO anon USING (EXISTS (SELECT 1 FROM public.supplier_assessment_tokens t WHERE t.supplier_id = suppliers.id AND t.completed_at IS NULL AND t.expires_at > now()));
CREATE POLICY "Anon can delete assessments via token" ON public.supplier_assessments FOR DELETE TO anon USING (EXISTS (SELECT 1 FROM public.supplier_assessment_tokens t WHERE t.supplier_id = supplier_assessments.supplier_id AND t.completed_at IS NULL AND t.expires_at > now()));
CREATE POLICY "Anon can read supplier via token" ON public.suppliers FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM public.supplier_assessment_tokens t WHERE t.supplier_id = suppliers.id AND t.completed_at IS NULL AND t.expires_at > now()));

CREATE POLICY "Users can view own or tenant assessments" ON public.supplier_assessments FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR tenant_id = get_user_tenant_id(auth.uid())
  OR EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_assessments.supplier_id AND (s.user_id = auth.uid() OR s.tenant_id = get_user_tenant_id(auth.uid())))
);

CREATE TYPE public.invitation_status AS ENUM ('pending','accepted','expired','revoked');
CREATE TYPE public.mfa_method AS ENUM ('totp','email_otp');

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superadmin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tenant_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'analyst';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';
