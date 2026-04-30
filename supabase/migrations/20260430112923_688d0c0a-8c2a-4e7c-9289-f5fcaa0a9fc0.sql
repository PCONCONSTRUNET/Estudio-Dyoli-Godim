SELECT cron.schedule(
  'send-lembretes-every-10-min',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://vlepenxinekoljxecomr.supabase.co/functions/v1/send-lembretes',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsZXBlbnhpbmVrb2xqeGVjb21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjI0NDksImV4cCI6MjA5MDYzODQ0OX0.5U3grLWxVeHl2JnuTRWh4P3lPmiv04YAOFosjDZmjMA"}'::jsonb,
    body := concat('{"trigger": "cron", "time": "', now(), '"}')::jsonb
  );
  $$
);