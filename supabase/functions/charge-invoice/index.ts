// Supabase Edge Function: charge-invoice
// Charges an invoice with Square (server-side) and marks it paid.
//
// Required secrets (Supabase Dashboard → Edge Functions → Secrets):
//   SQUARE_ACCESS_TOKEN — Square access token (sandbox or production)
//   SQUARE_ENV          — 'sandbox' (default) or 'production'
//   SQUARE_LOCATION_ID  — (optional) preferred Location ID; auto-derived from the
//                         token if unset or not owned by the token's merchant.
// (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY are auto-injected.)

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SQUARE_ENV      = Deno.env.get('SQUARE_ENV') || 'sandbox'
const SQUARE_BASE     = SQUARE_ENV === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com'
const SQUARE_TOKEN    = Deno.env.get('SQUARE_ACCESS_TOKEN') || ''
const SQUARE_LOCATION = Deno.env.get('SQUARE_LOCATION_ID') || ''
const SQ_VERSION      = '2024-07-17'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
const sqHeaders = {
  'Square-Version': SQ_VERSION,
  'Authorization': `Bearer ${SQUARE_TOKEN}`,
  'Content-Type': 'application/json',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const { invoiceId, sourceId, appId } = await req.json()
    if (!invoiceId || !sourceId) return json({ error: 'Missing invoiceId or sourceId.' }, 400)
    if (!SQUARE_TOKEN) return json({ error: 'Square is not configured (missing SQUARE_ACCESS_TOKEN).' }, 500)

    const authHeader = req.headers.get('Authorization') || ''
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!
    const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Caller-scoped client so RLS confirms the invoice belongs to this user.
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: invoice, error: invErr } = await userClient
      .from('invoices')
      .select('id, customer_id, status, total_amount, invoice_number, booking_id')
      .eq('id', invoiceId)
      .single()
    if (invErr || !invoice) return json({ error: 'Invoice not found or access denied.' }, 404)
    if (invoice.status === 'paid') return json({ ok: true, alreadyPaid: true })
    if (invoice.status !== 'awaiting_payment')
      return json({ error: 'This invoice is not ready for payment.' }, 409)

    const amount = Number(invoice.total_amount || 0)
    if (!(amount > 0)) return json({ error: 'Invoice has no payable amount.' }, 400)
    const amountCents = Math.round(amount * 100)

    // ── Verify the token's application matches the app that created the card token.
    let tokenAppId: string | null = null
    try {
      const ts  = await fetch(`${SQUARE_BASE}/oauth2/token/status`, { method: 'POST', headers: sqHeaders, body: '{}' })
      const tsd = await ts.json()
      tokenAppId = tsd.client_id || null
    } catch { /* non-fatal */ }
    if (appId && tokenAppId && appId !== tokenAppId) {
      return json({ error:
        `Square configuration mismatch: the server's access token belongs to application "${tokenAppId}", ` +
        `but the payment form uses application "${appId}". Set the SQUARE_ACCESS_TOKEN secret to an access ` +
        `token from application "${appId}".` }, 400)
    }

    // ── Derive a valid location owned by the token's merchant (avoids
    //    "Not authorized to take payments with location_id" mismatches).
    let locationId = SQUARE_LOCATION
    try {
      const lr = await fetch(`${SQUARE_BASE}/v2/locations`, { headers: sqHeaders })
      const ld = await lr.json()
      const active = (ld.locations || []).filter((l: Record<string, unknown>) => l.status === 'ACTIVE')
      if (active.length && !active.find((l: Record<string, unknown>) => l.id === locationId)) {
        locationId = active[0].id as string
      }
    } catch { /* fall back to configured location */ }
    if (!locationId) return json({ error: 'No Square location available for this access token.' }, 500)

    // ── Charge via Square (amount comes from the DB, never the client).
    const sqRes = await fetch(`${SQUARE_BASE}/v2/payments`, {
      method: 'POST',
      headers: sqHeaders,
      body: JSON.stringify({
        source_id: sourceId,
        idempotency_key: crypto.randomUUID(),   // <= 45 chars
        amount_money: { amount: amountCents, currency: 'USD' },
        location_id: locationId,
        note: `Invoice ${invoice.invoice_number || invoice.id}`,
        reference_id: (invoice.invoice_number || invoice.id).toString().slice(0, 40),
      }),
    })
    const sqData = await sqRes.json()
    if (!sqRes.ok || sqData.errors) {
      const msg = sqData.errors?.[0]?.detail || 'Card was declined.'
      return json({ error: msg }, 402)
    }
    const payment = sqData.payment
    if (payment?.status !== 'COMPLETED' && payment?.status !== 'APPROVED') {
      return json({ error: `Payment ${payment?.status || 'not completed'}.` }, 402)
    }

    // Mark the invoice paid with the service role (bypasses RLS for the write).
    const admin = createClient(SUPABASE_URL, SERVICE_KEY)
    await admin.from('invoices').update({
      status:           'paid',
      paid_at:          new Date().toISOString(),
      payment_provider: 'square',
      payment_ref:      payment.id,
      updated_at:       new Date().toISOString(),
    }).eq('id', invoice.id)

    return json({ ok: true, paymentId: payment.id })
  } catch (err) {
    return json({ error: (err as Error).message || 'Unexpected error.' }, 500)
  }
})
