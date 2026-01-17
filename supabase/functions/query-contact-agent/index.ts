import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contact_id, question } = await req.json();

    if (!contact_id || !question) {
      return new Response(
        JSON.stringify({ error: 'contact_id and question are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch agent memory
    const { data: agentMemory, error: agentError } = await supabase
      .from('contact_agent_memory')
      .select('*')
      .eq('contact_id', contact_id)
      .single();

    if (agentError || !agentMemory) {
      return new Response(
        JSON.stringify({ 
          error: 'Agent not initialized for this contact',
          suggestion: 'Call initialize-contact-agent first'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch fresh contact data
    const { data: contact } = await supabase
      .from('contacts')
      .select(`
        *,
        company:companies(*),
        primary_group:contact_groups(*)
      `)
      .eq('id', contact_id)
      .single();

    // Fetch recent consultations
    const { data: consultations } = await supabase
      .from('consultations')
      .select('*')
      .eq('contact_id', contact_id)
      .order('scheduled_at', { ascending: false })
      .limit(5);

    // Fetch needs and offers
    const { data: needs } = await supabase
      .from('needs')
      .select('*')
      .eq('contact_id', contact_id)
      .eq('status', 'active');

    const { data: offers } = await supabase
      .from('offers')
      .select('*')
      .eq('contact_id', contact_id)
      .eq('status', 'active');

    const prompt = `Jesteś Contact Agent - osobistym asystentem AI dla kontaktu biznesowego.

## TWOJA WIEDZA O TYM KONTAKCIE

**Podstawowe dane:**
- Imię i nazwisko: ${contact?.full_name}
- Stanowisko: ${contact?.position || 'nieznane'}
- Firma: ${contact?.company || 'nieznana'}
- Siła relacji: ${contact?.relationship_strength}/10
- Ostatni kontakt: ${contact?.last_contact_date || 'nieznany'}

**Twoja persona dla tego kontaktu:**
${agentMemory.agent_persona}

**Profil (pain points, interests, goals):**
${JSON.stringify(agentMemory.agent_profile, null, 2)}

**Zebrane insights:**
${(agentMemory.insights || []).map((i: any) => `- [${i.importance}] ${i.text} (źródło: ${i.source})`).join('\n') || 'Brak'}

**Aktualne potrzeby:**
${(needs || []).map(n => `- ${n.title}: ${n.description || ''}`).join('\n') || 'Brak'}

**Aktualne oferty:**
${(offers || []).map(o => `- ${o.title}: ${o.description || ''}`).join('\n') || 'Brak'}

**Ostatnie konsultacje:**
${(consultations || []).map(c => `- ${c.scheduled_at}: ${c.status} | ${c.notes?.substring(0, 200) || 'brak notatek'}`).join('\n') || 'Brak'}

---

## PYTANIE OD DIRECTORA

"${question}"

---

## ZADANIE

Odpowiedz na pytanie wykorzystując swoją wiedzę o tym kontakcie.
Bądź konkretny, praktyczny i pomocny.

**Zwróć JSON:**
\`\`\`json
{
  "answer": "Twoja odpowiedź na pytanie",
  "relevant_history": ["punkty z historii relevantne do pytania"],
  "suggested_topics": ["tematy które warto poruszyć"],
  "warnings": ["ostrzeżenia lub rzeczy na które zwrócić uwagę"],
  "action_items": ["sugerowane działania"]
}
\`\`\``;

    console.log('Querying Contact Agent...');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', errorText);
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';

    // Parse response
    let response;
    try {
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                        aiContent.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiContent;
      response = JSON.parse(jsonStr);
    } catch (parseError) {
      response = {
        answer: aiContent,
        relevant_history: [],
        suggested_topics: [],
        warnings: [],
        action_items: []
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        contact_name: contact?.full_name,
        ...response
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
