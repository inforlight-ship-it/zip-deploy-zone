
-- Table to store external assessment tokens
CREATE TABLE public.supplier_assessment_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  completed_at timestamptz,
  supplier_name text NOT NULL DEFAULT '',
  supplier_email text
);

ALTER TABLE public.supplier_assessment_tokens ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage their tokens
CREATE POLICY "Users can insert own tokens"
  ON public.supplier_assessment_tokens FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can view own tokens"
  ON public.supplier_assessment_tokens FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete own tokens"
  ON public.supplier_assessment_tokens FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Anonymous users can read token info (to load the external form)
CREATE POLICY "Anon can read valid tokens"
  ON public.supplier_assessment_tokens FOR SELECT TO anon
  USING (completed_at IS NULL AND expires_at > now());

-- Anonymous users can mark token as completed
CREATE POLICY "Anon can update token completion"
  ON public.supplier_assessment_tokens FOR UPDATE TO anon
  USING (completed_at IS NULL AND expires_at > now())
  WITH CHECK (completed_at IS NOT NULL);

-- Allow anon to insert assessments (for external filling)
CREATE POLICY "Anon can insert assessments via token"
  ON public.supplier_assessments FOR INSERT TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.supplier_assessment_tokens t
      WHERE t.supplier_id = supplier_assessments.supplier_id
        AND t.completed_at IS NULL
        AND t.expires_at > now()
    )
  );

-- Allow anon to update supplier status after assessment
CREATE POLICY "Anon can update supplier after assessment"
  ON public.suppliers FOR UPDATE TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.supplier_assessment_tokens t
      WHERE t.supplier_id = suppliers.id
        AND t.completed_at IS NULL
        AND t.expires_at > now()
    )
  );

-- Allow anon to delete old assessments for reassessment
CREATE POLICY "Anon can delete assessments via token"
  ON public.supplier_assessments FOR DELETE TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.supplier_assessment_tokens t
      WHERE t.supplier_id = supplier_assessments.supplier_id
        AND t.completed_at IS NULL
        AND t.expires_at > now()
    )
  );

-- Allow anon to read supplier info for the form
CREATE POLICY "Anon can read supplier via token"
  ON public.suppliers FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.supplier_assessment_tokens t
      WHERE t.supplier_id = suppliers.id
        AND t.completed_at IS NULL
        AND t.expires_at > now()
    )
  );
