-- ============================================================
-- Migration 012: Slot-level booking model
-- Tailwinds Pet Care
--
-- Introduces the single source of truth for billable work:
--   * booking_visits  — one row per actual visit (date + shift + service)
--   * booking_pets    — junction so a booking can cover multiple pets
--   * services.price_per_pet — per-service pricing behaviour
--   * coherent booking + invoice status machines
--   * invoices.line_items becomes the persisted snapshot at issue time
--
-- Reuses the existing public.is_admin() SECURITY DEFINER helper for
-- admin RLS (same pattern already applied to bookings/invoices/pets).
-- Run via Supabase Management API query endpoint (service context).
-- ============================================================

-- -----------------------------------------------------------
-- 1. services: per-pet pricing flag
--    true  = visit price multiplies by number of pets on the booking
--            (e.g. dog walking, medication, fecal collection)
--    false = one visit covers the household regardless of pet count
--            (e.g. in-home sitting, drop-in, overnight, aquarium)
-- -----------------------------------------------------------
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS price_per_pet boolean NOT NULL DEFAULT false;

UPDATE public.services SET price_per_pet = true
  WHERE name IN (
    'Dog Walking',
    'Outdoor Fecal Collection',
    'Medication Administration',
    'Custom Pet Food',
    'Puppy & Kitten Visits',
    'Senior Pet Care'
  );

-- -----------------------------------------------------------
-- 2. bookings: end date, change-tracking, coherent status machine
-- -----------------------------------------------------------
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_end_date date,
  ADD COLUMN IF NOT EXISTS admin_modified   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS change_note      text;

UPDATE public.bookings SET booking_end_date = booking_date
  WHERE booking_end_date IS NULL;

-- Drop the old constraint first so legacy values can be remapped freely.
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

UPDATE public.bookings SET status = 'pending_company_review'
  WHERE status IN ('pending');

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check CHECK (status IN (
    'pending_company_review',    -- submitted; awaiting Tailwinds admin
    'changes_pending_customer',  -- admin changed price/schedule; customer must re-approve
    'confirmed',                 -- approved by both + invoice issued
    'in_progress',
    'completed',
    'cancelled',
    'declined'
  ));
ALTER TABLE public.bookings ALTER COLUMN status SET DEFAULT 'pending_company_review';

-- -----------------------------------------------------------
-- 3. booking_pets — multi-pet junction
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_pets (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  pet_id      uuid references public.pets(id) on delete set null,
  pet_name    text,   -- snapshot so display survives pet deletion
  created_at  timestamptz not null default now(),
  unique (booking_id, pet_id)
);

ALTER TABLE public.booking_pets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_pets: owner all" ON public.booking_pets;
CREATE POLICY "booking_pets: owner all" ON public.booking_pets
  FOR ALL
  USING     (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.customer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.customer_id = auth.uid()));

DROP POLICY IF EXISTS "booking_pets: admin all" ON public.booking_pets;
CREATE POLICY "booking_pets: admin all" ON public.booking_pets
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- -----------------------------------------------------------
-- 4. booking_visits — the slot rows (single source of truth)
--    line_total = unit_price * pet_count   (0 when is_quote)
--    subtotal   = sum(line_total) over a booking
--    travel     = per-day fee * distinct visit_date count
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_visits (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.bookings(id) on delete cascade,
  service_id   uuid references public.services(id),
  service_name text,                       -- snapshot
  visit_date   date not null,
  shift_id     text not null,              -- 'morning','evening', or custom slug
  shift_label  text not null,              -- 'Morning','Evening','Late Night', ...
  shift_time   time,                       -- optional specific time
  is_addon     boolean not null default false,
  unit_price   numeric(9,2) not null default 0,
  pet_count    int not null default 1,     -- pets billed on this visit
  is_quote     boolean not null default false,
  line_total   numeric(9,2) not null default 0,
  created_at   timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS booking_visits_booking_idx ON public.booking_visits(booking_id);
CREATE INDEX IF NOT EXISTS booking_visits_date_idx    ON public.booking_visits(visit_date);

ALTER TABLE public.booking_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_visits: owner all" ON public.booking_visits;
CREATE POLICY "booking_visits: owner all" ON public.booking_visits
  FOR ALL
  USING     (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.customer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.customer_id = auth.uid()));

DROP POLICY IF EXISTS "booking_visits: admin all" ON public.booking_visits;
CREATE POLICY "booking_visits: admin all" ON public.booking_visits
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- -----------------------------------------------------------
-- 5. invoices: coherent status machine + issue/payment metadata
--    line_items holds the persisted itemized snapshot at issue time.
-- -----------------------------------------------------------
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS issued_at        timestamptz,
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS payment_ref      text;

-- Drop the old constraint first so legacy values can be remapped freely.
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

UPDATE public.invoices SET status = 'draft'            WHERE status = 'pending_company_review';
UPDATE public.invoices SET status = 'awaiting_payment' WHERE status = 'invoice_approved';

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_status_check CHECK (status IN (
    'draft',                    -- created with booking; not yet payable by customer
    'pending_customer_review',  -- booking changed; awaiting customer re-approval
    'awaiting_payment',         -- issued; customer can pay
    'paid',
    'void'
  ));
ALTER TABLE public.invoices ALTER COLUMN status SET DEFAULT 'draft';

-- Allow admins to delete invoices (needed for clean re-issue); owners already covered.
DROP POLICY IF EXISTS "invoices: admin delete" ON public.invoices;
CREATE POLICY "invoices: admin delete" ON public.invoices
  FOR DELETE USING (is_admin());

-- -----------------------------------------------------------
-- 6. Clear pre-launch test data (redesign approved by owner).
--    No real customer bookings exist yet.
-- -----------------------------------------------------------
DELETE FROM public.invoices;
DELETE FROM public.bookings;
