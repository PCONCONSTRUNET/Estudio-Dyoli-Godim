const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL="(.*?)"/)[1];
const key = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*?)"/)[1];

fetch(url + '/rest/v1/agendamentos?select=id,status,valor,valor_pago&limit=10', {
  method: 'GET',
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json'
  }
}).then(res => res.json()).then(data => {
    console.log("AGENDAMENTOS:", data.length);
    if (data.length > 0) console.log(data[0]);
}).catch(console.error);

fetch(url + '/rest/v1/profiles?select=id&limit=2', {
  method: 'GET',
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json'
  }
}).then(res => res.json()).then(data => {
    console.log("PROFILES:", data.length);
}).catch(console.error);
