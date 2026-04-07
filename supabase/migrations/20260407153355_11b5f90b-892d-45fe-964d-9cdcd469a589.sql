-- Create trigger if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_manage_blocked_slots'
  ) THEN
    CREATE TRIGGER trigger_manage_blocked_slots
    AFTER INSERT OR UPDATE OR DELETE ON public.agendamentos
    FOR EACH ROW
    EXECUTE FUNCTION public.manage_blocked_slots();
  END IF;
END$$;