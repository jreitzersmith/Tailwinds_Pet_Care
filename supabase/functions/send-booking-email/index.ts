// Supabase Edge Function: send-booking-email
// Sends booking confirmation emails via Google Workspace SMTP.
//
// Required secret (Supabase Dashboard → Edge Functions → Secrets):
//   GMAIL_APP_PASSWORD — 16-character App Password from Google Account Security
//
// How to generate an App Password:
//   1. Sign into petsitter@tailwindspetcare.com at myaccount.google.com
//   2. Security → 2-Step Verification (must be ON)
//   3. Security → App passwords → create one named "Tailwinds Booking Emails"
//   4. Copy the 16-character password and add as GMAIL_APP_PASSWORD secret

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer       from 'npm:nodemailer'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FROM_ADDRESS = '"Tailwinds Pet Care" <petsitter@tailwindspetcare.com>'

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

    const { bookingId } = await req.json()
    if (!bookingId) {
      return new Response(JSON.stringify({ error: 'bookingId is required' }), { status: 400, headers: CORS })
    }

    const { data: booking, error: bErr } = await supabaseAdmin
      .from('bookings')
      .select(`
        id, booking_date, booking_end_date, booking_time, status,
        customers ( full_name, email ),
        services  ( name ),
        pets      ( name )
      `)
      .eq('id', bookingId)
      .single()

    if (bErr || !booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404, headers: CORS })
    }

    const toEmail     = booking.customers?.email
    const toName      = booking.customers?.full_name || 'Valued Customer'
    const serviceName = booking.services?.name       || 'Pet Care Service'
    const petName     = booking.pets?.name           || 'your pet'
    const dateRange   = booking.booking_end_date && booking.booking_end_date !== booking.booking_date
      ? `${booking.booking_date} through ${booking.booking_end_date}`
      : booking.booking_date

    if (!toEmail) {
      return new Response(JSON.stringify({ error: 'No customer email on record' }), { status: 422, headers: CORS })
    }

    const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333">
  <div style="text-align:center;margin-bottom:24px">
    <h1 style="color:#68AFE6;margin:0;font-size:26px">Tailwinds Pet Care</h1>
    <p style="color:#A0AFC5;margin:4px 0 0;font-size:14px">Professional pet care for the DFW area</p>
  </div>

  <h2 style="color:#28A745;margin-top:0">&#10003; Booking Confirmed</h2>
  <p>Hi ${toName},</p>
  <p>Your booking has been confirmed. Here are the details:</p>

  <div style="background:#f8fbff;border-left:4px solid #68AFE6;padding:16px;margin:16px 0;border-radius:4px">
    <table style="border-collapse:collapse;width:100%">
      <tr>
        <td style="padding:4px 0;color:#A0AFC5;font-size:13px;width:120px">Service</td>
        <td style="font-weight:600">${serviceName}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#A0AFC5;font-size:13px">Pet</td>
        <td>${petName}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#A0AFC5;font-size:13px">Date(s)</td>
        <td>${dateRange}</td>
      </tr>
      ${booking.booking_time
        ? `<tr><td style="padding:4px 0;color:#A0AFC5;font-size:13px">Time</td><td>${booking.booking_time}</td></tr>`
        : ''}
    </table>
  </div>

  <p>If you have questions or need to make changes, just reply to this email or reach us at:</p>
  <p>
    &#128222; (214) 377-0065<br>
    &#128231; <a href="mailto:petsitter@tailwindspetcare.com" style="color:#68AFE6">petsitter@tailwindspetcare.com</a>
  </p>
  <p>Thank you for choosing Tailwinds Pet Care — we look forward to caring for ${petName}!</p>

  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="color:#bbb;font-size:11px;text-align:center">
    Tailwinds Pet Care, LLC &middot; 2500 South Blvd, Dallas, TX 75215
  </p>
</div>`

    const transporter = nodemailer.createTransport({
      host:   'smtp.gmail.com',
      port:   587,
      secure: false,
      auth: {
        user: 'petsitter@tailwindspetcare.com',
        pass: appPassword,
      },
    })

    await transporter.sendMail({
      from:    FROM_ADDRESS,
      to:      toEmail,
      subject: `Booking Confirmed — ${serviceName} on ${booking.booking_date}`,
      html,
    })

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS })
  }
})
