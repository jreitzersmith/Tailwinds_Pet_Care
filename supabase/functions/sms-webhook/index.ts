// Supabase Edge Function: sms-webhook
// Public Twilio inbound webhook (SMS/MMS). Configure this function's URL as
// the "A MESSAGE COMES IN" webhook on the Twilio phone number, HTTP POST.
//
// Deployed with --no-verify-jwt (Twilio cannot send a Supabase JWT). Instead,
// every request's authenticity is verified via the X-Twilio-Signature header
// using TWILIO_AUTH_TOKEN, per Twilio's request-validation algorithm.
//
// Required secrets (Supabase Dashboard -> Edge Functions -> Secrets):
//   TWILIO_ACCOUNT_SID — Account SID (used to authenticate MediaUrl downloads)
//   TWILIO_AUTH_TOKEN  — Auth Token (used for signature validation + media auth)
//
// How a customer uses this: text a photo of a document to the Tailwinds
// number. Mentioning one or more pets' names in the message links the
// document to all of them (e.g. a shared vet receipt); otherwise it lands
// in the customer's "Unsorted Documents" queue in the portal for
// assignment (pet_documents <-> pets is many-to-many via pet_document_links).

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function twiml(message: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
  return new Response(xml, { headers: { ...CORS, 'Content-Type': 'text/xml' } })
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function joinNames(names: string[]): string {
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

// Normalize a phone number to digits only, dropping a leading country code
// of "1" so it lines up with however the number is stored in `customers.phone`.
function normalizePhone(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '')
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
}

async function hmacSha1Base64(key: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
}

// Twilio request validation: https://www.twilio.com/docs/usage/security#validating-requests
async function isValidTwilioRequest(url: string, params: Record<string, string>, signature: string, authToken: string): Promise<boolean> {
  const sortedKeys = Object.keys(params).sort()
  let data = url
  for (const key of sortedKeys) data += key + params[key]
  const expected = await hmacSha1Base64(authToken, data)
  return expected === signature
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken  = Deno.env.get('TWILIO_AUTH_TOKEN')
  if (!accountSid || !authToken) {
    console.error('TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not configured')
    return new Response('Service not configured', { status: 500, headers: CORS })
  }

  const bodyText = await req.text()
  const form = new URLSearchParams(bodyText)
  const params: Record<string, string> = {}
  for (const [k, v] of form.entries()) params[k] = v

  const signature = req.headers.get('X-Twilio-Signature') || ''
  const valid = await isValidTwilioRequest(req.url, params, signature, authToken)
  if (!valid) {
    console.error('Invalid Twilio signature')
    return new Response('Forbidden', { status: 403, headers: CORS })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const fromPhone  = normalizePhone(params['From'] || '')
    const messageSid = params['MessageSid'] || crypto.randomUUID()
    const bodyMsg    = (params['Body'] || '').trim()
    const numMedia   = parseInt(params['NumMedia'] || '0', 10)

    const { data: customers } = await supabaseAdmin
      .from('customers')
      .select('id, full_name, phone')
      .not('phone', 'is', null)

    const customer = (customers || []).find(c => normalizePhone(c.phone) === fromPhone && fromPhone.length > 0)

    if (!customer) {
      return twiml("We couldn't match this number to a Tailwinds account. Please text from your account's phone number, or upload documents at tailwindspetcare.com/portal.")
    }

    if (numMedia === 0) {
      return twiml('Got your message! To save a document, text a photo of it — mention your pet\'s name (or names) so we can file it correctly.')
    }

    const { data: pets } = await supabaseAdmin
      .from('pets')
      .select('id, name')
      .eq('customer_id', customer.id)

    const matchedPets = (pets || []).filter(p =>
      bodyMsg.toLowerCase().includes(p.name.toLowerCase())
    )

    let savedCount = 0
    for (let i = 0; i < numMedia; i++) {
      const mediaUrl  = params[`MediaUrl${i}`]
      const mediaType = params[`MediaContentType${i}`] || 'application/octet-stream'
      if (!mediaUrl) continue

      const mediaRes = await fetch(mediaUrl, {
        headers: { Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`) },
      })
      if (!mediaRes.ok) continue
      const bytes = new Uint8Array(await mediaRes.arrayBuffer())

      const ext  = (mediaType.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
      const path = `${customer.id}/sms_${Date.now()}_${i}.${ext}`

      const { error: upErr } = await supabaseAdmin.storage
        .from('pet-documents')
        .upload(path, bytes, { contentType: mediaType, upsert: false })
      if (upErr) { console.error('upload failed', upErr); continue }

      const { data: { publicUrl } } = supabaseAdmin.storage.from('pet-documents').getPublicUrl(path)

      const { data: inserted, error: insErr } = await supabaseAdmin
        .from('pet_documents')
        .insert({
          customer_id:  customer.id,
          doc_type:     'other',
          title:        bodyMsg || 'Texted document',
          storage_path: path,
          url:          publicUrl,
          source:       'sms',
          source_ref:   messageSid,
        })
        .select('id')
        .single()
      if (insErr || !inserted) { console.error('insert failed', insErr); continue }

      if (matchedPets.length > 0) {
        await supabaseAdmin.from('pet_document_links').insert(
          matchedPets.map(p => ({ document_id: inserted.id, pet_id: p.id }))
        )
      }
      savedCount++
    }

    if (savedCount === 0) {
      return twiml("We received your text but couldn't save the attachment. Please try again or upload it at tailwindspetcare.com/portal.")
    }

    return twiml(matchedPets.length > 0
      ? `Got it! Saved ${savedCount} document(s) for ${joinNames(matchedPets.map(p => p.name))}.`
      : `Saved ${savedCount} document(s). We weren't sure which pet this is for — assign it in your portal under Unsorted Documents.`)
  } catch (err) {
    console.error(err)
    return twiml('Something went wrong saving your document. Please try again shortly or use the portal.')
  }
})
