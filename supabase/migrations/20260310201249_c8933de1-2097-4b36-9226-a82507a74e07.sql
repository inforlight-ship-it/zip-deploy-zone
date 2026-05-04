
-- DPO Tasks table
CREATE TABLE public.dpo_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta', 'critica')),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  category text NOT NULL DEFAULT 'geral' CHECK (category IN ('geral', 'solicitacao', 'incidente', 'auditoria', 'documento', 'treinamento', 'conformidade')),
  due_date date,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.dpo_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or tenant tasks" ON public.dpo_tasks
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert own tasks" ON public.dpo_tasks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tasks" ON public.dpo_tasks
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own tasks" ON public.dpo_tasks
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- DPO Activity Log
CREATE TABLE public.dpo_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.dpo_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or tenant activity" ON public.dpo_activity_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert own activity" ON public.dpo_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Update trigger for dpo_tasks
CREATE TRIGGER update_dpo_tasks_updated_at
  BEFORE UPDATE ON public.dpo_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
