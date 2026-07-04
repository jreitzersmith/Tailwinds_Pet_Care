-- Migration 006: Add feeding and walking schedule fields to pets table
-- Run in Supabase SQL Editor

ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS feeding_times     text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS feeding_frequency integer,
  ADD COLUMN IF NOT EXISTS feeding_notes     text,
  ADD COLUMN IF NOT EXISTS walking_times     text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS walking_duration  integer,
  ADD COLUMN IF NOT EXISTS walking_notes     text;

COMMENT ON COLUMN pets.feeding_times     IS 'Array of feeding time slots: morning, midday, evening';
COMMENT ON COLUMN pets.feeding_frequency IS 'Number of feedings per day';
COMMENT ON COLUMN pets.feeding_notes     IS 'Diet notes or feeding instructions';
COMMENT ON COLUMN pets.walking_times     IS 'Array of walk time slots: morning, midday, evening';
COMMENT ON COLUMN pets.walking_duration  IS 'Duration of each walk in minutes';
COMMENT ON COLUMN pets.walking_notes     IS 'Walk notes (leash behavior, route, etc.)';
