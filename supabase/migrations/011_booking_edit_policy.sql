-- Allow customers to do a full edit on their own bookings.
-- The existing "cancel own" policy (WITH CHECK status='cancelled') only
-- permits status flips to cancelled.  This policy covers all other edits.
create policy "bookings: edit own" on public.bookings
  for update
  using  (customer_id = auth.uid())
  with check (customer_id = auth.uid());
