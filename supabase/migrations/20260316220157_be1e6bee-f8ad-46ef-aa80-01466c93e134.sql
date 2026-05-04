
-- Drop the existing SELECT policy that only checks user_id or tenant_id
DROP POLICY IF EXISTS "Users can view own or tenant assessments" ON public.supplier_assessments;

-- Create a new SELECT policy that also allows viewing assessments for suppliers owned by the user
CREATE POLICY "Users can view own or tenant assessments" ON public.supplier_assessments
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() 
  OR tenant_id = get_user_tenant_id(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.suppliers s 
    WHERE s.id = supplier_assessments.supplier_id 
    AND (s.user_id = auth.uid() OR s.tenant_id = get_user_tenant_id(auth.uid()))
  )
);
