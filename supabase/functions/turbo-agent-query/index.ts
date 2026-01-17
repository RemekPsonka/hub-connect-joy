import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AgentData {
  id: string;
  contact_id: string;
  agent_persona: string | null;
  agent_profile: any;
  insights: any[];
  contacts: {
    id: string;
    full_name: string;
    company: string | null;
    position: string | null;
    city: string | null;
    notes: string | null;
  };
}

interface SubQueryResult {
  contact_id: string;
  contact_name: string;
  answer: string;
  confidence: number;
  relevance: number;
  reasoning: string;
  evidence: string[];
  recommendation?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenant_id, query, max_agents = 20, threshold = 0.3 } = await req.json();

    if (!tenant_id || !query) {
      return new Response(
        JSON.stringify({ error: 'tenant_id and query are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const startTime = Date.now();
    console.log(`[Turbo] Starting orchestration for tenant ${tenant_id}`);

    // PHASE 1: Create session
    const { data: session, error: sessionError } = await supabase
      .from('turbo_agent_sessions')
      .insert({
        tenant_id,
        original_query: query,
        status: 'analyzing'
      })
      .select()
      .single();

    if (sessionError) {
      console.error('[Turbo] Session creation error:', sessionError);
      throw sessionError;
    }

    console.log(`[Turbo] Session ${session.id} created`);

    // PHASE 2: Get all Contact Agents with their memory
    const { data: allAgents, error: agentsError } = await supabase
      .from('contact_agent_memory')
      .select(`
        id,
        contact_id,
        agent_persona,
        agent_profile,
        insights,
        contacts (
          id,
          full_name,
          company,
          position,
          city,
          notes
        )
      `)
      .eq('tenant_id', tenant_id);

    if (agentsError) {
      console.error('[Turbo] Agents fetch error:', agentsError);
      throw agentsError;
    }

    // Filter and transform to proper type
    const validAgents: AgentData[] = (allAgents || [])
      .filter(a => a.contacts && !Array.isArray(a.contacts))
      .map(a => ({
        id: a.id,
        contact_id: a.contact_id,
        agent_persona: a.agent_persona,
        agent_profile: a.agent_profile,
        insights: a.insights,
        contacts: a.contacts as unknown as AgentData['contacts']
      }));
    console.log(`[Turbo] Found ${validAgents.length} agents with memory`);

    // Update session with total agents
    await supabase
      .from('turbo_agent_sessions')
      .update({ 
        total_agents_available: validAgents.length,
        status: 'selecting'
      })
      .eq('id', session.id);

    // PHASE 3: AI selects top agents based on metadata (quick pre-filtering)
    const agentSummaries = validAgents.map(a => ({
      contact_id: a.contact_id,
      name: a.contacts.full_name,
      company: a.contacts.company,
      position: a.contacts.position,
      city: a.contacts.city,
      persona_preview: a.agent_persona?.substring(0, 200) || 'Brak danych',
      insights_count: Array.isArray(a.insights) ? a.insights.length : 0
    }));

    const selectionPrompt = `Jesteś Master Agent. Przeanalizuj pytanie i wybierz NAJBARDZIEJ RELEVANTNYCH agentów kontaktów.

## PYTANIE OD DIRECTORA
"${query}"

## DOSTĘPNI AGENCI (${validAgents.length} total)
${JSON.stringify(agentSummaries, null, 2)}

## ZADANIE
Wybierz maksymalnie ${max_agents} agentów, którzy NAJPRAWDOPODOBNIEJ będą mieli informacje związane z pytaniem.

Zwróć JSON:
\`\`\`json
{
  "query_intent": "krótki opis intencji pytania",
  "sub_query_template": "Pytanie do każdego agenta (użyj {contact_name} jako placeholder)",
  "selected_agents": [
    {
      "contact_id": "uuid",
      "reason": "Dlaczego ten agent może mieć relevantne informacje"
    }
  ]
}
\`\`\`

Wybieraj strategicznie - lepiej mniej, ale bardziej trafnych agentów.`;

    console.log(`[Turbo] Calling AI for agent selection...`);

    const selectionResponse = await fetch('https://ai.gateway.lovable.dev/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: selectionPrompt }]
      })
    });

    if (!selectionResponse.ok) {
      throw new Error(`AI selection failed: ${selectionResponse.status}`);
    }

    const selectionData = await selectionResponse.json();
    const selectionText = selectionData.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    let selectionPlan: any;
    try {
      const jsonMatch = selectionText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        selectionPlan = JSON.parse(jsonMatch[1]);
      } else {
        selectionPlan = JSON.parse(selectionText);
      }
    } catch (e) {
      console.error('[Turbo] Failed to parse selection response:', selectionText);
      selectionPlan = {
        query_intent: 'general',
        sub_query_template: `Czy {contact_name} ma informacje związane z: ${query}?`,
        selected_agents: agentSummaries.slice(0, max_agents).map(a => ({
          contact_id: a.contact_id,
          reason: 'Fallback selection'
        }))
      };
    }

    const selectedAgentIds = selectionPlan.selected_agents?.map((a: any) => a.contact_id) || [];
    const selectedAgents = validAgents.filter(a => selectedAgentIds.includes(a.contact_id));

    console.log(`[Turbo] Selected ${selectedAgents.length} agents`);

    // Update session
    await supabase
      .from('turbo_agent_sessions')
      .update({ 
        agents_selected: selectedAgents.length,
        query_intent: selectionPlan.query_intent,
        selection_completed_at: new Date().toISOString(),
        status: 'querying'
      })
      .eq('id', session.id);

    // Create sub-query records
    const subQueryInserts = selectedAgents.map(agent => {
      const selectionInfo = selectionPlan.selected_agents?.find((a: any) => a.contact_id === agent.contact_id);
      return {
        session_id: session.id,
        contact_id: agent.contact_id,
        contact_name: agent.contacts.full_name,
        sub_query: selectionPlan.sub_query_template.replace('{contact_name}', agent.contacts.full_name),
        selection_reason: selectionInfo?.reason || 'Selected by AI',
        status: 'processing'
      };
    });

    await supabase.from('turbo_agent_sub_queries').insert(subQueryInserts);

    // PHASE 4: Query selected agents in PARALLEL
    console.log(`[Turbo] Querying ${selectedAgents.length} agents in parallel...`);

    const queryAgent = async (agent: AgentData): Promise<SubQueryResult | null> => {
      const agentStartTime = Date.now();
      const subQuery = selectionPlan.sub_query_template.replace('{contact_name}', agent.contacts.full_name);

      const agentPrompt = `Jesteś dedykowanym AI agentem dla kontaktu: ${agent.contacts.full_name}.

## TWOJA PEŁNA WIEDZA O KONTAKCIE

### Profil
- Firma: ${agent.contacts.company || 'Nieznana'}
- Stanowisko: ${agent.contacts.position || 'Nieznane'}
- Miasto: ${agent.contacts.city || 'Nieznane'}

### Notatki
${agent.contacts.notes || 'Brak notatek'}

### Persona agenta
${agent.agent_persona || 'Brak zdefiniowanej persony'}

### Profil agenta
${JSON.stringify(agent.agent_profile || {}, null, 2)}

### Insights
${JSON.stringify(agent.insights || [], null, 2)}

## PYTANIE
"${subQuery}"

## KONTEKST ORYGINALNEGO PYTANIA
"${query}"

## ZADANIE
Odpowiedz na pytanie bazując TYLKO na swojej wiedzy o ${agent.contacts.full_name}.

Zwróć JSON:
\`\`\`json
{
  "answer": "Tak/Nie/Może + krótkie wyjaśnienie (1-2 zdania)",
  "confidence": 0.0-1.0,
  "relevance": 0.0-1.0,
  "reasoning": "Dlaczego tak uważasz?",
  "evidence": ["Konkretne fakty z pamięci agenta"],
  "recommendation": "Opcjonalna rekomendacja dla Directora"
}
\`\`\`

Jeśli nie masz informacji, zwróć confidence=0.0 i powiedz wprost "Brak danych".`;

      try {
        const agentResponse = await fetch('https://ai.gateway.lovable.dev/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [{ role: 'user', content: agentPrompt }]
          })
        });

        if (!agentResponse.ok) {
          throw new Error(`Agent query failed: ${agentResponse.status}`);
        }

        const agentData = await agentResponse.json();
        const responseText = agentData.choices?.[0]?.message?.content || '';

        let response: any;
        try {
          const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            response = JSON.parse(jsonMatch[1]);
          } else {
            response = JSON.parse(responseText);
          }
        } catch (e) {
          response = {
            answer: responseText.substring(0, 500),
            confidence: 0.5,
            relevance: 0.5,
            reasoning: 'Could not parse structured response',
            evidence: []
          };
        }

        const processingTime = Date.now() - agentStartTime;

        // Update sub-query record
        await supabase
          .from('turbo_agent_sub_queries')
          .update({
            agent_response: response.answer,
            confidence_score: response.confidence,
            relevance_score: response.relevance,
            reasoning: response,
            evidence: response.evidence || [],
            response_received_at: new Date().toISOString(),
            processing_time_ms: processingTime,
            status: 'completed'
          })
          .eq('session_id', session.id)
          .eq('contact_id', agent.contact_id);

        return {
          contact_id: agent.contact_id,
          contact_name: agent.contacts.full_name,
          answer: response.answer,
          confidence: response.confidence || 0,
          relevance: response.relevance || 0,
          reasoning: response.reasoning || '',
          evidence: response.evidence || [],
          recommendation: response.recommendation
        };
      } catch (error) {
        console.error(`[Turbo] Agent ${agent.contacts.full_name} error:`, error);
        
        await supabase
          .from('turbo_agent_sub_queries')
          .update({ status: 'failed' })
          .eq('session_id', session.id)
          .eq('contact_id', agent.contact_id);

        return null;
      }
    };

    // Execute all queries in parallel
    const allResponses = await Promise.all(selectedAgents.map(queryAgent));
    const successfulResponses = allResponses.filter((r): r is SubQueryResult => r !== null);

    console.log(`[Turbo] Received ${successfulResponses.length}/${selectedAgents.length} responses`);

    // Update session
    await supabase
      .from('turbo_agent_sessions')
      .update({ 
        queries_completed_at: new Date().toISOString(),
        status: 'aggregating'
      })
      .eq('id', session.id);

    // PHASE 5: Filter by threshold
    const relevantResponses = successfulResponses.filter(r => r.relevance >= threshold);
    console.log(`[Turbo] ${relevantResponses.length} responses above threshold ${threshold}`);

    // PHASE 6: Master Agent aggregates results
    const aggregationPrompt = `Jesteś Master Agent. Właśnie zapytałeś ${selectedAgents.length} Contact Agents.

## ORYGINALNE PYTANIE
"${query}"

## OTRZYMANE ODPOWIEDZI (${relevantResponses.length} relevantnych z ${successfulResponses.length} total)

${relevantResponses.map((r, i) => `
### ${i+1}. ${r.contact_name}
- Odpowiedź: ${r.answer}
- Confidence: ${r.confidence}
- Relevance: ${r.relevance}
- Reasoning: ${r.reasoning}
- Evidence: ${r.evidence?.join(', ') || 'Brak'}
- Rekomendacja: ${r.recommendation || 'Brak'}
`).join('\n')}

## ZADANIE
Przeanalizuj wszystkie odpowiedzi i przygotuj syntetyczną odpowiedź dla Directora.

Zwróć JSON:
\`\`\`json
{
  "summary": "Krótkie podsumowanie (2-3 zdania)",
  "categories": [
    {
      "name": "Nazwa kategorii",
      "count": 0,
      "contacts": [
        {
          "contact_id": "uuid",
          "name": "Imię Nazwisko",
          "answer": "Krótka odpowiedź",
          "confidence": 0.0
        }
      ]
    }
  ],
  "top_recommendations": [
    {
      "contact_id": "uuid",
      "contact_name": "Imię Nazwisko",
      "score": 0.95,
      "reason": "Dlaczego warto się skontaktować",
      "suggested_action": "Konkretna akcja do podjęcia"
    }
  ],
  "insights": [
    "Obserwacja 1",
    "Obserwacja 2"
  ],
  "next_steps": [
    "Następny krok 1"
  ]
}
\`\`\``;

    console.log(`[Turbo] Calling AI for aggregation...`);

    const aggregationResponse = await fetch('https://ai.gateway.lovable.dev/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: aggregationPrompt }]
      })
    });

    if (!aggregationResponse.ok) {
      throw new Error(`AI aggregation failed: ${aggregationResponse.status}`);
    }

    const aggregationData = await aggregationResponse.json();
    const aggregationText = aggregationData.choices?.[0]?.message?.content || '';

    let finalResult: any;
    try {
      const jsonMatch = aggregationText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        finalResult = JSON.parse(jsonMatch[1]);
      } else {
        finalResult = JSON.parse(aggregationText);
      }
    } catch (e) {
      console.error('[Turbo] Failed to parse aggregation response:', aggregationText);
      finalResult = {
        summary: aggregationText.substring(0, 500),
        categories: [],
        top_recommendations: [],
        insights: [],
        next_steps: []
      };
    }

    const totalDuration = Date.now() - startTime;

    // PHASE 7: Save final results
    await supabase
      .from('turbo_agent_sessions')
      .update({
        status: 'completed',
        master_response: finalResult.summary,
        top_results: finalResult,
        categories: finalResult.categories,
        insights: finalResult.insights,
        completed_at: new Date().toISOString(),
        total_duration_ms: totalDuration
      })
      .eq('id', session.id);

    console.log(`[Turbo] Session ${session.id} completed in ${totalDuration}ms`);

    return new Response(
      JSON.stringify({
        session_id: session.id,
        duration_ms: totalDuration,
        agents_available: validAgents.length,
        agents_selected: selectedAgents.length,
        agents_responded: successfulResponses.length,
        relevant_responses: relevantResponses.length,
        result: finalResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[Turbo] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
