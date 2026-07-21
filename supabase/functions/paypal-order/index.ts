// Supabase Edge Function: paypal-order
// Creates and captures a PayPal order for an invoice, then marks it paid.
//
// Required secrets (Supabase Dashboard → Edge Functions → Secrets):
//   PAYPAL_CLIENT_ID — PayPal REST app client id (sandbox or production)
//   PAYPAL_SECRET    — PayPal REST app secret
//   PAYPAL_ENV       — 'sandbox' (default) or 'production'
// (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY auto-injected.)

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const PP_ENV  = Deno.env.get('PAYPAL_ENV') || 'sandbox'
const PP_BASE = PP_ENV === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
const PP_ID   = Deno.env.get('PAYPAL_CLIENT_ID') || ''
const PP_SEC  = Deno.env.get('PAYPAL_SECRET') || ''

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

async function ppToken(): Promise<string> {
  const res = await fetch(`${PP_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${PP_ID}:${PP_SEC}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const d = await res.json()
  if (!res.ok) throw new Error(d.error_description || 'PayPal auth failed.')
  return d.access_token
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const { action, invoiceId, orderId } = await req.json()
    if (!invoiceId) return json({ error: 'Missing invoiceId.' }, 400)
    if (!PP_ID || !PP_SEC) return json({ error: 'PayPal is not configured (missing PAYPAL_CLIENT_ID/PAYPAL_SECRET).' }, 500)

    const authHeader = req.headers.get('Authorization') || ''
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!
    const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: invoice, error: invErr } = await userClient
      .from('invoices')
      .select('id, status, total_amount, invoice_number')
      .eq('id', invoiceId).single()
    if (invErr || !invoice) return json({ error: 'Invoice not found or access denied.' }, 404)
    if (invoice.status === 'paid') return json({ ok: true, alreadyPaid: true })
    if (invoice.status !== 'awaiting_payment') return json({ error: 'This invoice is not ready for payment.' }, 409)

    const amount = Number(invoice.total_amount || 0)
    if (!(amount > 0)) return json({ error: 'Invoice has no payable amount.' }, 400)
    const value = amount.toFixed(2)
    const token = await ppToken()

    if (action === 'create') {
      const res = await fetch(`${PP_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: { currency_code: 'USD', value },
            description: `Invoice ${invoice.invoice_number || invoice.id}`.slice(0, 127),
          }],
        }),
      })
      const d = await res.json()
      if (!res.ok) return json({ error: d.message || 'Could not create PayPal order.' }, 402)
      return json({ id: d.id })
    }

    if (action === 'capture') {
      if (!orderId) return json({ error: 'Missing orderId.' }, 400)
      const res = await fetch(`${PP_BASE}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
      const d = await res.json()
      if (!res.ok || d.status !== 'COMPLETED') {
        const msg = d.details?.[0]?.description || d.message || 'PayPal payment was not completed.'
        return json({ error: msg }, 402)
      }
      const capId = d.purchase_units?.[0]?.payments?.captures?.[0]?.id || d.id
      const admin = createClient(SUPABASE_URL, SERVICE_KEY)
      await admin.from('invoices').update({
        status: 'paid', paid_at: new Date().toISOString(),
        payment_provider: 'paypal', payment_ref: capId, updated_at: new Date().toISOString(),
      }).eq('id', invoice.id)
      return json({ ok: true, captureId: capId })
    }

    return json({ error: 'Unknown action.' }, 400)
  } catch (err) {
    return json({ error: (err as Error).message || 'Unexpected error.' }, 500)
  }
})
