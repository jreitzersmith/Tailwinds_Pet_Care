// Supabase Edge Function: send-invoice-email
// Issues the invoice (status -> awaiting_payment) and emails the customer an
// itemized invoice with a portal payment link.
//
// Required secret (Supabase Dashboard → Edge Functions → Secrets):
//   GMAIL_APP_PASSWORD — 16-character App Password from Google Account Security
//   (same credential used by send-booking-email)

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer       from 'npm:nodemailer'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FROM_ADDRESS  = '"Tailwinds Pet Care" <petsitter@tailwindspetcare.com>'
const PORTAL_URL    = 'https://tailwindspetcare.com/portal?tab=invoices'
const BRAND_BLUE    = '#68AFE6'
const BRAND_LIGHT   = '#A0AFC5'

function formatMoney(value: number | null | undefined): string {
  if (value == null) return '—'
  return '$' + Number(value).toFixed(2)
}

function buildLineItemsHTML(invoice: Record<string, unknown>): string {
  const items = invoice.line_items as Array<Record<string, unknown>> | null

  if (items && items.length > 0) {
    return items.map(li => `
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #eee;font-size:14px">${li.description || ''}</td>
        <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:center;font-size:14px">${li.qty ?? 1}</td>
        <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;font-size:14px">${formatMoney(li.unit_price as number)}</td>
        <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;font-size:14px;font-weight:600">${formatMoney(li.total as number)}</td>
      </tr>`).join('')
  }

  const travelRow = Number(invoice.travel_fee) > 0
    ? `<tr>
        <td style="padding:6px 0;border-bottom:1px solid #eee;font-size:14px">Travel Surcharge</td>
        <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:center;font-size:14px">1</td>
        <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;font-size:14px">${formatMoney(invoice.travel_fee as number)}</td>
        <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;font-size:14px;font-weight:600">${formatMoney(invoice.travel_fee as number)}</td>
      </tr>`
    : ''

  return `
    <tr>
      <td style="padding:6px 0;border-bottom:1px solid #eee;font-size:14px">${invoice.service_name || 'Pet Care Service'}</td>
      <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:center;font-size:14px">1</td>
      <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;font-size:14px">${formatMoney(invoice.subtotal as number)}</td>
      <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;font-size:14px;font-weight:600">${formatMoney(invoice.subtotal as number)}</td>
    </tr>
    ${travelRow}`
}

function buildEmailHTML(invoice: Record<string, unknown>, customerName: string, customerEmail: string): string {
  const dateRange = invoice.booking_end_date && invoice.booking_end_date !== invoice.booking_date
    ? `${invoice.booking_date} – ${invoice.booking_end_date}`
    : (invoice.booking_date as string || '—')

  const lineItemsHTML = buildLineItemsHTML(invoice)

  const subtotalRow = invoice.subtotal != null
    ? `<tr><td style="color:#555;font-size:14px;padding:3px 0">Subtotal</td><td style="text-align:right;font-size:14px;padding:3px 0">${formatMoney(invoice.subtotal as number)}</td></tr>`
    : ''

  const travelRow = Number(invoice.travel_fee) > 0
    ? `<tr><td style="color:#555;font-size:14px;padding:3px 0">Travel Fee</td><td style="text-align:right;font-size:14px;padding:3px 0">${formatMoney(invoice.travel_fee as number)}</td></tr>`
    : ''

  const notesSection = invoice.notes
    ? `<p style="margin-top:16px;font-size:13px;color:#555;"><strong>Note:</strong> ${invoice.notes}</p>`
    : ''

  return `
<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:24px;color:#333">

  <div style="text-align:center;margin-bottom:28px">
    <h1 style="color:${BRAND_BLUE};margin:0;font-size:26px">Tailwinds Pet Care</h1>
    <p style="color:${BRAND_LIGHT};margin:4px 0 0;font-size:14px">Professional pet care for the DFW area</p>
  </div>

  <h2 style="color:#155724;margin-top:0;margin-bottom:4px">&#10003; Invoice Approved</h2>
  <p style="margin:0 0 20px;font-size:15px">Hi ${customerName},</p>
  <p style="margin:0 0 20px;font-size:15px">
    Great news — your invoice has been reviewed and approved. Please find the details below and use
    the button at the bottom to view and pay your invoice through your customer portal.
  </p>

  <div style="background:#f8fbff;border-left:4px solid ${BRAND_BLUE};padding:16px;margin:0 0 24px;border-radius:4px">
    <table style="border-collapse:collapse;width:100%">
      <tr>
        <td style="padding:3px 0;color:${BRAND_LIGHT};font-size:13px;width:130px">Invoice #</td>
        <td style="font-weight:600;font-size:14px">${invoice.invoice_number}</td>
      </tr>
      <tr>
        <td style="padding:3px 0;color:${BRAND_LIGHT};font-size:13px">Customer</td>
        <td style="font-size:14px">${customerEmail}</td>
      </tr>
      <tr>
        <td style="padding:3px 0;color:${BRAND_LIGHT};font-size:13px">Pet</td>
        <td style="font-size:14px">${invoice.pet_name || '—'}</td>
      </tr>
      <tr>
        <td style="padding:3px 0;color:${BRAND_LIGHT};font-size:13px">Date(s)</td>
        <td style="font-size:14px">${dateRange}</td>
      </tr>
      ${invoice.zone ? `<tr><td style="padding:3px 0;color:${BRAND_LIGHT};font-size:13px">Zone</td><td style="font-size:14px">${invoice.zone}</td></tr>` : ''}
    </table>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
    <thead>
      <tr>
        <th style="text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:${BRAND_LIGHT};border-bottom:2px solid ${BRAND_BLUE};padding-bottom:6px">Description</th>
        <th style="text-align:center;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:${BRAND_LIGHT};border-bottom:2px solid ${BRAND_BLUE};padding-bottom:6px">Qty</th>
        <th style="text-align:right;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:${BRAND_LIGHT};border-bottom:2px solid ${BRAND_BLUE};padding-bottom:6px">Unit Price</th>
        <th style="text-align:right;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:${BRAND_LIGHT};border-bottom:2px solid ${BRAND_BLUE};padding-bottom:6px">Amount</th>
      </tr>
    </thead>
    <tbody>${lineItemsHTML}</tbody>
  </table>

  <table style="margin-left:auto;width:220px;border-collapse:collapse;margin-bottom:24px">
    <tbody>
      ${subtotalRow}
      ${travelRow}
      <tr style="border-top:2px solid ${BRAND_BLUE}">
        <td style="font-weight:700;font-size:15px;color:${BRAND_BLUE};padding-top:8px">Total Due</td>
        <td style="text-align:right;font-weight:700;font-size:15px;color:${BRAND_BLUE};padding-top:8px">${formatMoney(invoice.total_amount as number)}</td>
      </tr>
    </tbody>
  </table>

  ${notesSection}

  <div style="text-align:center;margin:28px 0">
    <a href="${PORTAL_URL}"
       style="display:inline-block;background:${BRAND_BLUE};color:#fff;text-decoration:none;
              padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;">
      View &amp; Pay Invoice
    </a>
  </div>

  <p style="font-size:14px;color:#555;text-align:center;margin-bottom:4px">
    Questions? We're happy to help.
  </p>
  <p style="font-size:14px;color:#555;text-align:center;margin:0">
    &#128222; (214) 377-0065 &nbsp;&bull;&nbsp;
    <a href="mailto:petsitter@tailwindspetcare.com" style="color:${BRAND_BLUE}">petsitter@tailwindspetcare.com</a>
  </p>

  <hr style="border:none;border-top:1px solid #eee;margin:28px 0">
  <p style="color:#bbb;font-size:11px;text-align:center;margin:0">
    Tailwinds Pet Care, LLC &middot; 2500 South Blvd, Dallas, TX 75215
  </p>

</div>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })
    }

    const appPassword = Deno.env.get('GMAIL_APP_PASSWORD')
    if (!appPassword) {
      console.error('GMAIL_APP_PASSWORD secret not configured')
      return new Response(JSON.stringify({ error: 'Email service not configured' }), { status: 500, headers: CORS })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { invoiceId } = await req.json()
    if (!invoiceId) {
      return new Response(JSON.stringify({ error: 'invoiceId is required' }), { status: 400, headers: CORS })
    }

    const { data: invoice, error: fetchErr } = await supabaseAdmin
      .from('invoices')
      .select('*, customers(email, full_name)')
      .eq('id', invoiceId)
      .single()

    if (fetchErr || !invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), { status: 404, headers: CORS })
    }

    const customerEmail = invoice.customers?.email
    const customerName  = invoice.customers?.full_name || 'Valued Customer'

    if (!customerEmail) {
      return new Response(JSON.stringify({ error: 'No customer email on record' }), { status: 422, headers: CORS })
    }

    // Issue the invoice: advance draft/pending_customer_review to awaiting_payment.
    if (invoice.status === 'draft' || invoice.status === 'pending_customer_review') {
      const { error: updateErr } = await supabaseAdmin
        .from('invoices')
        .update({ status: 'awaiting_payment', issued_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', invoiceId)

      if (updateErr) {
        console.error('Failed to update invoice status:', updateErr)
        return new Response(JSON.stringify({ error: 'Failed to update invoice status' }), { status: 500, headers: CORS })
      }

      invoice.status = 'awaiting_payment'
    }

    const transporter = nodemailer.createTransport({
      host:   'smtp.gmail.com',
      port:   587,
      secure: false,
      auth: {
        user: 'petsitter@tailwindspetcare.com',
        pass: appPassword,
      },
    })

    const serviceName = invoice.service_name || 'Pet Care Service'
    const subject     = `Invoice Approved — ${serviceName} (${invoice.invoice_number})`

    await transporter.sendMail({
      from:    FROM_ADDRESS,
      to:      customerEmail,
      subject,
      html:    buildEmailHTML(invoice, customerName, customerEmail),
    })

    return new Response(
      JSON.stringify({ success: true, invoiceNumber: invoice.invoice_number }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
})
