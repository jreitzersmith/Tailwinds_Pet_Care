-- ============================================================
-- Migration 018: Scheduled Jobs (pg_cron + pg_net)
-- Triggers the reminder-vaccinations and email-intake edge
-- functions on a schedule, entirely inside Supabase (no external
-- CI/cron dependency).
--
-- NOTE: the service role key is embedded directly in the job body,
-- matching Supabase's documented pg_cron + pg_net pattern for
-- calling authenticated edge functions. cron.job is only readable
-- by the postgres/service role -- the same trust boundary as the
-- dashboard's own secrets panel. If the service role key is ever
-- rotated, these two jobs must be re-created with the new key.
-- ============================================================

select cron.schedule(
  'reminder-vaccinations-daily',
  '0 13 * * *',  -- 13:00 UTC ~ 7-8am Central
  $$
  select net.http_post(
    url     := 'https://sgcwkypnlixpofbrkpec.supabase.co/functions/v1/reminder-vaccinations',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnY3dreXBubGl4cG9mYnJrcGVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzAwMzIyMCwiZXhwIjoyMDk4NTc5MjIwfQ.9i2H68KLRZ5rYg8__oJ3lT8x22zeSB-8lQFd62ddEBU',
      'Content-Type',  'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'email-intake-poll',
  '*/10 * * * *',
  $$
  select net.http_post(
    url     := 'https://sgcwkypnlixpofbrkpec.supabase.co/functions/v1/email-intake',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnY3dreXBubGl4cG9mYnJrcGVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzAwMzIyMCwiZXhwIjoyMDk4NTc5MjIwfQ.9i2H68KLRZ5rYg8__oJ3lT8x22zeSB-8lQFd62ddEBU',
      'Content-Type',  'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
