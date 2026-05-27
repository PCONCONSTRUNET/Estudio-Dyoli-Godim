ALTER TABLE public.agendamentos ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.agendamentos DROP CONSTRAINT IF EXISTS agendamentos_user_id_fkey;
ALTER TABLE public.agendamentos ADD CONSTRAINT agendamentos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;