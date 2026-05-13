UPDATE public.gateway_configs
SET access_token = 'APP_USR-1024148687209643-051117-84d82cc9b4d7d5245e9c5f426fd379a3-3393920191',
    public_key = 'APP_USR-69b3efba-a36d-4d2a-a993-9c8c1cf380f8',
    webhook_url = 'http://178.105.54.230:3001/webhook/mercadopago',
    ativo = true,
    pix_enabled = true,
    cartao_enabled = true,
    boleto_enabled = true,
    updated_at = now()
WHERE gateway = 'mercadopago';