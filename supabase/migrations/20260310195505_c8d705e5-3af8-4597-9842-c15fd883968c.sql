
-- Fix: make consent_records insert policy require visitor_id
DROP POLICY "Anyone can insert consent records" ON public.consent_records;
CREATE POLICY "Anyone can insert consent records"
  ON public.consent_records FOR INSERT TO anon, authenticated
  WITH CHECK (visitor_id IS NOT NULL AND array_length(cookie_categories, 1) IS NOT NULL);
