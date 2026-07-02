-- ============================================================
-- Phase 2.1 Schema Enhancement — Tailwinds Pet Care
-- Adds vet contact fields + setup flag to customers.
-- Adds structured optional care data (JSONB) to pets.
-- Run once via Supabase SQL editor or Management API.
-- ============================================================

-- customers: preferred vet contact info + first-login flag
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS preferred_vet_name    text,
  ADD COLUMN IF NOT EXISTS preferred_vet_clinic  text,
  ADD COLUMN IF NOT EXISTS preferred_vet_phone   text,
  ADD COLUMN IF NOT EXISTS preferred_vet_address text,
  ADD COLUMN IF NOT EXISTS setup_completed       boolean not null default false;

-- pets: optional structured care data stored as JSONB
-- diet:             { type: text, frequency: text, amount: text }
-- walking_schedule: { days: text[], time: text, duration_minutes: text }
-- medications:      [{ name: text, dose: text, frequency: text }]
-- vaccinations:     [{ vaccine: text, date_given: text, next_due: text }]
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS diet              jsonb,
  ADD COLUMN IF NOT EXISTS walking_schedule  jsonb,
  ADD COLUMN IF NOT EXISTS medications       jsonb not null default '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS vaccinations      jsonb not null default '[]'::jsonb;
