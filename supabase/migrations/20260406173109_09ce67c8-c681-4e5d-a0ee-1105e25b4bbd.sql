INSERT INTO gateway_configs (gateway, access_token, public_key, webhook_url, ativo, pix_enabled, cartao_enabled, boleto_enabled)
VALUES ('woovi', '', '', '', false, true, false, false)
ON CONFLICT DO NOTHING;