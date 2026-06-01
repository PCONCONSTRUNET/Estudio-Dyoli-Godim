-- Add valor_desconto_credito column to agendamentos
-- This records how much of the client's credit balance was used as a discount
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS valor_desconto_credito NUMERIC(10,2) DEFAULT 0;
