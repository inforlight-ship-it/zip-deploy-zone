
-- ═══════════════════════════════════════════════
-- ENUMS
-- ═══════════════════════════════════════════════

CREATE TYPE public.audit_status AS ENUM ('pendente', 'em_andamento', 'concluida');
CREATE TYPE public.audit_finding_severity AS ENUM ('informativo', 'baixo', 'medio', 'alto', 'critico');
CREATE TYPE public.incident_severity AS ENUM ('baixa', 'media', 'alta', 'critica');
CREATE TYPE public.incident_status AS ENUM ('detectado', 'em_analise', 'contido', 'erradicado', 'recuperado', 'encerrado');
CREATE TYPE public.supplier_risk AS ENUM ('baixo', 'medio', 'alto', 'critico');
CREATE TYPE public.supplier_status AS ENUM ('pendente', 'aprovado', 'reprovado', 'em_revisao');

-- ═══════════════════════════════════════════════
-- AUDITORIAS
-- ═══════════════════════════════════════════════

CREATE TABLE public.security_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  name text NOT NULL,
  description text,
  status audit_status NOT NULL DEFAULT 'pendente',
  overall_score integer NOT NULL DEFAULT 0,
  total_controls integer NOT NULL DEFAULT 0,
  compliant_controls integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own audits" ON public.security_audits FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view own or tenant audits" ON public.security_audits FOR SELECT TO authenticated USING (user_id = auth.uid() OR tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update own audits" ON public.security_audits FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own audits" ON public.security_audits FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.audit_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES public.security_audits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  category text NOT NULL DEFAULT 'geral',
  title text NOT NULL,
  description text,
  is_compliant boolean DEFAULT false,
  evidence text,
  notes text,
  severity audit_finding_severity NOT NULL DEFAULT 'medio',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own controls" ON public.audit_controls FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view own or tenant controls" ON public.audit_controls FOR SELECT TO authenticated USING (user_id = auth.uid() OR tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update own controls" ON public.audit_controls FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own controls" ON public.audit_controls FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════
-- INCIDENTES
-- ═══════════════════════════════════════════════

CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  title text NOT NULL,
  description text NOT NULL,
  severity incident_severity NOT NULL DEFAULT 'media',
  status incident_status NOT NULL DEFAULT 'detectado',
  category text NOT NULL DEFAULT 'vazamento',
  affected_data_types text[] DEFAULT '{}',
  affected_count integer DEFAULT 0,
  detected_at timestamptz NOT NULL DEFAULT now(),
  contained_at timestamptz,
  resolved_at timestamptz,
  reported_to_anpd boolean DEFAULT false,
  anpd_report_date timestamptz,
  reported_to_subjects boolean DEFAULT false,
  root_cause text,
  corrective_actions text,
  preventive_actions text,
  dpo_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own incidents" ON public.incidents FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view own or tenant incidents" ON public.incidents FOR SELECT TO authenticated USING (user_id = auth.uid() OR tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update own incidents" ON public.incidents FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own incidents" ON public.incidents FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.incident_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.incident_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own timeline" ON public.incident_timeline FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view incident timeline" ON public.incident_timeline FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.incidents i WHERE i.id = incident_id AND (i.user_id = auth.uid() OR i.tenant_id = get_user_tenant_id(auth.uid())))
);

-- ═══════════════════════════════════════════════
-- FORNECEDORES
-- ═══════════════════════════════════════════════

CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  name text NOT NULL,
  cnpj text,
  contact_name text,
  contact_email text,
  category text NOT NULL DEFAULT 'tecnologia',
  services_description text,
  data_shared text,
  has_dpa boolean DEFAULT false,
  dpa_expires_at date,
  risk_level supplier_risk NOT NULL DEFAULT 'medio',
  status supplier_status NOT NULL DEFAULT 'pendente',
  overall_score integer DEFAULT 0,
  last_assessment_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view own or tenant suppliers" ON public.suppliers FOR SELECT TO authenticated USING (user_id = auth.uid() OR tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update own suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own suppliers" ON public.suppliers FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.supplier_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  question text NOT NULL,
  category text NOT NULL DEFAULT 'geral',
  answer text,
  score integer DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own assessments" ON public.supplier_assessments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view own or tenant assessments" ON public.supplier_assessments FOR SELECT TO authenticated USING (user_id = auth.uid() OR tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update own assessments" ON public.supplier_assessments FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own assessments" ON public.supplier_assessments FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_security_audits_updated_at BEFORE UPDATE ON public.security_audits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_audit_controls_updated_at BEFORE UPDATE ON public.audit_controls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
