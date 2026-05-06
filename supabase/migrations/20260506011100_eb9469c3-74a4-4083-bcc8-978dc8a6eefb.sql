-- 1. Soft Delete: Adicionar colunas deleted_at
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Criar função genérica de soft delete
CREATE OR REPLACE FUNCTION public.soft_delete_row()
RETURNS TRIGGER AS $$
BEGIN
    NEW.deleted_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar políticas de RLS para ignorar itens deletados por padrão
-- Nota: Isso exige atualização manual de políticas existentes. Exemplo para tasks:
DROP POLICY IF EXISTS "Users can view their tenant's tasks" ON public.tasks;
CREATE POLICY "Users can view their tenant's tasks"
ON public.tasks FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()) AND deleted_at IS NULL);

-- 2. Impersonation Mode Support
CREATE TABLE public.support_impersonation_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES auth.users(id) NOT NULL,
    target_user_id UUID REFERENCES auth.users(id) NOT NULL,
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    reason TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.support_impersonation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only superadmins can view impersonation logs"
ON public.support_impersonation_logs FOR SELECT
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin'));

-- 3. Analytics Views/Indexes
-- Criar uma view para produtividade de tarefas para facilitar o dashboard
CREATE OR REPLACE VIEW public.tenant_task_analytics AS
SELECT 
    tenant_id,
    COUNT(*) FILTER (WHERE status = 'concluida') as completed_tasks,
    COUNT(*) FILTER (WHERE status != 'concluida' AND status != 'cancelada') as pending_tasks,
    AVG(CASE WHEN status = 'concluida' THEN (completed_at - created_at) ELSE NULL END) as avg_completion_time,
    COUNT(*) as total_tasks
FROM public.tasks
WHERE deleted_at IS NULL
GROUP BY tenant_id;

GRANT SELECT ON public.tenant_task_analytics TO authenticated;
