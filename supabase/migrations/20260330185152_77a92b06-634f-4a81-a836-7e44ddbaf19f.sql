
CREATE POLICY "Users can view tenants they belong to"
ON public.tenants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_tenants ut
    WHERE ut.tenant_id = tenants.id
      AND ut.user_id = auth.uid()
      AND ut.is_active = true
  )
);
