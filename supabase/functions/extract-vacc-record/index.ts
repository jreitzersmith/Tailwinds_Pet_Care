import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: CORS });

    const { storagePath } = await req.json();
    if (!storagePath) return new Response('storagePath required', { status: 400, headers: CORS });

    // Download file from Supabase Storage using service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: fileData, error: dlErr } = await supabase.storage
      .from('pet-photos')
      .download(storagePath);
    if (dlErr) throw new Error(`Storage download failed: ${dlErr.message}`);

    // Convert to base64
    const buf   = await fileData.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary  = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);

    const ext       = storagePath.split('.').pop()?.toLowerCase() ?? 'pdf';
    const mediaType = ext === 'pdf' ? 'application/pdf'
                    : ext === 'doc'  ? 'application/msword'
                    : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    // Call Anthropic Claude
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
        'anthropic-beta':    'pdfs-2024-09-25',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            {
              type:   'document',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: `Extract vaccination details from this veterinary record and return ONLY valid JSON with these fields:
{
  "vaccine":    "vaccine name(s) — combine multiple with commas",
  "date_given": "YYYY-MM-DD or null",
  "next_due":   "YYYY-MM-DD or null",
  "notes":      "lot numbers, vet name, clinic, or any other relevant info — null if none"
}
Return nothing outside the JSON object.`,
            },
          ],
        }],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      throw new Error(`Anthropic API error ${anthropicRes.status}: ${err}`);
    }

    const aiResult  = await anthropicRes.json();
    const rawText   = aiResult.content?.[0]?.text ?? '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in Claude response');

    const extracted = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(extracted), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
