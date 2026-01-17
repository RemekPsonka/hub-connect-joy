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
    const { tenant_id, query, query_type = 'general' } = await req.json();

    if (!tenant_id || !query) {
      return new Response(
        JSON.stringify({ error: 'tenant_id and query are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Master Agent Query:', query);

    // 1. Fetch ALL Contact Agents for this tenant
    const { data: allAgents, error: agentsError } = await supabase
      .from('contact_agent_memory')
      .select(`
        *,
        contacts(id, full_name, company, position, email, city, relationship_strength, last_contact_date)
      `)
      .eq('tenant_id', tenant_id);

    if (agentsError) {
      console.error('Agents fetch error:', agentsError);
    }

    // 2. Fetch Master Agent Memory
    const { data: masterMemory } = await supabase
      .from('master_agent_memory')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single();

    // 3. Fetch all active needs and offers for context
    const { data: allNeeds } = await supabase
      .from('needs')
      .select('*, contacts(full_name, company)')
      .eq('tenant_id', tenant_id)
      .eq('status', 'active');

    const { data: allOffers } = await supabase
      .from('offers')
      .select('*, contacts(full_name, company)')
      .eq('tenant_id', tenant_id)
      .eq('status', 'active');

    // 4. Fetch connections network
    const { data: connections } = await supabase
      .from('connections')
      .select(`
        *,
        contact_a:contacts!connections_contact_a_id_fkey(id, full_name, company),
        contact_b:contacts!connections_contact_b_id_fkey(id, full_name, company)
      `)
      .eq('tenant_id', tenant_id);

    // Build Master Agent prompt
    const agentsSummary = (allAgents || []).map(agent => `
### AGENT: ${agent.contacts?.full_name || 'Unknown'}
- ID: ${agent.contact_id}
- Firma: ${agent.contacts?.company || 'nieznana'}
- Stanowisko: ${agent.contacts?.position || 'nieznane'}
- Miasto: ${agent.contacts?.city || 'nieznane'}
- Siła relacji: ${agent.contacts?.relationship_strength}/10
- Persona: ${agent.agent_persona?.substring(0, 200) || 'brak'}
- Pain Points: ${agent.agent_profile?.pain_points?.join(', ') || 'brak'}
- Interests: ${agent.agent_profile?.interests?.join(', ') || 'brak'}
- Goals: ${agent.agent_profile?.goals?.join(', ') || 'brak'}
- Key Insights: ${(agent.insights || []).slice(0, 3).map((i: any) => i.text).join('; ') || 'brak'}
`).join('\n');

    const needsSummary = (allNeeds || []).map(n => 
      `- ${n.contacts?.full_name} (${n.contacts?.company}): ${n.title}`
    ).join('\n');

    const offersSummary = (allOffers || []).map(o => 
      `- ${o.contacts?.full_name} (${o.contacts?.company}): ${o.title}`
    ).join('\n');

    const connectionsSummary = (connections || []).map(c => 
      `- ${c.contact_a?.full_name} <-> ${c.contact_b?.full_name} (${c.connection_type}, siła: ${c.strength}/10)`
    ).join('\n');

    const masterPrompt = `Jesteś Master Agent - koordynujesz ${allAgents?.length || 0} Contact Agents w sieci biznesowej Directora.

## TWOJA ROLA

Masz dostęp do wiedzy WSZYSTKICH Contact Agents. Możesz:
- Odpowiadać na pytania cross-contact ("Kto zna CEO Tauron?")
- Znajdować synergię między kontaktami
- Sugerować połączenia i wprowadzenia
- Przygotowywać briefings

## DOSTĘPNI AGENCI I ICH WIEDZA
${agentsSummary || 'Brak zainicjalizowanych agentów'}

## AKTYWNE POTRZEBY W SIECI
${needsSummary || 'Brak aktywnych potrzeb'}

## AKTYWNE OFERTY W SIECI
${offersSummary || 'Brak aktywnych ofert'}

## POŁĄCZENIA W SIECI
${connectionsSummary || 'Brak połączeń'}

## WIEDZA O SIECI (Master Memory)
${masterMemory ? JSON.stringify(masterMemory.network_insights, null, 2) : 'Brak analizy sieci'}

---

## PYTANIE OD DIRECTORA

"${query}"

Typ pytania: ${query_type}

---

## ZADANIE

Odpowiedz na pytanie wykorzystując wiedzę WSZYSTKICH swoich agentów.

**Proces myślenia:**
1. Które Contact Agents mają relevantną wiedzę?
2. Czy to wymaga współpracy między agentami?
3. Czy możesz znaleźć synergię/połączenie między kontaktami?

**Zwróć JSON:**
\`\`\`json
{
  "answer": "Kompleksowa odpowiedź na pytanie",
  "agents_consulted": ["contact_id_1", "contact_id_2"],
  "reasoning": {
    "step1": "Najpierw sprawdziłem...",
    "step2": "Potem porównałem...",
    "conclusion": "Wniosek..."
  },
  "recommendations": [
    {
      "action": "Sugerowana akcja",
      "reason": "Dlaczego",
      "contacts_involved": ["contact_id"],
      "confidence": 0.85
    }
  ],
  "related_contacts": [
    {
      "contact_id": "uuid",
      "name": "Jan Kowalski",
      "company": "Firma",
      "relevance": "Dlaczego jest relevantny"
    }
  ],
  "potential_matches": [
    {
      "contact_a": {"id": "uuid", "name": "A"},
      "contact_b": {"id": "uuid", "name": "B"},
      "match_reason": "A potrzebuje X, B oferuje X",
      "confidence": 0.9
    }
  ]
}
\`\`\`

Bądź konkretny i praktyczny. Jeśli nie masz wystarczających danych, powiedz o tym.`;

    console.log('Calling AI Gateway for Master Agent...');

    const aiResponse = await fetch('https://ai.lovable.dev/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: masterPrompt }
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
      console.error('JSON parse error:', parseError);
      response = {
        answer: aiContent,
        agents_consulted: [],
        reasoning: {},
        recommendations: [],
        related_contacts: [],
        potential_matches: []
      };
    }

    // Log query to master_agent_queries
    await supabase
      .from('master_agent_queries')
      .insert({
        tenant_id,
        query,
        query_type,
        agents_consulted: response.agents_consulted || [],
        reasoning: response.reasoning || {},
        response: response.answer
      });

    console.log('Master Agent query completed');

    return new Response(
      JSON.stringify({
        success: true,
        total_agents: allAgents?.length || 0,
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
