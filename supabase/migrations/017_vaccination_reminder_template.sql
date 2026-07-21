-- ============================================================
-- Migration 017: Vaccination Reminder Email Template (catalog entry)
-- Registers the email type in the same catalog used by the Admin
-- Settings panel. The actual send (reminder-vaccinations edge
-- function) builds its HTML inline, matching the existing
-- send-booking-email / send-invoice-email pattern in this codebase
-- rather than reading body_html at send time.
-- ============================================================

insert into public.email_templates (slug, name, description, subject, body_html, variables)
values (
  'vaccination_reminder',
  'Vaccination Reminder',
  'Sent automatically ahead of a pet''s upcoming vaccination due date (reminder-vaccinations scheduled function).',
  'Reminder: {{pet_name}}''s {{vaccine}} is due soon',
$HTML$
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333">
  <div style="text-align:center;margin-bottom:24px">
    <h1 style="color:#68AFE6;margin:0;font-size:26px">Tailwinds Pet Care</h1>
    <p style="color:#A0AFC5;margin:4px 0 0;font-size:14px">Professional pet care for the DFW area</p>
  </div>

  <h2 style="color:#68AFE6;margin-top:0">Vaccination Reminder</h2>
  <p>Hi {{customer_name}},</p>
  <p>{{pet_name}}'s <strong>{{vaccine}}</strong> vaccination is due on <strong>{{next_due}}</strong>.</p>
  <p>Please schedule a visit with your vet and update the record in your Tailwinds portal afterward
     so we always have {{pet_name}}'s current vaccination status on file.</p>
  <p><a href="{{portal_url}}" style="color:#68AFE6">Update {{pet_name}}'s record &rarr;</a></p>

  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="color:#bbb;font-size:11px;text-align:center">
    Tailwinds Pet Care, LLC &middot; 2500 South Blvd, Dallas, TX 75215
  </p>
</div>
$HTML$,
  array['{{customer_name}}', '{{pet_name}}', '{{vaccine}}', '{{next_due}}', '{{portal_url}}']
) on conflict (slug) do nothing;
