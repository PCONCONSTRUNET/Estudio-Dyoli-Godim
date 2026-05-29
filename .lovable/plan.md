## Entendi o pedido da dona

Ela quer, no **Registro Manual** do admin, poder adicionar **vários serviços na mesma comanda** (ex.: 3 perfurações, ou 10 trocas de peça da Jéssica) ao invés de criar 10 lançamentos separados. O sistema deve somar automaticamente **valor total** e **duração total**, e gravar tudo como **um único atendimento**.

---

## 1. Corrigir erro de build (rápido)

Em `src/components/DividasTab.tsx`, a coluna `telefone` não existe na tabela `profiles` — o nome correto é `whatsapp`.

- Trocar `telefone` por `whatsapp` em 3 lugares: na `interface Profile` (linha 33), no `select(...)` (linha 69) e na renderização (linha 392).

---

## 2. Registro Manual com múltiplos serviços

### Comportamento novo

Dentro do modal de Registro Manual, a seção de serviço vira uma **lista de itens da comanda**:

- Botão **"+ Adicionar serviço"** abre o seletor atual (busca de serviços) e adiciona o item escolhido à lista (nome, valor sugerido do cadastro, duração sugerida).
- Cada item da lista mostra: nome do serviço, campo de **valor** editável, campo de **duração (min)** editável e botão de **remover (×)**.
- Pode adicionar o **mesmo serviço várias vezes** (ex.: "Perfuração ×3" — fica como 3 itens iguais, ou um item com botão de quantidade — ver decisão técnica abaixo).
- Abaixo da lista, um resumo: **Total de itens**, **Valor total** (soma) e **Duração total** (soma, recalcula o horário fim automaticamente).

Os campos antigos de "Valor" e "Duração" únicos somem — viram derivados da lista.

### Como é salvo

Continua sendo **1 registro** em `agendamentos` (uma comanda só, como ela pediu), sem mudança de schema:

- `servico`: texto concatenado dos itens. Exemplo: `"Perfuração (×3), Troca de joia (×2)"`. Se for 1 item só, fica igual hoje.
- `valor`: soma dos valores dos itens.
- `duracao_minutos`: soma das durações.
- `valor_pago`: valor total se marcou "Pago", senão 0.
- Demais campos (cliente, data, horário, status, forma de pagamento) continuam iguais.
- O trigger `manage_blocked_slots` já bloqueia automaticamente os slots de 30min com base na duração final — então a soma de duração já bloqueia a agenda corretamente.

### Validações

- Não deixa salvar com **lista vazia**.
- Cada item precisa ter valor > 0 e duração > 0.
- Mantém validações atuais de cliente/data/horário.

---

## Detalhes técnicos

Arquivos a tocar:

- `src/components/DividasTab.tsx` — fix `telefone` → `whatsapp`.
- `src/pages/Admin.tsx`:
  - Substituir os estados `manualServico` (string), `manualValor` (string) e `manualDuracao` (string) por **`manualItens`**: `{ id: string; nome: string; valor: number; duracao: number }[]` (id local com `crypto.randomUUID()` só para key do React).
  - Ajustar `handleSelectManualServico` para fazer `push` na lista em vez de setar valor único; manter modal de busca de serviços, mas após selecionar **não fecha a sessão de adição** — fecha o popover e mantém o usuário no modal pra adicionar mais.
  - Computar `totalValor`, `totalDuracao` via `useMemo` e usar para mostrar resumo e recalcular `manualHorarioFim`.
  - Atualizar `saveManualRegistration` para montar `servico` agregando nomes com contagem (ex.: agrupar duplicados para virar `"Perfuração (×3)"`), e gravar `valor` / `duracao_minutos` somados.
  - UI da lista: usar os mesmos tokens do design system (`border-primary-foreground/[0.06]`, `text-gold`, etc.) e respeitar a regra mobile-first do admin (sem scroll horizontal, áreas de toque ≥ 40px, botão de remover bem clicável).

Sem migração de banco. Sem mudança nas outras telas (Caixa, Financeiro, DRE, Pagamentos) — todas leem `servico`, `valor` e `duracao_minutos` normalmente.

---

## Fora do escopo

- Não vou separar a comanda em vários registros (a dona quer **uma comanda só** com soma).
- Não vou criar tabela de "itens de comanda" — não há necessidade hoje e somaria complexidade desnecessária. Se no futuro ela quiser relatório por serviço individual, aí vale criar uma tabela `agendamento_itens`.
