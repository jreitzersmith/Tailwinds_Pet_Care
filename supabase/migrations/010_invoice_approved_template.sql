-- ============================================================
-- Migration 010: Invoice Approved Email Template
-- Tailwinds Pet Care
-- Adds the invoice_approved seed row to email_templates.
-- The send-invoice-email edge function mirrors this HTML.
-- Variables marked {{variable}} are for reference/admin editing;
-- dynamic blocks (line_items_html, subtotal_row, etc.) are
-- pre-rendered by the edge function before sending.
-- ============================================================

insert into public.email_templates (slug, name, description, subject, body_html, variables)
values (
  'invoice_approved',
  'Invoice Approved',
  'Sent automatically when an admin clicks "Approve Invoice" in the admin panel. Includes an itemized line-items table and a portal payment link.',
  'Invoice Approved — {{service_name}} ({{invoice_number}})',
$HTML$
<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:24px;color:#333">

  <div style="text-align:center;margin-bottom:28px">
    <h1 style="color:#68AFE6;margin:0;font-size:26px">Tailwinds Pet Care</h1>
    <p style="color:#A0AFC5;margin:4px 0 0;font-size:14px">Professional pet care for the DFW area</p>
  </div>

  <h2 style="color:#155724;margin-top:0;margin-bottom:4px">&#10003; Invoice Approved</h2>
  <p style="margin:0 0 20px;font-size:15px">Hi {{customer_name}},</p>
  <p style="margin:0 0 20px;font-size:15px">
    Great news — your invoice has been reviewed and approved. Please find the details below and use
    the button at the bottom to view and pay your invoice through your customer portal.
  </p>

  <div style="background:#f8fbff;border-left:4px solid #68AFE6;padding:16px;margin:0 0 24px;border-radius:4px">
    <table style="border-collapse:collapse;width:100%">
      <tr>
        <td style="padding:3px 0;color:#A0AFC5;font-size:13px;width:130px">Invoice #</td>
        <td style="font-weight:600;font-size:14px">{{invoice_number}}</td>
      </tr>
      <tr>
        <td style="padding:3px 0;color:#A0AFC5;font-size:13px">Customer</td>
        <td style="font-size:14px">{{customer_email}}</td>
      </tr>
      <tr>
        <td style="padding:3px 0;color:#A0AFC5;font-size:13px">Pet</td>
        <td style="font-size:14px">{{pet_name}}</td>
      </tr>
      <tr>
        <td style="padding:3px 0;color:#A0AFC5;font-size:13px">Date(s)</td>
        <td style="font-size:14px">{{date_range}}</td>
      </tr>
      {{#if zone}}
      <tr>
        <td style="padding:3px 0;color:#A0AFC5;font-size:13px">Zone</td>
        <td style="font-size:14px">{{zone}}</td>
      </tr>
      {{/if}}
    </table>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
    <thead>
      <tr>
        <th style="text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#A0AFC5;border-bottom:2px solid #68AFE6;padding-bottom:6px">Description</th>
        <th style="text-align:center;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#A0AFC5;border-bottom:2px solid #68AFE6;padding-bottom:6px">Qty</th>
        <th style="text-align:right;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#A0AFC5;border-bottom:2px solid #68AFE6;padding-bottom:6px">Unit Price</th>
        <th style="text-align:right;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#A0AFC5;border-bottom:2px solid #68AFE6;padding-bottom:6px">Amount</th>
      </tr>
    </thead>
    <tbody>{{line_items_html}}</tbody>
  </table>

  <table style="margin-left:auto;width:220px;border-collapse:collapse;margin-bottom:24px">
    <tbody>
      {{subtotal_row}}
      {{travel_fee_row}}
      <tr style="border-top:2px solid #68AFE6">
        <td style="font-weight:700;font-size:15px;color:#68AFE6;padding-top:8px">Total Due</td>
        <td style="text-align:right;font-weight:700;font-size:15px;color:#68AFE6;padding-top:8px">{{total_amount}}</td>
      </tr>
    </tbody>
  </table>

  {{#if notes}}
  <p style="margin-top:16px;font-size:13px;color:#555;"><strong>Note:</strong> {{notes}}</p>
  {{/if}}

  <div style="text-align:center;margin:28px 0">
    <a href="{{portal_url}}"
       style="display:inline-block;background:#68AFE6;color:#fff;text-decoration:none;
              padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;">
      View &amp; Pay Invoice
    </a>
  </div>

  <p style="font-size:14px;color:#555;text-align:center;margin-bottom:4px">
    Questions? We're happy to help.
  </p>
  <p style="font-size:14px;color:#555;text-align:center;margin:0">
    &#128222; (214) 377-0065 &nbsp;&bull;&nbsp;
    <a href="mailto:petsitter@tailwindspetcare.com" style="color:#68AFE6">petsitter@tailwindspetcare.com</a>
  </p>

  <hr style="border:none;border-top:1px solid #eee;margin:28px 0">
  <p style="color:#bbb;font-size:11px;text-align:center;margin:0">
    Tailwinds Pet Care, LLC &middot; 2500 South Blvd, Dallas, TX 75215
  </p>

</div>
$HTML$,
  array[
    '{{customer_name}}',
    '{{customer_email}}',
    '{{invoice_number}}',
    '{{service_name}}',
    '{{pet_name}}',
    '{{date_range}}',
    '{{zone}}',
    '{{line_items_html}}',
    '{{subtotal_row}}',
    '{{travel_fee_row}}',
    '{{total_amount}}',
    '{{notes}}',
    '{{portal_url}}'
  ]
) on conflict (slug) do nothing;
