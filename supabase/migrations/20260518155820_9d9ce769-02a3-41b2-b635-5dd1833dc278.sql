
CREATE OR REPLACE FUNCTION public.manage_blocked_slots()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  slot_count INTEGER;
  i INTEGER;
  slot_hour INTEGER;
  slot_minute INTEGER;
  slot_time TEXT;
  start_hour INTEGER;
  start_minute INTEGER;
  ref_id UUID;
  ref_date DATE;
  ref_horario TEXT;
  ref_duracao INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    ref_id := OLD.id;
    ref_date := OLD.data_agendamento;
    ref_horario := OLD.horario;
    ref_duracao := OLD.duracao_minutos;
  ELSE
    ref_id := NEW.id;
    ref_date := NEW.data_agendamento;
    ref_horario := NEW.horario;
    ref_duracao := NEW.duracao_minutos;
  END IF;

  start_hour := SPLIT_PART(ref_horario, ':', 1)::INTEGER;
  start_minute := SPLIT_PART(ref_horario, ':', 2)::INTEGER;
  slot_count := CEIL(ref_duracao::NUMERIC / 30);

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('pendente', 'confirmado', 'concluido', 'aguardando_pagamento') THEN
      FOR i IN 0..(slot_count - 1) LOOP
        slot_hour := start_hour + ((start_minute + (i * 30)) / 60);
        slot_minute := (start_minute + (i * 30)) % 60;
        slot_time := LPAD(slot_hour::TEXT, 2, '0') || ':' || LPAD(slot_minute::TEXT, 2, '0');
        INSERT INTO horarios_bloqueados (data, horario, motivo)
        VALUES (ref_date, slot_time, 'agendamento:' || ref_id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IN ('cancelado', 'falta') AND OLD.status NOT IN ('cancelado', 'falta') THEN
      DELETE FROM horarios_bloqueados WHERE motivo = 'agendamento:' || ref_id;
    END IF;
    IF NEW.status IN ('pendente', 'confirmado', 'concluido', 'aguardando_pagamento') AND OLD.status IN ('cancelado', 'falta') THEN
      FOR i IN 0..(slot_count - 1) LOOP
        slot_hour := start_hour + ((start_minute + (i * 30)) / 60);
        slot_minute := (start_minute + (i * 30)) % 60;
        slot_time := LPAD(slot_hour::TEXT, 2, '0') || ':' || LPAD(slot_minute::TEXT, 2, '0');
        INSERT INTO horarios_bloqueados (data, horario, motivo)
        VALUES (ref_date, slot_time, 'agendamento:' || ref_id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
    IF NEW.duracao_minutos IS DISTINCT FROM OLD.duracao_minutos AND NEW.status IN ('pendente', 'confirmado', 'concluido', 'aguardando_pagamento') THEN
      DELETE FROM horarios_bloqueados WHERE motivo = 'agendamento:' || ref_id;
      FOR i IN 0..(slot_count - 1) LOOP
        slot_hour := start_hour + ((start_minute + (i * 30)) / 60);
        slot_minute := (start_minute + (i * 30)) % 60;
        slot_time := LPAD(slot_hour::TEXT, 2, '0') || ':' || LPAD(slot_minute::TEXT, 2, '0');
        INSERT INTO horarios_bloqueados (data, horario, motivo)
        VALUES (ref_date, slot_time, 'agendamento:' || ref_id)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    DELETE FROM horarios_bloqueados WHERE motivo = 'agendamento:' || ref_id;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$function$;
