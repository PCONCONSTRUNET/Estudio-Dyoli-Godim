# 🤖 Integração Chatbot WhatsApp → Sistema de Agendamento

Este documento explica como seu chatbot Node.js (rodando na sua VPS) se conecta ao sistema de agendamento via Edge Functions.

## 🔐 Autenticação

Todas as requisições devem incluir o header:

```
x-bot-secret: <BOT_API_SECRET>
```

O valor está salvo nos secrets do Supabase (você definiu via formulário). **Nunca exponha esse token no front-end nem em repositórios públicos.**

No seu `.env` da VPS:

```env
BOT_API_SECRET=seu_token_aqui
SUPABASE_FUNCTIONS_URL=https://vlepenxinekoljxecomr.supabase.co/functions/v1
```

---

## 📡 Endpoints disponíveis

Base URL: `https://vlepenxinekoljxecomr.supabase.co/functions/v1`

### 1. `POST /bot-servicos` — Listar serviços ativos

**Request:** body vazio `{}`

**Response:**
```json
{
  "success": true,
  "servicos": [
    {
      "id": "uuid-do-servico",
      "nome": "Sobrancelha Fio a Fio",
      "categoria": "Micropigmentação",
      "preco": 450.00,
      "duracao_minutos": 120
    }
  ]
}
```

---

### 2. `POST /bot-horarios-disponiveis` — Horários livres em uma data

**Request:**
```json
{
  "servico_id": "uuid-do-servico",
  "data": "2026-04-20"
}
```

**Response:**
```json
{
  "success": true,
  "servico": { "id": "...", "nome": "...", "duracao_minutos": 120, "preco": 450 },
  "data": "2026-04-20",
  "horarios_disponiveis": ["09:00", "09:30", "11:00", "14:00"]
}
```

---

### 3. `POST /bot-agendar` — Criar agendamento (cria conta automática)

**Request:**
```json
{
  "whatsapp": "5511999998888",
  "nome": "Maria Silva",
  "servico_id": "uuid-do-servico",
  "data": "2026-04-20",
  "horario": "14:00",
  "variacao": "Tradicional",
  "forma_pagamento": "pix"
}
```

**Comportamento:**
- Se o WhatsApp não tem conta → cria automaticamente:
  - **Email:** `5511999998888@gmail.com`
  - **Senha:** `123123`
- Se já existe → usa a conta existente
- Valida que o horário ainda está livre (retorna 409 se ocupou)

**Response (sucesso):**
```json
{
  "success": true,
  "message": "Agendamento criado com sucesso",
  "agendamento": { "id": "...", "data_agendamento": "2026-04-20", "horario": "14:00", ... },
  "cliente": {
    "user_id": "...",
    "email": "5511999998888@gmail.com",
    "senha_padrao": "123123",
    "whatsapp": "5511999998888"
  }
}
```

---

### 4. `POST /bot-meus-agendamentos` — Consultar agendamentos do cliente

**Request:**
```json
{
  "whatsapp": "5511999998888",
  "status": "confirmado"
}
```

`status` é opcional: `pendente`, `confirmado`, `concluido`, `cancelado`, `falta`.

**Response:**
```json
{
  "success": true,
  "cliente": { "id": "...", "nome": "Maria Silva" },
  "agendamentos": [...]
}
```

---

### 5. `POST /bot-ia-fallback` — Interpretar mensagem livre com IA

Use quando o cliente escrever algo que não casa com seus menus.

**Request:**
```json
{
  "mensagem": "queria marcar uma sobrancelha pra sexta de manhã",
  "contexto": "Cliente já viu a lista de serviços"
}
```

**Response:**
```json
{
  "success": true,
  "intencao": "agendar",
  "resposta_sugerida": "Claro! Para marcar sua sobrancelha na sexta de manhã, ...",
  "servico_mencionado": "sobrancelha",
  "data_mencionada": "sexta",
  "horario_mencionado": "manhã",
  "confianca": 0.92
}
```

> **IA usada:** `google/gemini-2.5-flash` via Lovable AI Gateway. Gratuito até 13/out/2025, depois consome créditos do workspace Lovable.

---

## 💻 Cliente Node.js para sua VPS

Crie um arquivo `lovable-client.js` no seu bot:

```javascript
const BASE_URL = process.env.SUPABASE_FUNCTIONS_URL;
const BOT_SECRET = process.env.BOT_API_SECRET;

async function call(endpoint, body = {}) {
  const res = await fetch(`${BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bot-secret': BOT_SECRET,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

module.exports = {
  listarServicos: () => call('bot-servicos'),
  horariosDisponiveis: (servico_id, data) =>
    call('bot-horarios-disponiveis', { servico_id, data }),
  agendar: (params) => call('bot-agendar', params),
  meusAgendamentos: (whatsapp, status) =>
    call('bot-meus-agendamentos', { whatsapp, status }),
  iaFallback: (mensagem, contexto) =>
    call('bot-ia-fallback', { mensagem, contexto }),
};
```

### Exemplo de uso no seu chatbot

```javascript
const lovable = require('./lovable-client');

// Quando cliente envia "oi" ou "agendar"
const { servicos } = await lovable.listarServicos();
// envia menu numerado pro cliente

// Quando cliente escolhe serviço + data
const { horarios_disponiveis } = await lovable.horariosDisponiveis(
  servicoEscolhido.id,
  '2026-04-20'
);

// Quando cliente confirma
const result = await lovable.agendar({
  whatsapp: msg.from, // ex: "5511999998888"
  nome: contato.pushname || 'Cliente WhatsApp',
  servico_id: servicoEscolhido.id,
  data: '2026-04-20',
  horario: '14:00',
});
// envia confirmação pro cliente

// Quando cliente escreve algo livre
const ia = await lovable.iaFallback(msg.body);
if (ia.intencao === 'agendar') {
  // inicia fluxo de agendamento
} else if (ia.intencao === 'duvida_geral') {
  // encaminha pra humano
}
```

---

## 🔒 Notas de segurança

- Use HTTPS sempre (já é padrão das edge functions).
- Aplique **rate limiting na sua VPS** por número de WhatsApp pra evitar abuso.
- Logs com info sensível (telefone) devem ser tratados conforme LGPD.
- Se vazar o `BOT_API_SECRET`, gere um novo no painel da Lovable e atualize na VPS.

---

## 🧪 Testar

Você pode testar qualquer endpoint via curl da sua VPS:

```bash
curl -X POST https://vlepenxinekoljxecomr.supabase.co/functions/v1/bot-servicos \
  -H "Content-Type: application/json" \
  -H "x-bot-secret: SEU_TOKEN_AQUI" \
  -d '{}'
```
