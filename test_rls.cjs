const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL="(.*?)"/)[1];
const key = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*?)"/)[1];

fetch(url + '/rest/v1/dividas', {
  method: 'POST',
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify({
    user_id: '4bd4ee58-52b8-4c90-abbb-a492660d5c80', 
    cliente_nome: 'Teste',
    descricao: 'Teste',
    valor_total: 10
  })
}).then(res => res.json()).then(console.log).catch(console.error);
