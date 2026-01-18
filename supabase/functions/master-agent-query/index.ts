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

    // Fetch all Contact Agents with FULL contact data including companies
    const { data: allAgents } = await supabase
      .from('contact_agent_memory')
      .select(`
        *,
        contacts (
          id, full_name, company, position, email, city, 
          relationship_strength, notes, tags, profile_summary,
          companies (id, name, industry, description)
        )
      `)
      .eq('tenant_id', tenantId);

    // Fetch active needs/offers with full contact data
    const [needsResult, offersResult, connectionsResult] = await Promise.all([
      supabase
        .from('needs')
        .select('*, contacts(full_name, company, position, tags, profile_summary, companies(name, industry))')
        .eq('tenant_id', tenantId)
        .eq('status', 'active'),
      supabase
        .from('offers')
        .select('*, contacts(full_name, company, position, tags, profile_summary, companies(name, industry))')
        .eq('tenant_id', tenantId)
        .eq('status', 'active'),
      supabase
        .from('connections')
        .select(`
          *, 
          contact_a:contacts!connections_contact_a_id_fkey(id, full_name, company, position, companies(name, industry)), 
          contact_b:contacts!connections_contact_b_id_fkey(id, full_name, company, position, companies(name, industry))
        `)
        .eq('tenant_id', tenantId)
    ]);

    // Build rich agent summaries with industry, tags, and profile
    const agentsSummary = (allAgents || []).map(agent => {
      const contact = agent.contacts as any;
      if (!contact) return null;
      
      const industry = contact.companies?.industry || 'brak';
      const tags = contact.tags?.join(', ') || 'brak';
      const profileExcerpt = contact.profile_summary?.substring(0, 150) || '';
      
      return `- ${contact.full_name} | Firma: ${contact.company || '-'} | Branża: ${industry} | Stanowisko: ${contact.position || '-'} | Tagi: ${tags} | Profil: ${profileExcerpt}`;
    }).filter(Boolean).join('\n');

    // Build needs summary with industry context
    const needsSummary = (needsResult.data || []).map(n => {
      const contact = n.contacts as any;
      const industry = contact?.companies?.industry || 'brak';
      return `- ${contact?.full_name} (${industry}): ${n.title} - ${n.description?.substring(0, 100) || ''}`;
    }).join('\n');

    // Build offers summary with industry context
    const offersSummary = (offersResult.data || []).map(o => {
      const contact = o.contacts as any;
      const industry = contact?.companies?.industry || 'brak';
      return `- ${contact?.full_name} (${industry}): ${o.title} - ${o.description?.substring(0, 100) || ''}`;
    }).join('\n');

    // Build connections summary with industry
    const connectionsSummary = (connectionsResult.data || []).slice(0, 30).map(c => {
      const a = c.contact_a as any;
      const b = c.contact_b as any;
      return `- ${a?.full_name} (${a?.companies?.industry || '-'}) <-> ${b?.full_name} (${b?.companies?.industry || '-'})`;
    }).join('\n');

    // Calculate industry statistics
    const industryStats: Record<string, number> = {};
    (allAgents || []).forEach(agent => {
      const contact = agent.contacts as any;
      const industry = contact?.companies?.industry || contact?.profile_summary?.match(/branż[aąy]?\s*:?\s*(\w+)/i)?.[1] || 'nieznana';
      industryStats[industry] = (industryStats[industry] || 0) + 1;
    });
    const industryStatsSummary = Object.entries(industryStats)
      .sort((a, b) => b[1] - a[1])
      .map(([industry, count]) => `${industry}: ${count}`)
      .join(', ');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const masterPrompt = `Jesteś Master Agent koordynujący ${allAgents?.length || 0} Contact Agents w systemie zarządzania relacjami biznesowymi.

## STATYSTYKI BRANŻOWE
${industryStatsSummary || 'Brak danych o branżach'}

## AGENCI I ICH PROFILE (${allAgents?.length || 0} kontaktów)
${agentsSummary || 'Brak agentów'}

## AKTYWNE POTRZEBY
${needsSummary || 'Brak aktywnych potrzeb'}

## AKTYWNE OFERTY
${offersSummary || 'Brak aktywnych ofert'}

## POŁĄCZENIA W SIECI (próbka)
${connectionsSummary || 'Brak połączeń'}

## PYTANIE UŻYTKOWNIKA: "${query}"

Przeanalizuj dokładnie dane powyżej i odpowiedz na pytanie. Uwzględnij:
- Branże kontaktów (z pola industry lub profile_summary)
- Tagi i oznaczenia kontaktów
- Profile AI i opisy
- Potrzeby i oferty

Zwróć JSON:
\`\`\`json
{
  "answer": "szczegółowa odpowiedź na pytanie z konkretnymi danymi i liczbami",
  "agents_consulted": ["contact_id1", "contact_id2"],
  "data_sources": ["źródła danych użyte do odpowiedzi"],
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
      console.error('AI response error:', aiResponse.status, await aiResponse.text());
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
    await supabase.from('master_agent_queries').insert({ 
      tenant_id: tenantId, 
      query, 
      query_type, 
      agents_consulted: response.agents_consulted || [], 
      reasoning: { data_sources: response.data_sources || [], industry_stats: industryStats }, 
      response: response.answer 
    });

    return new Response(
      JSON.stringify({ success: true, total_agents: allAgents?.length || 0, industry_stats: industryStats, ...response }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
