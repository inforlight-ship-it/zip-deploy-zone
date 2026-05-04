
-- Enum for risk level
CREATE TYPE public.risk_level AS ENUM ('baixo', 'medio', 'alto', 'critico');

-- Enum for process status
CREATE TYPE public.process_status AS ENUM ('ativo', 'inativo', 'em_revisao', 'rascunho');

-- Enum for legal basis
CREATE TYPE public.legal_basis AS ENUM (
  'consentimento',
  'obrigacao_legal',
  'execucao_contrato',
  'exercicio_regular_direitos',
  'protecao_vida',
  'tutela_saude',
  'interesse_legitimo',
  'protecao_credito',
  'estudo_pesquisa',
  'execucao_politicas_publicas'
);

-- Processing activities table
CREATE TABLE public.processing_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID NOT NULL,
  
  -- Core info
  name TEXT NOT NULL,
  description TEXT,
  department TEXT NOT NULL,
  
  -- Legal & compliance
  legal_basis public.legal_basis NOT NULL,
  legal_basis_detail TEXT,
  purpose TEXT NOT NULL,
  
  -- Roles
  controller TEXT NOT NULL,
  operator TEXT,
  dpo_contact TEXT,
  
  -- Data subjects & data
  data_subjects TEXT NOT NULL,
  data_types TEXT[] NOT NULL DEFAULT '{}',
  sensitive_data BOOLEAN NOT NULL DEFAULT false,
  sensitive_data_types TEXT[] DEFAULT '{}',
  
  -- Data lifecycle
  data_source TEXT,
  storage_location TEXT,
  retention_period TEXT,
  disposal_method TEXT,
  
  -- Sharing & transfer
  shared_with TEXT,
  international_transfer BOOLEAN NOT NULL DEFAULT false,
  transfer_country TEXT,
  transfer_safeguard TEXT,
  
  -- Risk & status
  risk_level public.risk_level NOT NULL DEFAULT 'baixo',
  status public.process_status NOT NULL DEFAULT 'rascunho',
  
  -- Security measures
  security_measures TEXT[] DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.processing_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own activities"
  ON public.processing_activities FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own or tenant activities"
  ON public.processing_activities FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update own activities"
  ON public.processing_activities FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own activities"
  ON public.processing_activities FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Updated_at trigger
CREATE TRIGGER update_processing_activities_updated_at
  BEFORE UPDATE ON public.processing_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
