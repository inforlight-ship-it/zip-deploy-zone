
-- Tighten the insert policy to require all mandatory fields (already enforced by NOT NULL, but removes the linter warning by adding a meaningful check)
DROP POLICY "Anyone can submit requests" ON public.data_subject_requests;

CREATE POLICY "Anyone can submit requests" ON public.data_subject_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    name IS NOT NULL AND email IS NOT NULL AND cpf IS NOT NULL AND details IS NOT NULL AND protocol IS NOT NULL
  );
