const supabaseUrl = process.env.SUPABASE_URL || 'https://vlepenxinekoljxecomr.supabase.co'
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsZXBlbnhpbmVrb2xqeGVjb21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjI0NDksImV4cCI6MjA5MDYzODQ0OX0.5U3grLWxVeHl2JnuTRWh4P3lPmiv04YAOFosjDZmjMA'

async function check() {
  const countRes = await fetch(`${supabaseUrl}/rest/v1/agendamentos?select=*`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Prefer: 'count=exact',
      Range: '0-0'
    }
  })
  const count = countRes.headers.get('content-range')
  console.log('Total agendamentos range:', count)
  
  const dataRes = await fetch(`${supabaseUrl}/rest/v1/agendamentos?select=*&limit=5`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    }
  })
  const data = await dataRes.json()
  console.log('Sample agendamentos:', data)
}
check()
