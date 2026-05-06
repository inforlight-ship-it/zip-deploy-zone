-- Adicionar auditoria para a tabela de tenants
CREATE OR REPLACE FUNCTION public.log_tenant_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.activity_logs (
        tenant_id,
        user_id,
        action,
        entity_type,
        entity_id,
        old_data,
        new_data
    ) VALUES (
        CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
        auth.uid(),
        'tenant_' || lower(TG_OP),
        'tenant',
        CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE row_to_json(OLD)::jsonb END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW)::jsonb END
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_log_tenant_activity
AFTER INSERT OR UPDATE OR DELETE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.log_tenant_activity();

-- Adicionar auditoria para tenant_branding
CREATE TRIGGER tr_log_branding_activity
AFTER INSERT OR UPDATE OR DELETE ON public.tenant_branding
FOR EACH ROW EXECUTE FUNCTION public.log_tenant_activity();

-- Habilitar Realtime para convites
ALTER PUBLICATION supabase_realtime ADD TABLE invitations;
