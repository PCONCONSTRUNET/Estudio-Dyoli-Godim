const headers = {
  'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsZXBlbnhpbmVrb2xqeGVjb21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjI0NDksImV4cCI6MjA5MDYzODQ0OX0.5U3grLWxVeHl2JnuTRWh4P3lPmiv04YAOFosjDZmjMA',
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsZXBlbnhpbmVrb2xqeGVjb21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjI0NDksImV4cCI6MjA5MDYzODQ0OX0.5U3grLWxVeHl2JnuTRWh4P3lPmiv04YAOFosjDZmjMA',
  'Content-Type': 'application/json'
};

const BASE = 'https://vlepenxinekoljxecomr.supabase.co/rest/v1';

async function check() {
  const [agsRes, vendasRes] = await Promise.all([
    fetch(BASE + '/agendamentos?data_agendamento=gte.2026-06-01&data_agendamento=lte.2026-06-30&status=neq.cancelado&status=neq.falta', { headers }),
    fetch(BASE + '/vendas?data_venda=gte.2026-06-01&data_venda=lte.2026-06-30', { headers })
  ]);

  const ags = await agsRes.json();
  const vendas = await vendasRes.json();

  // Build unified list - same as CaixaTab.tsx does
  const allAgs = [...ags];
  vendas.forEach(v => {
    allAgs.push({
      id: v.id,
      servico: 'Venda de Produtos',
      valor: Number(v.valor_total),
      valor_pago: v.pago ? Number(v.valor_total) : 0,
      valor_gorjeta: 0,
      valor_desconto_credito: 0,
      valor_troco: 0,
      data_agendamento: v.data_venda,
      cliente_nome: v.cliente_nome,
      observacao: ''
    });
  });

  // Recebido = valor_pago + gorjeta
  const recebido = allAgs.reduce((s, a) => s + Number(a.valor_pago || 0) + Number(a.valor_gorjeta || 0), 0);

  // Total (Previsto Bruto) = valor - desconto_credito + gorjeta
  const total = allAgs.reduce((s, a) => {
    return s + Math.max(0, Number(a.valor) - Number(a.valor_desconto_credito || 0)) + Number(a.valor_gorjeta || 0);
  }, 0);

  // Pendente = total - recebido
  const pendente = allAgs.reduce((s, a) => {
    return s + Math.max(0, Number(a.valor) - Number(a.valor_pago || 0) - Number(a.valor_desconto_credito || 0));
  }, 0);

  console.log('====================================');
  console.log('AUDITORIA JUNHO 2026');
  console.log('====================================');
  console.log('Total Recebido (Saldo Bruto): R$', recebido.toFixed(2));
  console.log('Previsto (Receita Bruta):     R$', total.toFixed(2));
  console.log('Pendente:                     R$', pendente.toFixed(2));
  console.log('Confere? (recebido + pendente = previsto):', (recebido + pendente).toFixed(2) === total.toFixed(2));
  console.log('====================================');

  // Agendamentos com valor mais alto
  const sorted = [...allAgs].sort((a, b) => Number(b.valor) - Number(a.valor)).slice(0, 15);
  console.log('\nTOP 15 AGENDAMENTOS/VENDAS POR VALOR TOTAL:');
  sorted.forEach(a => {
    const pago = Number(a.valor_pago || 0).toFixed(2);
    const val = Number(a.valor || 0).toFixed(2);
    const flag = Number(val) >= 1000 ? ' <<< ALTO' : '';
    console.log("[" + a.data_agendamento + "] " + (a.cliente_nome || '?') + " (" + (a.servico || '') + ") | Total: R$ " + val + " | Pago: R$ " + pago + flag);
  });

  // Checar se algum agendamento tem valor_pago > valor (erro de dados)
  const anomalias = allAgs.filter(a => Number(a.valor_pago || 0) > Number(a.valor || 0));
  if (anomalias.length > 0) {
    console.log('\n[ANOMALIA] Registros com valor_pago MAIOR que valor total (pode indicar bug):');
    anomalias.forEach(a => {
      console.log("[" + a.data_agendamento + "] " + a.cliente_nome + " | Total: R$ " + a.valor + " | Pago: R$ " + a.valor_pago);
    });
  } else {
    console.log('\nNenhuma anomalia detectada (valor_pago <= valor em todos os registros). OK!');
  }
}

check().catch(console.error);
