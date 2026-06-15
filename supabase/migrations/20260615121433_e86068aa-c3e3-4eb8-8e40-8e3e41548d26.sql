
-- 1. Fix search_path on trigger functions
CREATE OR REPLACE FUNCTION public.on_task_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/task-automation',
    headers := jsonb_build_object('Content-Type','application/json','Authorization', current_setting('request.headers')::json->>'authorization'),
    body := jsonb_build_object('record', row_to_json(NEW),'old_record', row_to_json(OLD),'type', TG_OP,'table', TG_TABLE_NAME,'schema', TG_TABLE_SCHEMA)::text
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_tenant_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activity_logs (tenant_id,user_id,action,entity_type,entity_id,old_data,new_data)
  VALUES (
    CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END,
    auth.uid(),
    'tenant_'||lower(TG_OP),
    'tenant',
    CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END,
    CASE WHEN TG_OP='INSERT' THEN NULL ELSE row_to_json(OLD)::jsonb END,
    CASE WHEN TG_OP='DELETE' THEN NULL ELSE row_to_json(NEW)::jsonb END
  );
  RETURN NULL;
END;
$$;

-- 2. Revoke EXECUTE from trigger-only functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_task_activity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_tenant_activity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_task_changed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.soft_delete_row() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 3. Profiles: drop public anon-readable policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by self or same tenant members" ON public.profiles;

-- (Existing authenticated policies "Users can view own profile" / "Users can view tenant profiles" / "Superadmins view all profiles" remain)

-- 4. Consent records: drop NULL-tenant exposure
DROP POLICY IF EXISTS "Authenticated users can view tenant consent records" ON public.consent_records;
CREATE POLICY "Tenant members can view tenant consent records"
ON public.consent_records FOR SELECT TO authenticated
USING (tenant_id IS NOT NULL AND tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Superadmins can view all consent records"
ON public.consent_records FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'superadmin'));

-- 5. Data subject requests: drop NULL-tenant exposure
DROP POLICY IF EXISTS "Tenant members can view requests" ON public.data_subject_requests;
DROP POLICY IF EXISTS "Tenant members can update requests" ON public.data_subject_requests;
CREATE POLICY "Tenant members can view tenant requests"
ON public.data_subject_requests FOR SELECT TO authenticated
USING (tenant_id IS NOT NULL AND tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant members can update tenant requests"
ON public.data_subject_requests FOR UPDATE TO authenticated
USING (tenant_id IS NOT NULL AND tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Superadmins can view all DSARs"
ON public.data_subject_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "Superadmins can update all DSARs"
ON public.data_subject_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'superadmin'));

-- 6. Tenants: drop anon enumeration, expose lookup-by-slug function
DROP POLICY IF EXISTS "Anon can view active tenant by slug" ON public.tenants;

CREATE OR REPLACE FUNCTION public.get_tenant_by_slug(_slug text)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT t.id, t.name
  FROM public.tenants t
  WHERE t.slug = _slug AND t.is_active = true AND t.deleted_at IS NULL
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.get_tenant_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_by_slug(text) TO anon, authenticated;

-- 7. Supplier assessment tokens: drop anon enumeration; expose by-token function
DROP POLICY IF EXISTS "Anon can read valid tokens" ON public.supplier_assessment_tokens;
DROP POLICY IF EXISTS "Anon can update token completion" ON public.supplier_assessment_tokens;

CREATE OR REPLACE FUNCTION public.get_supplier_assessment_token(_token text)
RETURNS TABLE(id uuid, supplier_id uuid, supplier_name text, expires_at timestamptz, completed_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT t.id, t.supplier_id, t.supplier_name, t.expires_at, t.completed_at
  FROM public.supplier_assessment_tokens t
  WHERE t.token = _token
    AND t.completed_at IS NULL
    AND t.expires_at > now()
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.get_supplier_assessment_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_supplier_assessment_token(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.complete_supplier_assessment_token(_token text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _ok boolean;
BEGIN
  UPDATE public.supplier_assessment_tokens
     SET completed_at = now()
   WHERE token = _token
     AND completed_at IS NULL
     AND expires_at > now();
  GET DIAGNOSTICS _ok = ROW_COUNT;
  RETURN _ok;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.complete_supplier_assessment_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_supplier_assessment_token(text) TO anon, authenticated;

-- 8. Workflow rules: restrict management to tenant admins / superadmins
DROP POLICY IF EXISTS "Admins can manage their tenant's workflow rules" ON public.workflow_rules;
CREATE POLICY "Tenant admins can manage workflow rules"
ON public.workflow_rules FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(),'superadmin')
  OR public.has_tenant_role(auth.uid(), tenant_id, 'admin')
)
WITH CHECK (
  public.has_role(auth.uid(),'superadmin')
  OR public.has_tenant_role(auth.uid(), tenant_id, 'admin')
);

-- 9. Password history: ensure no client writes/deletes (only definer functions)
-- (No INSERT/DELETE policies = blocked by RLS. Revoke direct table privileges from anon/authenticated.)
REVOKE INSERT, UPDATE, DELETE ON public.password_history FROM anon, authenticated;
