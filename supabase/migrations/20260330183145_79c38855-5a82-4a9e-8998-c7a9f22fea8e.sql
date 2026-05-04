
CREATE POLICY "Superadmins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can delete all profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role));
