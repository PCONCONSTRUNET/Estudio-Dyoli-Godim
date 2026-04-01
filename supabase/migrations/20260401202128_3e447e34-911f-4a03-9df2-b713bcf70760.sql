-- Tabela de serviços
CREATE TABLE public.servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Outros',
  preco NUMERIC(10,2) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de horários de funcionamento
CREATE TABLE public.horarios_funcionamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dia_semana INTEGER NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6),
  aberto BOOLEAN NOT NULL DEFAULT false,
  hora_inicio TEXT NOT NULL DEFAULT '09:00',
  hora_fim TEXT NOT NULL DEFAULT '19:00',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (dia_semana)
);

-- Inserir dados iniciais dos serviços
INSERT INTO public.servicos (nome, categoria, preco, ativo, ordem) VALUES
  ('Micropigmentação Fio a Fio', 'Sobrancelhas', 550.00, true, 1),
  ('Micropigmentação Labial', 'Lábios', 480.00, true, 2),
  ('Perfuração Básica', 'Perfuração', 170.00, true, 3),
  ('Perfuração Padrão', 'Perfuração', 180.00, true, 4),
  ('Perfuração Premium', 'Perfuração', 300.00, true, 5);

-- Inserir horários padrão
INSERT INTO public.horarios_funcionamento (dia_semana, aberto, hora_inicio, hora_fim) VALUES
  (0, false, '09:00', '19:00'),
  (1, false, '09:00', '19:00'),
  (2, true, '09:00', '19:00'),
  (3, false, '09:00', '19:00'),
  (4, true, '09:00', '19:00'),
  (5, true, '09:00', '19:00'),
  (6, false, '09:00', '19:00');

-- RLS
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios_funcionamento ENABLE ROW LEVEL SECURITY;

-- Leitura pública (clientes precisam ver serviços e horários)
CREATE POLICY "Leitura pública de serviços" ON public.servicos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Leitura pública de horários" ON public.horarios_funcionamento FOR SELECT TO anon, authenticated USING (true);

-- Escrita autenticada (admin gerencia via app)
CREATE POLICY "Gestão de serviços" ON public.servicos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Gestão de horários" ON public.horarios_funcionamento FOR ALL TO authenticated USING (true) WITH CHECK (true);