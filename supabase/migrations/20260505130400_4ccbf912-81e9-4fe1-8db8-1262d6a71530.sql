-- Adicionando FKs para facilitar joins com profiles
ALTER TABLE public.tasks 
  DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey,
  DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_assigned_to_auth_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id),
  ADD CONSTRAINT tasks_created_by_auth_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- Para permitir o join direto com profiles.full_name no Supabase client,
-- precisamos de uma FK para profiles. O ideal é que assigned_to aponte para profiles(user_id)
-- Mas profiles.id é diferente de profiles.user_id. 
-- No entanto, profiles.user_id é UNIQUE.

-- Primeiro garantimos que profiles(user_id) tem um índice UNIQUE (geralmente tem)
-- Agora adicionamos a FK de tasks para profiles
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_assigned_to_profile_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id); 

-- Na verdade, o Supabase consegue inferir o join se houver uma FK para auth.users 
-- e profiles também tiver uma FK para auth.users. 
-- Mas para ser mais direto:
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_assigned_to_user_profile_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(user_id);