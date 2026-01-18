import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authorization
    const authResult = await verifyAuth(req, supabase);
    if (isAuthError(authResult)) {
      return unauthorizedResponse(authResult, corsHeaders);
    }

    // Use tenant_id and director_id from auth result, not from request body
    const tenant_id = authResult.tenantId;
    const director_id = authResult.directorId;

    if (!director_id) {
      return new Response(
        JSON.stringify({ error: 'Only directors can generate serendipity' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate-daily-serendipity] Authorized director: ${director_id}, tenant: ${tenant_id}`);

    const today = new Date().toISOString().split('T')[0];
    
    // Check if already exists for today
    const { data: existing } = await supabase
      .from('daily_serendipity')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('director_id', director_id)
      .eq('date', today)
      .single();
    
    if (existing) {
      console.log('Serendipity already exists for today');
      return new Response(
        JSON.stringify({ serendipity: existing, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Gathering data for serendipity generation...');

    // Gather data for AI analysis
    const [contactsRes, needsRes, offersRes, consultationsRes, matchesRes, healthRes] = await Promise.all([
      supabase
        .from('contacts')
        .select('id, full_name, company, position, profile_summary, notes, city')
        .eq('tenant_id', tenant_id)
        .eq('is_active', true)
        .limit(50),
      
      supabase
        .from('needs')
        .select('id, title, description, contact_id, contact:contacts(full_name, company)')
        .eq('tenant_id', tenant_id)
        .eq('status', 'active')
        .limit(30),
      
      supabase
        .from('offers')
        .select('id, title, description, contact_id, contact:contacts(full_name, company)')
        .eq('tenant_id', tenant_id)
        .eq('status', 'active')
        .limit(30),
      
      supabase
        .from('consultations')
        .select('id, scheduled_at, notes, contact:contacts(full_name, company)')
        .eq('tenant_id', tenant_id)
        .gte('scheduled_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
        .order('scheduled_at', { ascending: false })
        .limit(10),
      
      supabase
        .from('matches')
        .select(`
          id,
          similarity_score,
          need:needs(id, title, contact:contacts(id, full_name, company)),
          offer:offers(id, title, contact:contacts(id, full_name, company))
        `)
        .eq('tenant_id', tenant_id)
        .eq('status', 'pending')
        .order('similarity_score', { ascending: false })
        .limit(10),
      
      supabase
        .from('relationship_health')
        .select('contact_id, days_since_contact, health_score, contact:contacts(full_name, company)')
        .gt('days_since_contact', 60)
        .order('days_since_contact', { ascending: false })
        .limit(10)
    ]);

    const contacts = contactsRes.data || [];
    const needs = needsRes.data || [];
    const offers = offersRes.data || [];
    const consultations = consultationsRes.data || [];
    const matches = matchesRes.data || [];
    const neglectedRelations = healthRes.data || [];

    console.log(`Data gathered: ${contacts.length} contacts, ${needs.length} needs, ${offers.length} offers`);

    // Build AI prompt
    const prompt = `Jesteś AI "Serendipity Engine" - Twoja misja: znajdować zaskakujące, nieoczywiste połączenia i możliwości biznesowe.

FILOZOFIA:
- NIE generuj oczywistych dopasowań (te już mamy w systemie "Matches")
- Szukaj NIEOCZYWISTYCH synergii - "ktoś kto zna kogoś", "branże które się uzupełniają", "ukryte możliwości"
- Myśl kreatywnie, łącz kropki które wydają się odległe
- Cel: "aha moment" - użytkownik mówi "o tym nie pomyślałem!"

DOSTĘPNE DANE:
- ${contacts.length} kontaktów z różnych branż
- ${needs.length} aktywnych potrzeb
- ${offers.length} aktywnych ofert
- ${consultations.length} spotkań w ostatnich 2 tygodniach
- ${matches.length} istniejących dopasowań (NIE POWTARZAJ ich!)
- ${neglectedRelations.length} kontaktów bez kontaktu >60 dni

PRZYKŁADY DOBRYCH SERENDIPITY:
✅ "Jan (tartak, odpady drewniane) + Anna (pellet) + Piotr (transport) = kompletny łańcuch dostaw biomasy"
✅ "Kasia (HR, rekrutacja IT) + firma Marka (software house) + Maria (bootcamp kodowania) = ekosystem talentów"
✅ "Nie kontaktowałeś się z Tomaszem od 4 miesięcy, a właśnie poznałeś Andrzeja z tej samej branży - idealny moment!"
✅ "Anna i Marek oboje interesują się ESG - może warto ich połączyć mimo różnych branż?"

PRZYKŁADY ZŁYCH (zbyt oczywistych):
❌ "Anna potrzebuje X, Krzysztof oferuje X" - to już jest w Matches
❌ "Umów spotkanie z Janem" - to podstawowe reminder

KONTAKTY:
${contacts.slice(0, 25).map(c => `- ${c.full_name} (${c.company || 'brak firmy'}) - ${c.position || ''} ${c.city ? `[${c.city}]` : ''}`).join('\n')}

POTRZEBY:
${needs.slice(0, 15).map(n => `- [${n.id}] ${(n.contact as any)?.full_name || 'Nieznany'}: ${n.title}`).join('\n')}

OFERTY:
${offers.slice(0, 15).map(o => `- [${o.id}] ${(o.contact as any)?.full_name || 'Nieznany'}: ${o.title}`).join('\n')}

RELACJE ZANIEDBANE (>60 dni):
${neglectedRelations.slice(0, 8).map(r => `- ${(r.contact as any)?.full_name || 'Nieznany'} (${(r.contact as any)?.company || ''}) - ${r.days_since_contact} dni bez kontaktu`).join('\n')}

ISTNIEJĄCE DOPASOWANIA (NIE POWTARZAJ):
${matches.slice(0, 5).map(m => `- ${(m.need as any)?.contact?.full_name} ↔ ${(m.offer as any)?.contact?.full_name}`).join('\n')}

ZADANIE:
Wygeneruj JEDNĄ naprawdę zaskakującą, kreatywną rekomendację na dziś.

Odpowiedź TYLKO w formacie JSON (bez markdown, bez backticks):
{
  "type": "connection",
  "title": "Chwytliwy tytuł (max 60 znaków)",
  "description": "Konkretny opis możliwości/połączenia (100-150 znaków)",
  "reasoning": "Wyjaśnienie DLACZEGO to ma sens - pokazujące nieoczywistą synergię (150-250 znaków)",
  "contact_a_id": "uuid pierwszego kontaktu lub null",
  "contact_b_id": "uuid drugiego kontaktu lub null",
  "need_id": "uuid potrzeby lub null",
  "offer_id": "uuid oferty lub null"
}

Typy do wyboru: "connection" (łączenie osób), "opportunity" (możliwość biznesowa), "insight" (spostrzeżenie), "reminder" (przypomnienie o kontakcie)

WAŻNE: Używaj TYLKO ID kontaktów, potrzeb i ofert z powyższych list! Jeśli nie masz odpowiednich ID, ustaw null.`;

    // Call AI
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Calling AI for serendipity generation...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          { role: 'system', content: 'Jesteś kreatywnym asystentem AI specjalizującym się w znajdowaniu nieoczywistych połączeń biznesowych. Odpowiadasz TYLKO w formacie JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.9,
        max_tokens: 1000
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiMessage = aiData.choices?.[0]?.message?.content;
    
    if (!aiMessage) {
      throw new Error('No AI response received');
    }

    console.log('AI response:', aiMessage);

    // Parse JSON from response
    let serendipityData;
    try {
      // Clean up potential markdown formatting
      const cleanJson = aiMessage.replace(/```json\n?|```\n?/g, '').trim();
      serendipityData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback to a default serendipity
      serendipityData = {
        type: 'insight',
        title: 'Przejrzyj swoją sieć kontaktów',
        description: 'Warto regularnie przeglądać kontakty i szukać nowych możliwości połączeń.',
        reasoning: 'Systematyczne przeglądanie sieci kontaktów pozwala odkryć nieoczywiste możliwości współpracy.',
        contact_a_id: null,
        contact_b_id: null,
        need_id: null,
        offer_id: null
      };
    }

    // Validate UUIDs - set to null if not valid
    const validateUuid = (id: string | null) => {
      if (!id) return null;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(id) ? id : null;
    };

    // Save to database
    const { data: newSerendipity, error: insertError } = await supabase
      .from('daily_serendipity')
      .insert({
        tenant_id,
        director_id,
        date: today,
        type: serendipityData.type || 'insight',
        title: serendipityData.title || 'Odkrycie dnia',
        description: serendipityData.description || '',
        reasoning: serendipityData.reasoning || null,
        contact_a_id: validateUuid(serendipityData.contact_a_id),
        contact_b_id: validateUuid(serendipityData.contact_b_id),
        need_id: validateUuid(serendipityData.need_id),
        offer_id: validateUuid(serendipityData.offer_id),
        match_id: null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to save serendipity:', insertError);
      throw insertError;
    }

    console.log('Serendipity saved:', newSerendipity.id);

    // Create notification for the new serendipity
    await supabase.from('notifications').insert({
      tenant_id,
      director_id,
      type: 'serendipity',
      title: '💡 Nowe Odkrycie Dnia!',
      message: newSerendipity.title,
      entity_type: 'serendipity',
      entity_id: newSerendipity.id,
      priority: 'normal'
    });

    return new Response(
      JSON.stringify({ serendipity: newSerendipity, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating serendipity:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
