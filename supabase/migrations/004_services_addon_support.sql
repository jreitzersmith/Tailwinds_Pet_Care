-- ============================================================
-- Migration 004: Services add-on support + data corrections
-- Tailwinds Pet Care
-- Run once via Supabase SQL editor.
-- ============================================================


-- -------------------------------------------------------
-- 1. Allow base_price to be NULL (for "Quotes on Request")
-- -------------------------------------------------------
ALTER TABLE public.services
  ALTER COLUMN base_price DROP NOT NULL,
  ALTER COLUMN base_price DROP DEFAULT;


-- -------------------------------------------------------
-- 2. Add addon_for column
--    NULL  = primary service (always visible)
--    array = add-on; only shown when a named dependency
--            is the selected primary service
-- -------------------------------------------------------
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS addon_for text[] DEFAULT NULL;


-- -------------------------------------------------------
-- 3. Add addon_service_ids to bookings
--    Stores UUIDs of any add-on services selected
--    alongside the primary service.
-- -------------------------------------------------------
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS addon_service_ids uuid[] NOT NULL DEFAULT '{}';


-- -------------------------------------------------------
-- 4. Data corrections
-- -------------------------------------------------------

-- 4a. Split "Mail & Package Retrieval" ($20 single row)
--     into two distinct line items.
DELETE FROM public.services
  WHERE name = 'Mail & Package Retrieval'
    AND category = 'Add-On Services';

INSERT INTO public.services (category, name, description, base_price) VALUES
  (
    'Add-On Services',
    'Mail & Package Retrieval (During Pet Visit)',
    'We collect your mail and packages during pet care visits so nothing sits outside while you are away.',
    5
  ),
  (
    'Add-On Services',
    'Mail & Package Retrieval (Outside Pet Visits)',
    'We collect your mail and packages outside of planned pet visits — great if you have an important package that needs to be moved inside immediately.',
    15
  );


-- 4b. Fix Plant Watering: correct price and name.
UPDATE public.services
  SET name        = 'Plant Watering (per 10 plants)',
      base_price  = 10,
      description = 'We water your indoor plants during visits — one less thing to worry about on a long trip. Priced per 10 plants.'
  WHERE name = 'Plant Watering'
    AND category = 'Add-On Services';


-- 4c. Rename "Custom Construction" → "Custom Items"
--     and clear prices (all are quotes on request).
UPDATE public.services
  SET category   = 'Custom Items',
      base_price = NULL
  WHERE category = 'Custom Construction';


-- -------------------------------------------------------
-- 5. Mark existing add-ons with their dependencies
--    Add-On Services with no dependency (NULL) are shown
--    as optional extras on every booking.
--    Items below are only shown when a specific primary
--    service is selected.
-- -------------------------------------------------------

-- Puppy & Kitten Visits: only relevant for Drop-In or Pet Sitting
UPDATE public.services
  SET addon_for = ARRAY['Drop-In Visits', 'Pet Sitting (In-Home)']
  WHERE name = 'Puppy & Kitten Visits';

-- Senior Pet Care: same dependency
UPDATE public.services
  SET addon_for = ARRAY['Drop-In Visits', 'Pet Sitting (In-Home)']
  WHERE name = 'Senior Pet Care';
