-- ============================================================
-- Migration 007: Update airline check constraint
-- Adds United, Delta; removes named check so we can replace it
-- Run once via Supabase SQL Editor.
-- ============================================================

DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.customers'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%airline%';

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.customers DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.customers
  ADD CONSTRAINT customers_airline_check
  CHECK (
    airline IN ('Southwest', 'American', 'United', 'Delta', 'Other')
    OR airline IS NULL
  );
