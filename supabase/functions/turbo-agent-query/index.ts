import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ============= AUTHORIZATION CHECK =============
    const authResult = await verifyAuth(req, supabase);
    if (isAuthError(authResult)) {
      return unauthorizedResponse(authResult, corsHeaders);
    }
    const { tenantId } = authResult;
    // ============= END AUTHORIZATION CHECK =============

    const { query, max_agents = 20, threshold = 0.3 } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: 'query is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const startTime = Date.now();
    console.log(`[Turbo] Starting for tenant ${tenantId}: ${query.substring(0, 50)}...`);

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('turbo_agent_sessions')
      .insert({ tenant_id: tenantId, original_query: query, status: 'analyzing' })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // NEW: Get ALL contacts directly (not just from contact_agent_memory)
    const { data: allContacts } = await supabase
      .from('contacts')
      .select(`
        id, full_name, company, position, city, notes, tags, profile_summary,
        companies (id, name, industry, description)
      `)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .limit(500);

    // Get agent memory data for enrichment
    const { data: agentMemories } = await supabase
      .from('contact_agent_memory')
      .select('contact_id, agent_persona, agent_profile, insights')
      .eq('tenant_id', tenantId);

    const agentMemoryMap = new Map((agentMemories || []).map(am => [am.contact_id, am]));

    // Combine contacts with agent data
    const validAgents = (allContacts || []).map(contact => {
      const agentData = agentMemoryMap.get(contact.id);
      return {
        contact_id: contact.id,
        contacts: contact,
        agent_persona: agentData?.agent_persona || null,
        agent_profile: agentData?.agent_profile || null,
        insights: agentData?.insights || null
      };
    });

    console.log(`[Turbo] Loaded ${validAgents.length} contacts (${agentMemories?.length || 0} with agent memory)`);

    // Update session
    await supabase.from('turbo_agent_sessions').update({ total_agents_available: validAgents.length, status: 'selecting' }).eq('id', session.id);

    // Build rich agent summaries for selection with industry, tags, profile
    const agentSummaries = validAgents.map(a => {
      const contact = a.contacts as any;
      return {
        contact_id: a.contact_id,
        name: contact.full_name,
        company: contact.company,
        position: contact.position,
        industry: contact.companies?.industry || null,
        tags: contact.tags || [],
        profile_excerpt: contact.profile_summary?.substring(0, 200) || null
      };
    });

    // AI selects agents with richer context
    const selectionPrompt = `Analizujesz pytanie użytkownika i wybierasz najbardziej odpowiednich agentów kontaktowych.

PYTANIE: "${query}"

DOSTĘPNI AGENCI (${agentSummaries.length}):
${agentSummaries.map((a, i) => `${i + 1}. ${a.name} | Firma: ${a.company || '-'} | Branża: ${a.industry || '-'} | Stanowisko: ${a.position || '-'} | Tagi: ${a.tags?.join(', ') || '-'} | Profil: ${a.profile_excerpt || '-'}`).join('\n')}

Wybierz maksymalnie ${max_agents} agentów, którzy mogą odpowiedzieć na pytanie. Uwzględnij:
- Branżę kontaktu (industry)
- Tagi i oznaczenia
- Profil AI i opis
- Stanowisko i firmę

Zwróć JSON:
\`\`\`json
{
  "selected_agents": [{"contact_id": "uuid", "reason": "powód wyboru"}],
  "query_intent": "intencja pytania",
  "sub_query_template": "pytanie do zadania każdemu agentowi"
}
\`\`\``;

    const selectionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: selectionPrompt }] })
    });

    if (!selectionResponse.ok) throw new Error('AI selection failed');

    const selectionData = await selectionResponse.json();
    const selectionText = selectionData.choices?.[0]?.message?.content || '';

    let selectionPlan: any;
    try {
      const jsonMatch = selectionText.match(/```json\s*([\s\S]*?)\s*```/);
      selectionPlan = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(selectionText);
    } catch {
      selectionPlan = { 
        selected_agents: agentSummaries.slice(0, max_agents).map(a => ({ contact_id: a.contact_id, reason: 'Fallback' })), 
        query_intent: 'general', 
        sub_query_template: query 
      };
    }

    const selectedAgentIds = selectionPlan.selected_agents?.map((a: any) => a.contact_id) || [];
    const selectedAgents = validAgents.filter(a => selectedAgentIds.includes(a.contact_id));

    await supabase.from('turbo_agent_sessions').update({ agents_selected: selectedAgents.length, query_intent: selectionPlan.query_intent, status: 'querying' }).eq('id', session.id);

    console.log(`[Turbo] Selected ${selectedAgents.length} agents for query`);

    // Query agents in parallel with richer context
    const queryAgent = async (agent: any) => {
      try {
        const contact = agent.contacts as any;
        const industry = contact.companies?.industry || 'nieznana';
        const tags = contact.tags?.join(', ') || 'brak';
        
        const agentPrompt = `Jesteś agentem AI reprezentującym kontakt biznesowy.

KONTAKT: ${contact.full_name}
FIRMA: ${contact.company || 'brak'}
BRANŻA: ${industry}
STANOWISKO: ${contact.position || 'brak'}
MIASTO: ${contact.city || 'brak'}
TAGI: ${tags}

PROFIL AI:
${contact.profile_summary || 'Brak profilu'}

NOTATKI:
${contact.notes?.substring(0, 800) || 'Brak notatek'}

PERSONA AGENTA:
${agent.agent_persona?.substring(0, 300) || 'Brak persony'}

PYTANIE: "${query}"

Odpowiedz na podstawie danych tego kontaktu. Czy ten kontakt jest relevantny dla pytania?

Zwróć JSON:
\`\`\`json
{
  "answer": "odpowiedź na pytanie w kontekście tego kontaktu",
  "confidence": 0.0-1.0,
  "relevance": 0.0-1.0,
  "industry_match": true/false,
  "evidence": ["dowody z danych kontaktu"]
}
\`\`\``;

        const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LOVABLE_API_KEY}` },
          body: JSON.stringify({ model: 'google/gemini-2.5-flash-lite', messages: [{ role: 'user', content: agentPrompt }] })
        });

        if (!resp.ok) return null;

        const data = await resp.json();
        const text = data.choices?.[0]?.message?.content || '';
        let result;
        try {
          const m = text.match(/```json\s*([\s\S]*?)\s*```/);
          result = m ? JSON.parse(m[1]) : JSON.parse(text);
        } catch { 
          result = { answer: text.substring(0, 300), confidence: 0.5, relevance: 0.5, industry_match: false, evidence: [] }; 
        }

        return { 
          contact_id: agent.contact_id, 
          contact_name: contact.full_name,
          company: contact.company,
          industry: industry,
          ...result 
        };
      } catch (err) { 
        console.error(`[Turbo] Agent query error:`, err);
        return null; 
      }
    };

    const responses = (await Promise.all(selectedAgents.map(queryAgent)))
      .filter(r => r !== null && r.relevance >= threshold);

    console.log(`[Turbo] Got ${responses.length} relevant responses`);

    // Aggregate with richer context
    const aggregationPrompt = `Jesteś Master Agent agregującym odpowiedzi od ${responses.length} agentów kontaktowych.

ORYGINALNE PYTANIE: "${query}"

ODPOWIEDZI AGENTÓW:
${responses.map((r: any, i: number) => `
${i + 1}. ${r.contact_name} (${r.company || '-'}, ${r.industry})
   Odpowiedź: ${r.answer}
   Pewność: ${r.confidence}, Relevancja: ${r.relevance}
   Dowody: ${r.evidence?.join(', ') || '-'}
`).join('\n')}

Na podstawie powyższych odpowiedzi, stwórz kompleksową odpowiedź na pytanie użytkownika.

Zwróć JSON:
\`\`\`json
{
  "summary": "szczegółowa odpowiedź zbiorcza z konkretnymi liczbami i danymi",
  "categories": [{"name": "kategoria", "count": 0, "contacts": [{"name": "", "company": "", "industry": ""}]}],
  "top_recommendations": [{"contact_name": "", "score": 0.0, "reason": "", "suggested_action": ""}],
  "insights": ["insight 1", "insight 2"],
  "data_confidence": 0.0-1.0
}
\`\`\``;

    const aggResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: aggregationPrompt }] })
    });

    let finalResult: any;
    if (aggResp.ok) {
      const aggData = await aggResp.json();
      const aggText = aggData.choices?.[0]?.message?.content || '';
      try {
        const m = aggText.match(/```json\s*([\s\S]*?)\s*```/);
        finalResult = m ? JSON.parse(m[1]) : JSON.parse(aggText);
      } catch { 
        finalResult = { summary: aggText.substring(0, 500), categories: [], top_recommendations: [], insights: [], data_confidence: 0.5 }; 
      }
    } else {
      finalResult = { summary: 'Nie udało się zagregować odpowiedzi', categories: [], top_recommendations: [], insights: [], data_confidence: 0 };
    }

    const duration = Date.now() - startTime;

    await supabase.from('turbo_agent_sessions').update({ 
      status: 'completed', 
      master_response: finalResult.summary, 
      top_results: finalResult, 
      total_processing_time_ms: duration, 
      completed_at: new Date().toISOString() 
    }).eq('id', session.id);

    console.log(`[Turbo] Completed in ${duration}ms`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        session_id: session.id, 
        agents_queried: selectedAgents.length, 
        responses_received: responses.length, 
        processing_time_ms: duration, 
        ...finalResult 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
