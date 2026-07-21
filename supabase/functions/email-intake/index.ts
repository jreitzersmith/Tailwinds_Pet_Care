// Supabase Edge Function: email-intake
// Polls the records@tailwindspetcare.com Google Workspace mailbox via IMAP
// for unread mail and files any attachments into pet-documents. Invoked on
// a schedule via pg_cron + pg_net (see migration 018_scheduled_jobs.sql --
// this Supabase project has no external CI, so scheduling lives in the DB).
//
// Required secrets (Supabase Dashboard -> Edge Functions -> Secrets):
//   RECORDS_GMAIL_ADDRESS       — records@tailwindspetcare.com
//   RECORDS_GMAIL_APP_PASSWORD  — 16-char App Password for that mailbox (IMAP + SMTP)
//
// How a customer uses this: email or forward a vet document to
// records@tailwindspetcare.com. Mentioning one or more pets' names in the
// subject or body links the document to all of them (e.g. a shared vet
// receipt); otherwise it lands in "Unsorted Documents" in the portal.
// Sender is matched against customers.email, so send from the email
// address on file (or forward, keeping your own address as sender).
// pet_documents <-> pets is many-to-many via pet_document_links.

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ImapFlow }     from 'npm:imapflow@1'
import { simpleParser } from 'npm:mailparser@3'
import nodemailer       from 'npm:nodemailer'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_MESSAGES_PER_RUN = 20

function extFromFilename(name: string | undefined, mime: string): string {
  if (name && name.includes('.')) return name.split('.').pop()!.toLowerCase()
  const guess = mime.split('/')[1] || 'bin'
  return guess.replace('jpeg', 'jpg')
}

function joinNames(names: string[]): string {
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const address     = Deno.env.get('RECORDS_GMAIL_ADDRESS')
  const appPassword = Deno.env.get('RECORDS_GMAIL_APP_PASSWORD')
  if (!address || !appPassword) {
    console.error('RECORDS_GMAIL_ADDRESS / RECORDS_GMAIL_APP_PASSWORD not configured')
    return new Response(JSON.stringify({ error: 'Email intake not configured' }), { status: 500, headers: CORS })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: address, pass: appPassword },
    logger: false,
  })

  let processed = 0
  let filed     = 0
  const errors: string[] = []

  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')
    try {
      const uids = await client.search({ seen: false })
      const batch = (uids || []).slice(0, MAX_MESSAGES_PER_RUN)

      const { data: customers } = await supabaseAdmin
        .from('customers')
        .select('id, full_name, email')
        .not('email', 'is', null)

      for (const uid of batch) {
        processed++
        try {
          const msg = await client.fetchOne(uid, { source: true })
          const parsed = await simpleParser(msg.source)

          const fromAddr = parsed.from?.value?.[0]?.address?.toLowerCase() || ''
          const customer = (customers || []).find(c => (c.email || '').toLowerCase() === fromAddr)

          if (!customer || !parsed.attachments?.length) {
            await client.messageFlagsAdd(uid, ['\\Seen'])
            continue
          }

          const { data: pets } = await supabaseAdmin
            .from('pets').select('id, name').eq('customer_id', customer.id)

          const haystack = `${parsed.subject || ''} ${parsed.text || ''}`.toLowerCase()
          const matchedPets = (pets || []).filter(p => haystack.includes(p.name.toLowerCase()))

          for (let i = 0; i < parsed.attachments.length; i++) {
            const att = parsed.attachments[i]
            const ext  = extFromFilename(att.filename, att.contentType)
            const path = `${customer.id}/email_${Date.now()}_${i}.${ext}`

            const { error: upErr } = await supabaseAdmin.storage
              .from('pet-documents')
              .upload(path, att.content, { contentType: att.contentType, upsert: false })
            if (upErr) { errors.push(`${fromAddr} attachment ${i}: ${upErr.message}`); continue }

            const { data: { publicUrl } } = supabaseAdmin.storage.from('pet-documents').getPublicUrl(path)

            const { data: inserted, error: insErr } = await supabaseAdmin
              .from('pet_documents')
              .insert({
                customer_id:  customer.id,
                doc_type:     'other',
                title:        parsed.subject || att.filename || 'Emailed document',
                storage_path: path,
                url:          publicUrl,
                source:       'email',
                source_ref:   parsed.messageId || String(uid),
              })
              .select('id')
              .single()
            if (insErr || !inserted) { errors.push(`${fromAddr} attachment ${i}: ${insErr?.message}`); continue }

            if (matchedPets.length > 0) {
              await supabaseAdmin.from('pet_document_links').insert(
                matchedPets.map(p => ({ document_id: inserted.id, pet_id: p.id }))
              )
            }
            filed++
          }

          await client.messageFlagsAdd(uid, ['\\Seen'])

          // Best-effort confirmation reply; failure here shouldn't fail the run.
          try {
            const transporter = nodemailer.createTransport({
              host: 'smtp.gmail.com', port: 587, secure: false,
              auth: { user: address, pass: appPassword },
            })
            await transporter.sendMail({
              from:    `"Tailwinds Pet Care Records" <${address}>`,
              to:      fromAddr,
              subject: 'We received your document',
              text: matchedPets.length > 0
                ? `Thanks! We've saved your document for ${joinNames(matchedPets.map(p => p.name))}.`
                : `Thanks! We've saved your document. We weren't sure which pet it's for -- please assign it in your portal under Unsorted Documents (tailwindspetcare.com/portal).`,
            })
          } catch (mailErr) {
            console.error('confirmation reply failed', mailErr)
          }
        } catch (perMsgErr) {
          errors.push(`uid ${uid}: ${perMsgErr.message}`)
          try { await client.messageFlagsAdd(uid, ['\\Seen']) } catch (_) { /* ignore */ }
        }
      }
    } finally {
      lock.release()
    }
    await client.logout()
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message, processed, filed, errors }), { status: 500, headers: CORS })
  }

  return new Response(
    JSON.stringify({ success: true, processed, filed, errors }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } },
  )
})
