
CREATE TABLE public.agendamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  servico TEXT NOT NULL,
  variacao TEXT,
  data_agendamento DATE NOT NULL,
  horario TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  valor_pago NUMERIC(10,2) DEFAULT 0,
  forma_pagamento TEXT DEFAULT 'pix',
  status TEXT NOT NULL DEFAULT 'confirmado',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own appointments"
  ON public.agendamentos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own appointments"
  ON public.agendamentos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own appointments"
  ON public.agendamentos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
