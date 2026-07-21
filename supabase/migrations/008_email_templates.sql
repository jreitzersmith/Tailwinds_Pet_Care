-- ============================================================
-- Migration 008: Email Templates
-- Tailwinds Pet Care
-- Run once via Supabase SQL Editor.
-- ============================================================

-- -------------------------------------------------------
-- 1. email_templates table
--    One row per transactional email type.
--    slug is the stable identifier used by edge functions.
--    body_html supports {{variable}} and {{#if var}}...{{/if}}.
-- -------------------------------------------------------
create table if not exists public.email_templates (
  id          uuid     primary key default gen_random_uuid(),
  slug        text     not null unique,
  name        text     not null,
  description text,
  subject     text     not null,
  body_html   text     not null,
  variables   text[]   not null default '{}',
  is_active   boolean  not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.email_templates enable row level security;

-- Authenticated users (including admins in the UI) can read all templates
create policy "email_templates: select authenticated" on public.email_templates
  for select using (auth.role() = 'authenticated');

-- Only admins can insert / update / delete
create policy "email_templates: admin insert" on public.email_templates
  for insert with check (
    exists (select 1 from public.customers where id = auth.uid() and is_admin = true)
  );

create policy "email_templates: admin update" on public.email_templates
  for update using (
    exists (select 1 from public.customers where id = auth.uid() and is_admin = true)
  );

create policy "email_templates: admin delete" on public.email_templates
  for delete using (
    exists (select 1 from public.customers where id = auth.uid() and is_admin = true)
  );

create trigger email_templates_updated_at
  before update on public.email_templates
  for each row execute procedure public.set_updated_at();


-- -------------------------------------------------------
-- 2. Seed: Booking Confirmation template
--    Uses {{variable}} substitution and {{#if var}}...{{/if}}
--    conditionals, processed by the send-booking-email function.
-- -------------------------------------------------------
insert into public.email_templates (slug, name, description, subject, body_html, variables)
values (
  'booking_confirmed',
  'Booking Confirmation',
  'Sent automatically when a booking status is changed to "Confirmed" in the admin panel.',
  'Booking Confirmed — {{service_name}} on {{booking_date}}',
$HTML$
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333">
  <div style="text-align:center;margin-bottom:24px">
    <h1 style="color:#68AFE6;margin:0;font-size:26px">Tailwinds Pet Care</h1>
    <p style="color:#A0AFC5;margin:4px 0 0;font-size:14px">Professional pet care for the DFW area</p>
  </div>

  <h2 style="color:#28A745;margin-top:0">&#10003; Booking Confirmed</h2>
  <p>Hi {{customer_name}},</p>
  <p>Your booking has been confirmed. Here are the details:</p>

  <div style="background:#f8fbff;border-left:4px solid #68AFE6;padding:16px;margin:16px 0;border-radius:4px">
    <table style="border-collapse:collapse;width:100%">
      <tr>
        <td style="padding:4px 0;color:#A0AFC5;font-size:13px;width:120px">Service</td>
        <td style="font-weight:600">{{service_name}}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#A0AFC5;font-size:13px">Pet</td>
        <td>{{pet_name}}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#A0AFC5;font-size:13px">Date(s)</td>
        <td>{{date_range}}</td>
      </tr>
      {{#if booking_time}}
      <tr>
        <td style="padding:4px 0;color:#A0AFC5;font-size:13px">Time</td>
        <td>{{booking_time}}</td>
      </tr>
      {{/if}}
    </table>
  </div>

  <p>If you have questions or need to make changes, just reply to this email or reach us at:</p>
  <p>
    &#128222; (214) 377-0065<br>
    &#128231; <a href="mailto:petsitter@tailwindspetcare.com" style="color:#68AFE6">petsitter@tailwindspetcare.com</a>
  </p>
  <p>Thank you for choosing Tailwinds Pet Care — we look forward to caring for {{pet_name}}!</p>

  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="color:#bbb;font-size:11px;text-align:center">
    Tailwinds Pet Care, LLC &middot; 2500 South Blvd, Dallas, TX 75215
  </p>
</div>
$HTML$,
  array[
    '{{customer_name}}',
    '{{service_name}}',
    '{{pet_name}}',
    '{{date_range}}',
    '{{booking_date}}',
    '{{booking_time}}'
  ]
) on conflict (slug) do nothing;
