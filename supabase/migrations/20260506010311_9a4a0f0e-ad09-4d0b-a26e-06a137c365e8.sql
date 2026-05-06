-- Tabela de Comentários em Tarefas
CREATE TABLE public.task_comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    content TEXT NOT NULL,
    mentions UUID[] DEFAULT '{}', -- Array de IDs de usuários mencionados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Log de Atividades (Auditoria)
CREATE TABLE public.activity_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL, -- 'task_created', 'task_updated', 'comment_added', 'settings_changed'
    entity_type TEXT NOT NULL, -- 'task', 'tenant', 'user'
    entity_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para task_comments
CREATE POLICY "Users can view comments on tasks they have access to"
ON public.task_comments FOR SELECT
USING (task_id IN (SELECT id FROM public.tasks WHERE tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid())));

CREATE POLICY "Users can insert comments on tasks they have access to"
ON public.task_comments FOR INSERT
WITH CHECK (task_id IN (SELECT id FROM public.tasks WHERE tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid())));

CREATE POLICY "Users can update their own comments"
ON public.task_comments FOR UPDATE
USING (auth.uid() = user_id);

-- Políticas para activity_logs
CREATE POLICY "Users can view their tenant's activity logs"
ON public.activity_logs FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()));

-- Habilitar Realtime para comentários e tarefas
ALTER PUBLICATION supabase_realtime ADD TABLE task_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- Trigger para registrar alterações em tarefas automaticamente no log de atividades
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_log_task_activity
AFTER INSERT OR UPDATE OR DELETE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.log_task_activity();
