CREATE TABLE public.configuracoes_lembretes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT false,
  mensagem TEXT NOT NULL DEFAULT '',
  horas_antes INTEGER NOT NULL DEFAULT 24,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracoes_lembretes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de lembretes" ON public.configuracoes_lembretes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Gestão de lembretes" ON public.configuracoes_lembretes FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.configuracoes_lembretes (tipo, ativo, mensagem, horas_antes) VALUES
  ('confirmacao', true, 'Olá! Seu agendamento foi confirmado no Estúdio Dyoli Godim. 📋', 0),
  ('lembrete', true, 'Lembrete: Seu atendimento no Estúdio Dyoli Godim é amanhã! ⏰', 24),
  ('cancelamento', false, 'Seu agendamento no Estúdio Dyoli Godim foi cancelado. ❌', 0),
  ('comparecimento', false, 'Obrigada por comparecer! Esperamos te ver novamente. 💖', 1),
  ('pos_atendimento', false, 'Como foi seu atendimento? Sua opinião é muito importante! ⭐', 48);