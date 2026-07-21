-- ============================================================
-- Migration 014: Pet Weight History
-- Replaces the single overwritten pets.weight_lbs snapshot with
-- a proper time series. pets.weight_lbs remains as "current/last
-- known weight" for quick display; this table holds the trend.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pet_weight_logs (
  id          uuid primary key default gen_random_uuid(),
  pet_id      uuid not null references public.pets(id) on delete cascade,
  weight_lbs  numeric(5,1) not null,
  recorded_at date not null default current_date,
  note        text,
  created_at  timestamptz not null default now()
);

ALTER TABLE public.pet_weight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pet_weight_logs: select own" ON public.pet_weight_logs
  FOR SELECT USING (
    pet_id IN (SELECT id FROM public.pets WHERE customer_id = auth.uid())
  );

CREATE POLICY "pet_weight_logs: insert own" ON public.pet_weight_logs
  FOR INSERT WITH CHECK (
    pet_id IN (SELECT id FROM public.pets WHERE customer_id = auth.uid())
  );

CREATE POLICY "pet_weight_logs: delete own" ON public.pet_weight_logs
  FOR DELETE USING (
    pet_id IN (SELECT id FROM public.pets WHERE customer_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS pet_weight_logs_pet_id_idx ON public.pet_weight_logs(pet_id, recorded_at);
