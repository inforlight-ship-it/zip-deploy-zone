
-- Public function to track a request by protocol (no auth needed, limited data)
CREATE OR REPLACE FUNCTION public.track_request_by_protocol(_protocol text)
RETURNS TABLE (
  protocol text,
  name text,
  right_type text,
  status text,
  response text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    d.protocol,
    d.name,
    d.right_type::text,
    d.status::text,
    d.response,
    d.created_at,
    d.updated_at
  FROM public.data_subject_requests d
  WHERE d.protocol = _protocol
  LIMIT 1
$$;
