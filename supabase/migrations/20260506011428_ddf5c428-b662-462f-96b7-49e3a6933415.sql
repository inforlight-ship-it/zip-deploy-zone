-- 1. Corrigir View de Analytics (Remover SECURITY DEFINER implícito)
-- Views no Postgres não aceitam SECURITY INVOKER/DEFINER diretamente, 
-- mas dependem das permissões de quem as criou. Vamos recriar para garantir.
DROP VIEW IF EXISTS public.tenant_task_analytics;
CREATE VIEW public.tenant_task_analytics WITH (security_invoker = true) AS
SELECT 
    tenant_id,
    COUNT(*) FILTER (WHERE status = 'concluida') as completed_tasks,
    COUNT(*) FILTER (WHERE status != 'concluida' AND status != 'cancelada') as pending_tasks,
    AVG(CASE WHEN status = 'concluida' THEN EXTRACT(EPOCH FROM (completed_at - created_at)) ELSE NULL END) as avg_completion_time,
    COUNT(*) as total_tasks
FROM public.tasks
WHERE deleted_at IS NULL
GROUP BY tenant_id;

-- 2. Corrigir Search Path e Acessos em Funções
-- Função: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Função: soft_delete_row
CREATE OR REPLACE FUNCTION public.soft_delete_row()
RETURNS TRIGGER AS $$
BEGIN
    NEW.deleted_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public SECURITY DEFINER;

-- Função: log_task_activity
CREATE OR REPLACE FUNCTION public.log_task_activity()
RETURNS TRIGGER AS $$
DECLARE
    current_tenant_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        current_tenant_id := OLD.tenant_id;
    ELSE
        current_tenant_id := NEW.tenant_id;
    END IF;

    INSERT INTO public.activity_logs (
        tenant_id,
        user_id,
        action,
        entity_type,
        entity_id,
        old_data,
        new_data
    ) VALUES (
        current_tenant_id,
        auth.uid(),
        'task_' || lower(TG_OP),
        'task',
        CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE row_to_json(OLD)::jsonb END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW)::jsonb END
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public SECURITY DEFINER;

-- 3. Revogar permissões públicas (Anon) de funções sensíveis
REVOKE EXECUTE ON FUNCTION public.soft_delete_row() FROM PUBLIC, ANON;
REVOKE EXECUTE ON FUNCTION public.log_task_activity() FROM PUBLIC, ANON;

-- 4. Ajustar RLS de Outras Tabelas para considerar Soft Delete
-- Tenants
DROP POLICY IF EXISTS "Users can view their own tenants" ON public.tenants;
CREATE POLICY "Users can view their own tenants" ON public.tenants FOR SELECT
USING (id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()) AND deleted_at IS NULL);

-- Profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT
USING (deleted_at IS NULL);

-- 5. Adicionar índices para performance de busca com soft delete
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_deleted ON public.tasks(tenant_id) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_deleted ON public.profiles(tenant_id) WHERE (deleted_at IS NULL);
