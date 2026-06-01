-- RPC para admin atualizar credito_saldo de qualquer cliente
-- SECURITY DEFINER bypasses RLS, allowing the admin to update any profile.
CREATE OR REPLACE FUNCTION public.admin_set_credito_saldo(
  p_user_id UUID,
  p_novo_saldo NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO profiles (id, credito_saldo)
  VALUES (p_user_id, p_novo_saldo)
  ON CONFLICT (id) DO UPDATE
    SET credito_saldo = EXCLUDED.credito_saldo;
END;
$$;

-- Grant execute permission to authenticated users
-- (the frontend will call this with the admin session)
GRANT EXECUTE ON FUNCTION public.admin_set_credito_saldo(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_credito_saldo(UUID, NUMERIC) TO anon;
