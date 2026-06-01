-- Recria a RPC de forma mais robusta:
-- Para clientes existentes: faz UPDATE do credito_saldo
-- Para clientes novos (sem profile ainda): faz INSERT buscando nome/whatsapp do auth.users
CREATE OR REPLACE FUNCTION public.admin_set_credito_saldo(
  p_user_id UUID,
  p_novo_saldo NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_nome TEXT;
  v_whatsapp TEXT;
BEGIN
  -- Try to just UPDATE first (works for existing profiles)
  UPDATE profiles
  SET credito_saldo = p_novo_saldo
  WHERE id = p_user_id;

  -- If no row was updated, the profile doesn't exist yet — insert it
  IF NOT FOUND THEN
    -- Get nome/whatsapp from auth.users metadata
    SELECT
      COALESCE(raw_user_meta_data->>'nome', ''),
      COALESCE(raw_user_meta_data->>'whatsapp', '')
    INTO v_nome, v_whatsapp
    FROM auth.users
    WHERE id = p_user_id;

    INSERT INTO profiles (id, nome, whatsapp, credito_saldo)
    VALUES (p_user_id, COALESCE(v_nome, ''), COALESCE(v_whatsapp, ''), p_novo_saldo)
    ON CONFLICT (id) DO UPDATE
      SET credito_saldo = EXCLUDED.credito_saldo;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_credito_saldo(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_credito_saldo(UUID, NUMERIC) TO anon;
