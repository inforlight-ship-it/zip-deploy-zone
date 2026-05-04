
-- Allow anonymous users to look up active tenants by slug (limited fields only)
CREATE POLICY "Anon can view active tenant by slug"
ON public.tenants
FOR SELECT
TO anon
USING (is_active = true);
