-- ============================================================
-- Migration 013: Pet Medical Profile Extensions
-- Adds structured allergies + microchip to pets.
-- Adds emergency vet + emergency human contact to customers
-- (parallel to the existing preferred_vet_* fields).
-- ============================================================

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS allergies          jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS microchip_number   text,
  ADD COLUMN IF NOT EXISTS microchip_registry text;

-- allergies: [{ allergen: text, severity: 'Mild'|'Moderate'|'Severe', notes: text }]

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS emergency_vet_name             text,
  ADD COLUMN IF NOT EXISTS emergency_vet_clinic            text,
  ADD COLUMN IF NOT EXISTS emergency_vet_phone             text,
  ADD COLUMN IF NOT EXISTS emergency_vet_address           text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name          text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone         text,
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship  text;
