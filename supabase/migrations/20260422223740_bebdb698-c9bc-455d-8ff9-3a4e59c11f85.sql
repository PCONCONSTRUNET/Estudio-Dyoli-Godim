-- Habilita Realtime para a tabela servicos (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'servicos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.servicos;
  END IF;
END $$;

-- Garante REPLICA IDENTITY FULL para receber linhas completas em UPDATE/DELETE
ALTER TABLE public.servicos REPLICA IDENTITY FULL;