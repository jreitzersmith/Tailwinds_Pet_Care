-- ============================================================
-- Migration 005: Invoices table
-- Tailwinds Pet Care
-- Run once via Supabase SQL editor.
-- ============================================================

-- -------------------------------------------------------
-- 1. Invoice number sequence
--    Generates readable invoice numbers: TWC-01001, etc.
-- -------------------------------------------------------
create sequence if not exists public.invoice_number_seq start 1001;

-- -------------------------------------------------------
-- 2. invoices table
--    One invoice per booking. Created automatically when
--    a booking is submitted (via app logic in ConfirmStep).
--
--    Status flow:
--      pending_company_review  → Standard bookings land here first.
--                                Custom item bookings also start here.
--      pending_customer_review → After company builds a custom invoice,
--                                status moves here for customer to review.
--      awaiting_payment        → Company has approved; customer owes payment.
--      paid                    → Invoice settled.
-- -------------------------------------------------------
create table if not exists public.invoices (
  id               uuid        primary key default gen_random_uuid(),
  invoice_number   text        not null
                               default ('TWC-' || lpad(nextval('public.invoice_number_seq')::text, 5, '0'))
                               unique,
  booking_id       uuid        references public.bookings(id) on delete set null,
  customer_id      uuid        not null references public.customers(id) on delete cascade,
  status           text        not null default 'pending_company_review'
                               check (status in (
                                 'pending_company_review',
                                 'pending_customer_review',
                                 'awaiting_payment',
                                 'paid'
                               )),
  has_custom_items boolean     not null default false,

  -- Snapshot of booking details (for display / PDF without extra joins)
  service_name     text,
  booking_date     date,
  booking_end_date date,
  pet_name         text,
  zone             text,

  -- Line items (used when company builds a custom invoice)
  line_items       jsonb,

  -- Pricing
  subtotal         numeric(9,2),
  travel_fee       numeric(9,2) default 0,
  total_amount     numeric(9,2),

  -- Metadata
  notes            text,
  paid_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.invoices enable row level security;

-- Customers can read their own invoices
create policy "invoices: select own" on public.invoices
  for select using (customer_id = auth.uid());

-- Customers can insert invoices for themselves (triggered from booking submit)
create policy "invoices: insert own" on public.invoices
  for insert with check (customer_id = auth.uid());

-- -------------------------------------------------------
-- 3. updated_at trigger
-- -------------------------------------------------------
create trigger invoices_updated_at
  before update on public.invoices
  for each row execute procedure public.set_updated_at();
