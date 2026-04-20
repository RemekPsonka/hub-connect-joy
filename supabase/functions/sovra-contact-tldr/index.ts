// Sprint RD-A2: Contact V2 — TL;DR generator z 24h cache.
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyAuth, isAuthError, unauthorizedResponse } from '../_shared/auth.ts';
import { callLLM } from '../_shared/llm-provider.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const auth = await verifyAuth(req, supabase);
    if (isAuthError(auth)) return unauthorizedResponse(auth, corsHeaders);

    const { contact_id, force_refresh = false } = await req.json();
    if (!contact_id) {
      return new Response(JSON.stringify({ error: 'contact_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Cache check (24h, not invalidated)
    if (!force_refresh) {
      const { data: cache } = await supabase
        .from('contact_ai_cache')
        .select('tldr, generated_at')
        .eq('contact_id', contact_id)
        .is('invalidated_at', null)
        .gte('generated_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
        .maybeSingle();
      if (cache?.tldr) {
        return new Response(
          JSON.stringify({ tldr: cache.tldr, generated_at: cache.generated_at, cached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // 2. Fetch context — verify tenant ownership too
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, tenant_id, full_name, position, last_contact_date, notes, company_id, companies(name)')
      .eq('id', contact_id)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle();
    if (!contact) {
      return new Response(JSON.stringify({ error: 'contact not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: deals } = await supabase
      .from('deal_team_contacts')
      .select('id, expected_annual_premium_gr, status, category')
      .eq('contact_id', contact_id)
      .limit(3);

    const daysSince = contact.last_contact_date
      ? Math.floor((Date.now() - new Date(contact.last_contact_date).getTime()) / 86400000)
      : null;

    // 3. LLM
    const systemPrompt = `Jesteś asystentem CRM dla specjalisty ubezpieczeń (B2B). Na podstawie danych kontaktu wygeneruj JEDEN zwięzły pasek TL;DR max 100 znaków po polsku.

Format: emoji + krótki stan + kluczowa liczba. Przykłady:
- "🔥 Aktywny deal 45k · Negocjacje · ost. kontakt 3 dni"
- "⚠️ Brak kontaktu 37 dni · deal stoi"
- "🆕 Nowy lead · brak kontaktu · zaplanuj pierwszy"

NIE wymyślaj danych. Tylko fakty z inputu. Zwróć CZYSTY tekst bez cudzysłowów.`;

    const payload = {
      name: contact.full_name,
      company: (contact.companies as { name?: string } | null)?.name,
      position: contact.position,
      days_since_last_contact: daysSince,
      active_deals: (deals ?? []).map((d) => ({
        amount_pln: Number(d.expected_annual_premium_gr ?? 0) / 100,
        category: d.category,
        status: d.status,
      })),
    };
    const userPayload = JSON.stringify(payload);

    const llmResp = await callLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPayload },
      ],
      context: {
        function_name: 'sovra-contact-tldr',
        persona: 'sovra',
        actor_id: auth.directorId ?? auth.assistantId,
        tenant_id: auth.tenantId,
      },
    });

    const tldr = (llmResp.text || '').trim().slice(0, 120) || 'Brak podsumowania AI';

    // 4. Upsert cache
    await supabase.from('contact_ai_cache').upsert(
      {
        tenant_id: contact.tenant_id,
        contact_id,
        tldr,
        summary_json: { payload },
        model: llmResp.model,
        cost_cents: Math.round((llmResp.cost_cents ?? 0) * 100), // store as int cents
        generated_at: new Date().toISOString(),
        invalidated_at: null,
      },
      { onConflict: 'contact_id' },
    );

    return new Response(
      JSON.stringify({ tldr, generated_at: new Date().toISOString(), cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[sovra-contact-tldr]', e);
    return new Response(
      JSON.stringify({ tldr: 'Brak podsumowania AI', cached: false, error: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  }
});
