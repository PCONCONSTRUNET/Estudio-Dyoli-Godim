ALTER TABLE public.servicos ADD COLUMN duracao_minutos integer NOT NULL DEFAULT 60;
ALTER TABLE public.agendamentos ADD COLUMN duracao_minutos integer NOT NULL DEFAULT 60;