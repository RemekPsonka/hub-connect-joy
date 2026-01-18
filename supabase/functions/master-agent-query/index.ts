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

    const { query, query_type = 'general' } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: 'query is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Master Agent Query for tenant ${tenantId}: ${query.substring(0, 50)}...`);

    // Fetch all Contact Agents for this tenant
    const { data: allAgents } = await supabase
      .from('contact_agent_memory')
      .select(`*, contacts(id, full_name, company, position, email, city, relationship_strength)`)
      .eq('tenant_id', tenantId);

    // Fetch active needs/offers
    const [needsResult, offersResult, connectionsResult] = await Promise.all([
      supabase.from('needs').select('*, contacts(full_name, company)').eq('tenant_id', tenantId).eq('status', 'active'),
      supabase.from('offers').select('*, contacts(full_name, company)').eq('tenant_id', tenantId).eq('status', 'active'),
      supabase.from('connections').select(`*, contact_a:contacts!connections_contact_a_id_fkey(id, full_name), contact_b:contacts!connections_contact_b_id_fkey(id, full_name)`).eq('tenant_id', tenantId)
    ]);

    const agentsSummary = (allAgents || []).map(agent => `- ${agent.contacts?.full_name} (${agent.contacts?.company || '-'}): ${agent.agent_persona?.substring(0, 100) || 'brak'}`).join('\n');
    const needsSummary = (needsResult.data || []).map(n => `- ${n.contacts?.full_name}: ${n.title}`).join('\n');
    const offersSummary = (offersResult.data || []).map(o => `- ${o.contacts?.full_name}: ${o.title}`).join('\n');
    const connectionsSummary = (connectionsResult.data || []).slice(0, 20).map(c => `- ${c.contact_a?.full_name} <-> ${c.contact_b?.full_name}`).join('\n');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const masterPrompt = `Jesteś Master Agent koordynujący ${allAgents?.length || 0} Contact Agents.

## AGENCI
${agentsSummary || 'Brak'}

## POTRZEBY
${needsSummary || 'Brak'}

## OFERTY
${offersSummary || 'Brak'}

## POŁĄCZENIA
${connectionsSummary || 'Brak'}

## PYTANIE: "${query}"

Zwróć JSON:
\`\`\`json
{
  "answer": "odpowiedź",
  "agents_consulted": ["contact_id"],
  "recommendations": [{"action": "akcja", "reason": "powód", "contacts_involved": ["id"]}],
  "potential_matches": [{"contact_a": {"id": "", "name": ""}, "contact_b": {"id": "", "name": ""}, "match_reason": ""}]
}
\`\`\``;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: masterPrompt }] })
    });

    if (!aiResponse.ok) {
      return new Response(JSON.stringify({ error: 'AI service error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';

    let response;
    try {
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || aiContent.match(/\{[\s\S]*\}/);
      response = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiContent);
    } catch {
      response = { answer: aiContent, agents_consulted: [], recommendations: [], potential_matches: [] };
    }

    // Log query
    await supabase.from('master_agent_queries').insert({ tenant_id: tenantId, query, query_type, agents_consulted: response.agents_consulted || [], reasoning: {}, response: response.answer });

    return new Response(
      JSON.stringify({ success: true, total_agents: allAgents?.length || 0, ...response }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
