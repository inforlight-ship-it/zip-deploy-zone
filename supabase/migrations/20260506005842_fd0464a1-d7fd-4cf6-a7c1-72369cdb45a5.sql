-- Tabela de Regras de Workflow
CREATE TABLE public.workflow_rules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL, -- 'task_status_changed', 'task_created', 'task_overdue'
    condition_config JSONB DEFAULT '{}'::jsonb, -- Configurações da condição (ex: status_from, status_to)
    action_type TEXT NOT NULL, -- 'notify_manager', 'assign_user', 'update_field'
    action_config JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Log de Execução de Workflows
CREATE TABLE public.workflow_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    rule_id UUID REFERENCES public.workflow_rules(id) ON DELETE SET NULL,
    target_id UUID NOT NULL, -- ID do objeto afetado (ex: task_id)
    status TEXT NOT NULL, -- 'success', 'failed'
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adicionar colunas de IA na tabela de tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS ai_priority_score FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_recommendation TEXT;

-- Habilitar RLS
ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para workflow_rules
CREATE POLICY "Users can view their tenant's workflow rules"
ON public.workflow_rules FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage their tenant's workflow rules"
ON public.workflow_rules FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()));

-- Políticas para workflow_logs
CREATE POLICY "Users can view their tenant's workflow logs"
ON public.workflow_logs FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()));

-- Trigger para updated_at em workflow_rules
CREATE TRIGGER update_workflow_rules_updated_at
BEFORE UPDATE ON public.workflow_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
