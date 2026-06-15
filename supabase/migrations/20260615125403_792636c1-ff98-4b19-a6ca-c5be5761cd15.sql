
CREATE TABLE public.tenant_data_type_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'normal' CHECK (category IN ('normal','sensitive')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, category, label)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_data_type_options TO authenticated;
GRANT ALL ON public.tenant_data_type_options TO service_role;

ALTER TABLE public.tenant_data_type_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view data type options"
  ON public.tenant_data_type_options FOR SELECT
  TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id) OR public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "Tenant members can insert data type options"
  ON public.tenant_data_type_options FOR INSERT
  TO authenticated
  WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id) OR public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "Tenant members can update data type options"
  ON public.tenant_data_type_options FOR UPDATE
  TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id) OR public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "Tenant members can delete data type options"
  ON public.tenant_data_type_options FOR DELETE
  TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id) OR public.has_role(auth.uid(),'superadmin'));

CREATE TRIGGER tenant_data_type_options_updated_at
  BEFORE UPDATE ON public.tenant_data_type_options
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
