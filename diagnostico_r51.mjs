import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://vlepenxinekoljxecomr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsZXBlbnhpbmVrb2xqeGVjb21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjI0NDksImV4cCI6MjA5MDYzODQ0OX0.5U3grLWxVeHl2JnuTRWh4P3lPmiv04YAOFosjDZmjMA"
);

const hoje = "2026-07-01";
const cicloStart = "2026-07-01";
const cicloEnd = "2026-07-31";

console.log("=== DIAGNÓSTICO R$ 51 ===\n");

// 1. Agendamentos de HOJE
const { data: agHoje } = await supabase
  .from("agendamentos")
  .select("id, cliente_nome, servico, valor, valor_pago, status, data_agendamento, horario")
  .eq("data_agendamento", hoje)
  .neq("status", "cancelado")
  .neq("status", "aguardando_pagamento");

console.log(`📅 Agendamentos em ${hoje}:`);
let recebidoHoje = 0;
agHoje?.forEach((a) => {
  const pago = Number(a.valor_pago || 0);
  recebidoHoje += pago;
  console.log(`  [${a.horario}] ${a.cliente_nome || a.servico} | Valor: R$${a.valor} | Pago: R$${pago} | Status: ${a.status}`);
});
console.log(`  ➜ TOTAL RECEBIDO HOJE (agendamentos): R$ ${recebidoHoje.toFixed(2)}\n`);

// 2. Agendamentos do CICLO que NÃO são de hoje
const { data: agCiclo } = await supabase
  .from("agendamentos")
  .select("id, cliente_nome, servico, valor, valor_pago, status, data_agendamento, horario")
  .gte("data_agendamento", cicloStart)
  .lte("data_agendamento", cicloEnd)
  .neq("status", "cancelado")
  .neq("status", "falta")
  .neq("status", "aguardando_pagamento")
  .neq("data_agendamento", hoje);

console.log(`📆 Agendamentos no ciclo (Jul) que NÃO são hoje:`);
let recebidoOutrosDias = 0;
if (agCiclo?.length === 0) {
  console.log("  (nenhum)");
} else {
  agCiclo?.forEach((a) => {
    const pago = Number(a.valor_pago || 0);
    recebidoOutrosDias += pago;
    if (pago > 0) {
      console.log(`  ⚠️  [${a.data_agendamento} ${a.horario}] ${a.cliente_nome || a.servico} | Pago: R$${pago} ← ESTE É O MOTIVO DO R$51!`);
    } else {
      console.log(`  [${a.data_agendamento} ${a.horario}] ${a.cliente_nome || a.servico} | Pago: R$${pago}`);
    }
  });
}
console.log(`  ➜ Extra no ciclo (outros dias de jul): R$ ${recebidoOutrosDias.toFixed(2)}\n`);

// 3. Vendas no ciclo
const { data: vendas } = await supabase
  .from("vendas")
  .select("id, cliente_nome, valor_total, pago, data_venda, created_at")
  .gte("created_at", cicloStart + "T00:00:00")
  .lte("created_at", cicloEnd + "T23:59:59");

console.log(`🛒 Vendas de produtos no ciclo:`);
let recebidoVendas = 0;
if (vendas?.length === 0) {
  console.log("  (nenhuma venda)");
} else {
  vendas?.forEach((v) => {
    const utcDate = v.created_at?.split("T")[0];
    const localDate = v.data_venda || new Date(new Date(v.created_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];
    const pago = v.pago ? Number(v.valor_total) : 0;
    recebidoVendas += pago;
    const mismatch = utcDate !== localDate ? " ⚠️ DATA UTC vs LOCAL DIFERENTE!" : "";
    console.log(`  ${v.cliente_nome} | R$${v.valor_total} | UTC: ${utcDate} | Local: ${localDate}${mismatch}`);
  });
}
console.log(`  ➜ Total vendas: R$ ${recebidoVendas.toFixed(2)}\n`);

console.log("=== RESUMO ===");
console.log(`Recebido hoje (agendamentos): R$ ${recebidoHoje.toFixed(2)}`);
console.log(`Extra em outros dias de Jul:  R$ ${recebidoOutrosDias.toFixed(2)}`);
console.log(`Vendas no ciclo:              R$ ${recebidoVendas.toFixed(2)}`);
console.log(`Total ciclo estimado:         R$ ${(recebidoHoje + recebidoOutrosDias + recebidoVendas).toFixed(2)}`);
