const urlAgs = 'https://vlepenxinekoljxecomr.supabase.co/rest/v1/agendamentos?data_agendamento=gte.2026-06-01&data_agendamento=lte.2026-06-30&status=neq.cancelado&status=neq.falta';
const urlVendas = 'https://vlepenxinekoljxecomr.supabase.co/rest/v1/vendas?data_venda=gte.2026-06-01&data_venda=lte.2026-06-30';

const headers = {
  'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsZXBlbnhpbmVrb2xqeGVjb21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjI0NDksImV4cCI6MjA5MDYzODQ0OX0.5U3grLWxVeHl2JnuTRWh4P3lPmiv04YAOFosjDZmjMA',
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsZXBlbnhpbmVrb2xqeGVjb21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjI0NDksImV4cCI6MjA5MDYzODQ0OX0.5U3grLWxVeHl2JnuTRWh4P3lPmiv04YAOFosjDZmjMA',
  'Content-Type': 'application/json'
};

async function check() {
  try {
    const [agsRes, vendasRes] = await Promise.all([
      fetch(urlAgs, { headers }),
      fetch(urlVendas, { headers })
    ]);
    const ags = await agsRes.json();
    const vendas = await vendasRes.json();

    let allAgs = [...ags];
    vendas.forEach(v => {
      allAgs.push({
        id: v.id,
        servico: 'Venda de Produtos',
        valor: Number(v.valor_total),
        cliente_nome: v.cliente_nome,
        data_agendamento: v.data_venda
      });
    });

    const total = allAgs.reduce((s, a) => s + Math.max(0, Number(a.valor) - Number(a.valor_desconto_credito || 0)) + Number(a.valor_gorjeta || 0), 0);
    console.log('Total Previsto Calculado:', total);

    const altos = allAgs.filter(a => Number(a.valor) >= 500);
    altos.sort((a,b) => Number(b.valor) - Number(a.valor));
    
    console.log('\n--- SERVIÇOS DE MAIOR VALOR ---');
    altos.forEach(a => {
      console.log("[" + a.data_agendamento + "] " + a.cliente_nome + " (" + a.servico + "): R$ " + a.valor + " (ID: " + a.id + ")");
    });
    
  } catch(e) {
    console.error(e);
  }
}
check();
