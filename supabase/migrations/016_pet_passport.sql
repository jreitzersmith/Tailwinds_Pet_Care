-- ============================================================
-- Migration 016: Pet Passport (public shareable read-only link)
-- Uses SECURITY DEFINER functions rather than a plain view, since a
-- plain view would still be subject to the pets/customers RLS
-- policies (customer_id = auth.uid()) and would return nothing for
-- an anonymous visitor. The functions bypass RLS internally but only
-- ever return rows matching a valid share_token with sharing enabled.
-- ============================================================

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS share_token   uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS share_enabled boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS pets_share_token_idx ON public.pets(share_token);

CREATE OR REPLACE FUNCTION public.get_pet_passport(token uuid)
RETURNS TABLE (
  id                     uuid,
  name                   text,
  species                text,
  breed                  text,
  age_years              numeric,
  weight_lbs             numeric,
  allergies              jsonb,
  microchip_number       text,
  microchip_registry     text,
  vaccinations           jsonb,
  medications            jsonb,
  profile_image_url      text,
  preferred_vet_name     text,
  preferred_vet_clinic   text,
  preferred_vet_phone    text,
  preferred_vet_address  text,
  emergency_vet_name     text,
  emergency_vet_clinic   text,
  emergency_vet_phone    text,
  emergency_vet_address  text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.name, p.species, p.breed, p.age_years, p.weight_lbs,
    p.allergies, p.microchip_number, p.microchip_registry,
    p.vaccinations, p.medications, p.profile_image_url,
    c.preferred_vet_name, c.preferred_vet_clinic, c.preferred_vet_phone, c.preferred_vet_address,
    c.emergency_vet_name, c.emergency_vet_clinic, c.emergency_vet_phone, c.emergency_vet_address
  FROM public.pets p
  JOIN public.customers c ON c.id = p.customer_id
  WHERE p.share_token = token AND p.share_enabled = true;
$$;

REVOKE ALL ON FUNCTION public.get_pet_passport(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pet_passport(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_pet_passport_photos(token uuid)
RETURNS TABLE (id uuid, url text, caption text, uploaded_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ph.id, ph.url, ph.caption, ph.uploaded_at
  FROM public.pet_photos ph
  JOIN public.pets p ON p.id = ph.pet_id
  WHERE p.share_token = token AND p.share_enabled = true
  ORDER BY ph.uploaded_at DESC
  LIMIT 12;
$$;

REVOKE ALL ON FUNCTION public.get_pet_passport_photos(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pet_passport_photos(uuid) TO anon, authenticated;

-- Customer needs to toggle share_enabled / regenerate the token
-- themselves -- already covered by the existing
-- "pets: update own" policy from migration 001.
