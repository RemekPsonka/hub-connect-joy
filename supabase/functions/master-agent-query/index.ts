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

    // ============= SEMANTIC SEARCH - Generate query embedding =============
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    let queryEmbedding: number[] | null = null;
    let semanticContacts: any[] = [];

    if (OPENAI_API_KEY) {
      console.log(`[Master Agent] Generating query embedding for semantic search...`);
      try {
        const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: query.substring(0, 8000),
            encoding_format: "float"
          }),
        });

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          queryEmbedding = embeddingData.data?.[0]?.embedding;
          console.log(`[Master Agent] Query embedding generated: ${queryEmbedding?.length} dimensions`);
        } else {
          console.warn(`[Master Agent] Embedding generation failed: ${embeddingResponse.status}`);
        }
      } catch (e) {
        console.warn(`[Master Agent] Embedding error:`, e);
      }
    }

    // ============= SEMANTIC SEARCH using search_all_hybrid =============
    if (queryEmbedding) {
      console.log(`[Master Agent] Performing semantic search with embeddings...`);
      const { data: hybridResults, error: hybridError } = await supabase.rpc('search_all_hybrid', {
        p_query: query,
        p_query_embedding: `[${queryEmbedding.join(',')}]`,
        p_tenant_id: tenantId,
        p_types: ['contact'],
        p_fts_weight: 0.3,
        p_semantic_weight: 0.7,
        p_threshold: 0.25,
        p_limit: 50
      });

      if (!hybridError && hybridResults?.length > 0) {
        console.log(`[Master Agent] Semantic search found ${hybridResults.length} matches`);
        
        // Get full contact data for semantic matches
        const contactIds = hybridResults.map((r: any) => r.id);
        const { data: matchedContactData } = await supabase
          .from('contacts')
          .select(`
            id, full_name, company, position, email, city,
            relationship_strength, notes, tags, profile_summary,
            companies (id, name, industry, description)
          `)
          .in('id', contactIds)
          .eq('is_active', true);

        // Merge semantic scores with contact data
        semanticContacts = (matchedContactData || []).map(contact => {
          const semanticResult = hybridResults.find((r: any) => r.id === contact.id);
          return {
            ...contact,
            semantic_score: semanticResult?.semantic_score || 0,
            fts_score: semanticResult?.fts_score || 0,
            combined_score: semanticResult?.combined_score || 0,
            match_source: semanticResult?.match_source || 'unknown'
          };
        }).sort((a, b) => b.combined_score - a.combined_score);

        console.log(`[Master Agent] Top semantic matches: ${semanticContacts.slice(0, 5).map(c => `${c.full_name} (${c.combined_score.toFixed(2)})`).join(', ')}`);
      } else if (hybridError) {
        console.error(`[Master Agent] Semantic search error:`, hybridError);
      }
    }

    // Fallback: Fetch all contacts if semantic search didn't find enough
    const { data: allContacts } = await supabase
      .from('contacts')
      .select(`
        id, full_name, company, position, email, city,
        relationship_strength, notes, tags, profile_summary,
        companies (id, name, industry, description)
      `)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('profile_summary', { nullsFirst: false })
      .limit(200);

    // Get agent memory data
    const { data: agentMemories } = await supabase
      .from('contact_agent_memory')
      .select('contact_id, agent_persona')
      .eq('tenant_id', tenantId);

    const agentMemoryMap = new Map((agentMemories || []).map(am => [am.contact_id, am]));

    // Combine contacts with agent data
    const contactsWithAgentData = (allContacts || []).map(contact => ({
      ...contact,
      has_agent: agentMemoryMap.has(contact.id),
      agent_persona: agentMemoryMap.get(contact.id)?.agent_persona || null
    }));

    console.log(`[Master Agent] Loaded ${contactsWithAgentData.length} total contacts, ${semanticContacts.length} semantic matches`);

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

    // Build SEMANTIC MATCHES summary (AI understands meaning!)
    const semanticSummary = semanticContacts.length > 0 
      ? semanticContacts.slice(0, 30).map(c => {
          const industry = (c.companies as any)?.industry || 'brak';
          const tags = (c.tags || []).join(', ') || 'brak';
          const profileExcerpt = c.profile_summary?.substring(0, 250) || '';
          const score = c.combined_score?.toFixed(2) || '0';
          return `- 🎯 [${score}] ${c.full_name} | Firma: ${c.company || '-'} | Branża: ${industry} | Stanowisko: ${c.position || '-'} | Tagi: ${tags} | Profil: ${profileExcerpt}`;
        }).join('\n')
      : '';

    // Build ALL contacts summary (sample)
    const allContactsSummary = contactsWithAgentData.slice(0, 50).map(c => {
      const industry = (c.companies as any)?.industry || 'brak';
      const tags = (c.tags || []).join(', ') || 'brak';
      const profileExcerpt = c.profile_summary?.substring(0, 100) || '';
      return `- ${c.full_name} | Firma: ${c.company || '-'} | Branża: ${industry} | Tagi: ${tags} | ${profileExcerpt}`;
    }).join('\n');

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

    // Build connections summary
    const connectionsSummary = (connectionsResult.data || []).slice(0, 30).map(c => {
      const a = c.contact_a as any;
      const b = c.contact_b as any;
      return `- ${a?.full_name} (${a?.companies?.industry || '-'}) <-> ${b?.full_name} (${b?.companies?.industry || '-'})`;
    }).join('\n');

    // Calculate industry statistics
    const industryStats: Record<string, number> = {};
    contactsWithAgentData.forEach(contact => {
      const industry = (contact.companies as any)?.industry || 
        contact.profile_summary?.match(/branż[aąy]?\s*:?\s*(\w+)/i)?.[1] || 
        'nieznana';
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

    const masterPrompt = `Jesteś Master Agent koordynujący bazę ${contactsWithAgentData.length} kontaktów biznesowych.
Używasz WYSZUKIWANIA SEMANTYCZNEGO - AI rozumie znaczenie słów, nie tylko dokładne dopasowanie tekstu.

## STATYSTYKI BRANŻOWE
${industryStatsSummary || 'Brak danych o branżach'}

${semanticSummary ? `## 🎯 KONTAKTY ZNALEZIONE SEMANTYCZNIE (AI zrozumiało znaczenie pytania!)
Uwaga: Te kontakty zostały znalezione przez wyszukiwanie wektorowe - AI zrozumiało, że np. "kurczak" ≈ "drób" ≈ "mięso".
Wynik [0.00-1.00] oznacza podobieństwo semantyczne.

${semanticSummary}

` : ''}## PRÓBKA WSZYSTKICH KONTAKTÓW (${contactsWithAgentData.length} rekordów)
${allContactsSummary || 'Brak kontaktów'}

## AKTYWNE POTRZEBY
${needsSummary || 'Brak aktywnych potrzeb'}

## AKTYWNE OFERTY
${offersSummary || 'Brak aktywnych ofert'}

## POŁĄCZENIA W SIECI (próbka)
${connectionsSummary || 'Brak połączeń'}

## PYTANIE UŻYTKOWNIKA: "${query}"

WAŻNE INSTRUKCJE:
1. Kontakty oznaczone 🎯 zostały znalezione przez AI semantycznie - NAJPIERW przeanalizuj te wyniki!
2. Wynik [0.85] oznacza 85% podobieństwa semantycznego do pytania
3. Słowa takie jak "kurczak", "drób", "mięso", "ferma" są semantycznie powiązane
4. Jeśli pytanie dotyczy branży, kontakty z wysokim wynikiem są najbardziej relevantne

Zwróć JSON:
\`\`\`json
{
  "answer": "szczegółowa odpowiedź z konkretnymi danymi, imionami i nazwiskami kontaktów",
  "agents_consulted": ["contact_id1", "contact_id2"],
  "data_sources": ["źródła danych użyte do odpowiedzi"],
  "search_method": "semantic" | "fallback_text",
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
      response = { answer: aiContent, agents_consulted: [], recommendations: [], potential_matches: [], search_method: semanticContacts.length > 0 ? 'semantic' : 'fallback_text' };
    }

    // Log query
    await supabase.from('master_agent_queries').insert({ 
      tenant_id: tenantId, 
      query, 
      query_type, 
      agents_consulted: response.agents_consulted || [], 
      reasoning: { 
        data_sources: response.data_sources || [], 
        industry_stats: industryStats,
        semantic_matches: semanticContacts.length,
        search_method: semanticContacts.length > 0 ? 'semantic' : 'fallback_text'
      }, 
      response: response.answer 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        total_contacts: contactsWithAgentData.length,
        semantic_matches: semanticContacts.length,
        search_method: semanticContacts.length > 0 ? 'semantic' : 'fallback_text',
        industry_stats: industryStats, 
        ...response 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
