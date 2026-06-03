import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL="(.*?)"/)[1];
const key = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*?)"/)[1];

async function run() {
  try {
    const res = await fetch(url + '/rest/v1/agendamentos?select=id,status,valor_pago,valor', {
      headers: {
        'apikey': key,
        'Authorization': 'Bearer ' + key,
      }
    });
    const data = await res.json();
    console.log("TOTAL AGENDAMENTOS IN DB:", data.length);
    if(data.length > 0) console.log("SAMPLE:", data[0]);
  } catch(e) {
    console.error(e);
  }
}
run();
