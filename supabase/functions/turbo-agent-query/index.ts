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
    console.log(`[Turbo] Starting for tenant ${tenantId}`);

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('turbo_agent_sessions')
      .insert({ tenant_id: tenantId, original_query: query, status: 'analyzing' })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // Get all Contact Agents
    const { data: allAgents } = await supabase
      .from('contact_agent_memory')
      .select(`id, contact_id, agent_persona, agent_profile, insights, contacts (id, full_name, company, position, city, notes)`)
      .eq('tenant_id', tenantId);

    const validAgents = (allAgents || []).filter(a => a.contacts && !Array.isArray(a.contacts));

    // Update session
    await supabase.from('turbo_agent_sessions').update({ total_agents_available: validAgents.length, status: 'selecting' }).eq('id', session.id);

    // AI selects agents
    const agentSummaries = validAgents.map(a => ({ contact_id: a.contact_id, name: (a.contacts as any).full_name, company: (a.contacts as any).company, position: (a.contacts as any).position }));

    const selectionPrompt = `Wybierz max ${max_agents} agentów dla pytania: "${query}"\n\nAgenci:\n${JSON.stringify(agentSummaries)}\n\nZwróć JSON:\n\`\`\`json\n{"selected_agents": [{"contact_id": "uuid", "reason": "powód"}], "query_intent": "intent", "sub_query_template": "pytanie dla {contact_name}"}\n\`\`\``;

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
      selectionPlan = { selected_agents: agentSummaries.slice(0, max_agents).map(a => ({ contact_id: a.contact_id, reason: 'Fallback' })), query_intent: 'general', sub_query_template: `{contact_name}: ${query}?` };
    }

    const selectedAgentIds = selectionPlan.selected_agents?.map((a: any) => a.contact_id) || [];
    const selectedAgents = validAgents.filter(a => selectedAgentIds.includes(a.contact_id));

    await supabase.from('turbo_agent_sessions').update({ agents_selected: selectedAgents.length, query_intent: selectionPlan.query_intent, status: 'querying' }).eq('id', session.id);

    // Query agents in parallel
    const queryAgent = async (agent: any) => {
      try {
        const agentPrompt = `Agent dla: ${(agent.contacts as any).full_name}\nFirma: ${(agent.contacts as any).company}\nNotatki: ${(agent.contacts as any).notes?.substring(0, 500) || 'Brak'}\nPytanie: "${query}"\n\nZwróć JSON: {"answer": "", "confidence": 0.0, "relevance": 0.0, "evidence": []}`;

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
        } catch { result = { answer: text.substring(0, 300), confidence: 0.5, relevance: 0.5, evidence: [] }; }

        return { contact_id: agent.contact_id, contact_name: (agent.contacts as any).full_name, ...result };
      } catch { return null; }
    };

    const responses = (await Promise.all(selectedAgents.map(queryAgent))).filter(r => r !== null && r.relevance >= threshold);

    // Aggregate
    const aggregationPrompt = `Agreguj odpowiedzi dla: "${query}"\n\nOdpowiedzi:\n${responses.map((r: any) => `- ${r.contact_name}: ${r.answer}`).join('\n')}\n\nZwróć JSON: {"summary": "", "top_recommendations": [], "insights": []}`;

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
      } catch { finalResult = { summary: aggText.substring(0, 500), top_recommendations: [], insights: [] }; }
    } else {
      finalResult = { summary: 'Nie udało się zagregować', top_recommendations: [], insights: [] };
    }

    const duration = Date.now() - startTime;

    await supabase.from('turbo_agent_sessions').update({ status: 'completed', master_response: finalResult.summary, top_results: finalResult, total_processing_time_ms: duration, completed_at: new Date().toISOString() }).eq('id', session.id);

    return new Response(
      JSON.stringify({ success: true, session_id: session.id, agents_queried: selectedAgents.length, responses_received: responses.length, processing_time_ms: duration, ...finalResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
