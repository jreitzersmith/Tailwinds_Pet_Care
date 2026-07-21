// Supabase Edge Function: reminder-vaccinations
// Scheduled daily (see .github/workflows/reminder-vaccinations.yml) to email
// customers when a pet's vaccination "next due" date is approaching.
//
// Fires at exactly 14, 7, 1, and 0 days out (once each), rather than tracking
// a "sent" flag on the embedded vaccinations JSON -- simple and idempotent
// enough for a once-daily job.
//
// Required secret (same as send-booking-email / send-invoice-email):
//   GMAIL_APP_PASSWORD — 16-character App Password for petsitter@tailwindspetcare.com
//
// Invoke with the Supabase service role key as a Bearer token (see
// .github/workflows/reminder-vaccinations.yml). This function is not meant to
// be called from the frontend.

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer       from 'npm:nodemailer'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FROM_ADDRESS = '"Tailwinds Pet Care" <petsitter@tailwindspetcare.com>'
const PORTAL_URL   = 'https://tailwindspetcare.com/portal?tab=mypets'
const REMIND_AT_DAYS = [14, 7, 1, 0]

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null
  const due   = new Date(dateStr + 'T00:00:00Z')
  if (isNaN(due.getTime())) return null
  const today = new Date()
  const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  return Math.round((due.getTime() - todayUTC.getTime()) / 86400000)
}

function buildHTML(customerName: string, petName: string, vaccine: string, nextDue: string, dueLabel: string): string {
  return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333">
  <div style="text-align:center;margin-bottom:24px">
    <h1 style="color:#68AFE6;margin:0;font-size:26px">Tailwinds Pet Care</h1>
    <p style="color:#A0AFC5;margin:4px 0 0;font-size:14px">Professional pet care for the DFW area</p>
  </div>

  <h2 style="color:#68AFE6;margin-top:0">Vaccination Reminder</h2>
  <p>Hi ${customerName},</p>
  <p>${petName}'s <strong>${vaccine}</strong> vaccination is ${dueLabel} <strong>${nextDue}</strong>.</p>
  <p>Please schedule a visit with your vet and update the record in your Tailwinds portal afterward
     so we always have ${petName}'s current vaccination status on file.</p>
  <p><a href="${PORTAL_URL}" style="color:#68AFE6">Update ${petName}'s record &rarr;</a></p>

  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="color:#bbb;font-size:11px;text-align:center">
    Tailwinds Pet Care, LLC &middot; 2500 South Blvd, Dallas, TX 75215
  </p>
</div>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const appPassword = Deno.env.get('GMAIL_APP_PASSWORD')
    if (!appPassword) {
      console.error('GMAIL_APP_PASSWORD secret not configured')
      return new Response(JSON.stringify({ error: 'Email service not configured' }), { status: 500, headers: CORS })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: pets, error: petsErr } = await supabaseAdmin
      .from('pets')
      .select('id, name, vaccinations, customers ( full_name, email )')
      .not('vaccinations', 'eq', '[]')

    if (petsErr) throw petsErr

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: 'petsitter@tailwindspetcare.com', pass: appPassword },
    })

    let sent = 0
    const errors: string[] = []

    for (const pet of pets || []) {
      const toEmail = pet.customers?.email
      const toName  = pet.customers?.full_name || 'Valued Customer'
      if (!toEmail) continue

      const vaccinations = Array.isArray(pet.vaccinations) ? pet.vaccinations : []
      for (const v of vaccinations) {
        if (!v?.next_due) continue
        const days = daysUntil(v.next_due)
        if (days === null || !REMIND_AT_DAYS.includes(days)) continue

        const dueLabel = days === 0 ? 'due today,' : days < 0 ? 'overdue since' : 'due in ' + days + ' day' + (days === 1 ? '' : 's') + ' on'
        const subject = days === 0
          ? `Reminder: ${pet.name}'s ${v.vaccine || 'vaccination'} is due today`
          : `Reminder: ${pet.name}'s ${v.vaccine || 'vaccination'} is due soon`

        try {
          await transporter.sendMail({
            from:    FROM_ADDRESS,
            to:      toEmail,
            subject,
            html:    buildHTML(toName, pet.name, v.vaccine || 'vaccination', v.next_due, dueLabel),
          })
          sent++
        } catch (mailErr) {
          errors.push(`${pet.name} (${v.vaccine}): ${mailErr.message}`)
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, errors }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
})
