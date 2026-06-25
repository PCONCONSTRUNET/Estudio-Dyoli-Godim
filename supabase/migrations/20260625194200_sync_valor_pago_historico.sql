-- Sincroniza valor_pago dos agendamentos com a soma real do pagamento_historico
-- Atualiza apenas agendamentos onde o historico tem soma maior que valor_pago atual

UPDATE agendamentos a
SET valor_pago = hist.total_pago
FROM (
  SELECT
    agendamento_id,
    SUM(CASE WHEN valor_delta > 0 THEN valor_delta ELSE 0 END) AS total_pago
  FROM pagamento_historico
  GROUP BY agendamento_id
) hist
WHERE a.id = hist.agendamento_id
  AND hist.total_pago > COALESCE(a.valor_pago, 0);

-- Verifica resultado
SELECT
  a.id,
  a.cliente_nome,
  a.valor,
  a.valor_pago,
  COALESCE(SUM(CASE WHEN h.valor_delta > 0 THEN h.valor_delta ELSE 0 END), 0) AS soma_historico
FROM agendamentos a
LEFT JOIN pagamento_historico h ON h.agendamento_id = a.id
GROUP BY a.id, a.cliente_nome, a.valor, a.valor_pago
HAVING COALESCE(SUM(CASE WHEN h.valor_delta > 0 THEN h.valor_delta ELSE 0 END), 0) != COALESCE(a.valor_pago, 0)
ORDER BY a.cliente_nome;
