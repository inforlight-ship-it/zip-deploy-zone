-- 1. Adicionar coluna subscription_id em tenants (Resolvendo erro 42703 nos logs)
-- Note: A coluna parece estar sendo referenciada por algum processo externo ou código legacy que não foi mapeado
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_id TEXT;

-- 2. Adicionar índice para a nova coluna para performance de buscas futuras
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_id ON public.tenants(subscription_id);

-- 3. Garantir que a trigger de novos usuários está corretamente configurada
-- Já validamos que o gatilho on_auth_user_created existe e aponta para handle_new_user()
-- Vamos apenas garantir que a tabela profiles tenha RLS configurado corretamente para o novo fluxo
DROP POLICY IF EXISTS "Profiles are viewable by self or same tenant members" ON public.profiles;
CREATE POLICY "Profiles are viewable by self or same tenant members"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id 
  OR 
  tenant_id IN (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())
  OR
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
);
