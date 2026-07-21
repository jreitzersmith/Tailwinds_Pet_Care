-- ============================================================
-- Migration 009: Add invoice_approved status
-- Tailwinds Pet Care
-- Run once via Supabase SQL Editor.
-- ============================================================

-- Drop the existing CHECK constraint and recreate it with the new status value.
-- invoice_approved: admin has reviewed and approved; customer notification sent.
-- The status sits between pending_company_review and awaiting_payment in the flow.
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_status_check
  CHECK (status IN (
    'pending_company_review',
    'pending_customer_review',
    'invoice_approved',
    'awaiting_payment',
    'paid'
  ));
