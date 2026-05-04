
-- Document types enum
CREATE TYPE public.document_type AS ENUM (
  'politica_privacidade',
  'ripd',
  'termos_uso',
  'politica_cookies',
  'termo_consentimento',
  'plano_resposta_incidentes',
  'politica_seguranca',
  'contrato_operador',
  'relatorio_auditoria',
  'outro'
);

-- Document status enum
CREATE TYPE public.document_status AS ENUM (
  'rascunho',
  'em_revisao',
  'aprovado',
  'publicado',
  'arquivado',
  'expirado'
);

-- Documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  document_type document_type NOT NULL DEFAULT 'outro',
  status document_status NOT NULL DEFAULT 'rascunho',
  content TEXT DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  parent_id UUID REFERENCES public.documents(id),
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  tags TEXT[] DEFAULT '{}'::TEXT[],
  file_url TEXT,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or tenant documents"
  ON public.documents FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert own documents"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own documents"
  ON public.documents FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own documents"
  ON public.documents FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Updated_at trigger
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
