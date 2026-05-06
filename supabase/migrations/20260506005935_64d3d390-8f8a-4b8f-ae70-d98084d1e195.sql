-- Criar o webhook para a tabela de tasks
-- Nota: Isso assume que o Supabase Edge Functions e Webhooks estão disponíveis no ambiente.

-- Ativar extensões necessárias se não estiverem
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "extensions";

-- Trigger para invocar a função de automação no UPDATE
-- Substituir pela URL real da função se necessário após deploy
CREATE OR REPLACE FUNCTION public.on_task_changed()
RETURNS TRIGGER AS $$
BEGIN
  -- Invocar Edge Function de Automação
  -- Usamos o ID do projeto que pode ser obtido via variável de ambiente no Supabase real
  -- Aqui simulamos a lógica que o Supabase faz via interface de Webhooks
  PERFORM
    net.http_post(
      url := 'https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/task-automation',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', current_setting('request.headers')::json->>'authorization'
      ),
      body := jsonb_build_object(
        'record', row_to_json(NEW),
        'old_record', row_to_json(OLD),
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA
      )::text
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger real para UPDATE
DROP TRIGGER IF EXISTS tr_task_changed ON public.tasks;
CREATE TRIGGER tr_task_changed
AFTER UPDATE ON public.tasks
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.on_task_changed();
