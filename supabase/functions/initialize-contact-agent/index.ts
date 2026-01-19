import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse, verifyResourceAccess, accessDeniedResponse } from "../_shared/auth.ts";

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

    const { contact_id } = await req.json();

    if (!contact_id) {
      return new Response(
        JSON.stringify({ error: 'contact_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============= RESOURCE ACCESS CHECK =============
    const hasAccess = await verifyResourceAccess(supabase, 'contacts', contact_id, tenantId);
    if (!hasAccess) {
      return accessDeniedResponse(corsHeaders, 'Access denied to this contact');
    }
    // ============= END RESOURCE ACCESS CHECK =============

    console.log(`Initializing agent for contact ${contact_id} in tenant ${tenantId}`);

    // Fetch contact with all related data
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select(`*, company:companies(*), primary_group:contact_groups(*)`)
      .eq('id', contact_id)
      .single();

    if (contactError || !contact) {
      return new Response(
        JSON.stringify({ error: 'Contact not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch related data
    const [consultations, needs, offers, tasks, connections, biData] = await Promise.all([
      supabase.from('consultations').select('*').eq('contact_id', contact_id).order('scheduled_at', { ascending: false }),
      supabase.from('needs').select('*').eq('contact_id', contact_id),
      supabase.from('offers').select('*').eq('contact_id', contact_id),
      supabase.from('task_contacts').select('task_id, role, tasks(*)').eq('contact_id', contact_id),
      supabase.from('connections').select(`*, contact_a:contacts!connections_contact_a_id_fkey(id, full_name), contact_b:contacts!connections_contact_b_id_fkey(id, full_name)`).or(`contact_a_id.eq.${contact_id},contact_b_id.eq.${contact_id}`),
      supabase.from('contact_bi_data').select('*').eq('contact_id', contact_id).maybeSingle()
    ]);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build prompt for AI - now includes memory_summary and topics generation
    const prompt = `Wygeneruj profil agenta AI dla kontaktu biznesowego.

## DANE KONTAKTU
- Imię i nazwisko: ${contact.full_name}
- Stanowisko: ${contact.position || 'nieznane'}
- Firma: ${contact.company?.name || contact.company || 'nieznana'}
- Branża: ${contact.company?.industry || 'nieznana'}
- Miasto: ${contact.city || 'nieznane'}
- Notatki: ${contact.notes || 'Brak'}
- AI Profile Summary: ${contact.profile_summary || 'Brak'}
- Tagi: ${(contact.tags || []).join(', ') || 'brak'}

## POTRZEBY: ${(needs.data || []).map((n: any) => `${n.title} (${n.description?.substring(0, 50) || ''})`).join('; ') || 'Brak'}
## OFERTY: ${(offers.data || []).map((o: any) => `${o.title} (${o.description?.substring(0, 50) || ''})`).join('; ') || 'Brak'}
## KONSULTACJI: ${consultations.data?.length || 0}
${consultations.data?.slice(0, 3).map((c: any) => `- ${c.notes?.substring(0, 100) || c.ai_summary?.substring(0, 100) || 'brak notatek'}`).join('\n') || ''}

Zwróć JSON:
\`\`\`json
{
  "agent_persona": "Opis jak AI powinno myśleć o tej osobie (2-3 zdania)",
  "agent_profile": {
    "pain_points": ["wyzwania"],
    "interests": ["zainteresowania"],
    "goals": ["cele"],
    "communication_style": "styl komunikacji",
    "key_topics": ["tematy do poruszenia"],
    "business_value": "wartość biznesowa"
  },
  "memory_summary": "Zwięzłe podsumowanie (max 500 znaków): kim jest, czym się zajmuje, czego szuka, co oferuje",
  "topics": ["słowa kluczowe", "branża", "specjalizacja", "produkty", "usługi", "zainteresowania biznesowe"],
  "insights": [{"text": "insight", "source": "źródło", "importance": "high/medium/low"}],
  "next_steps": ["następne kroki"],
  "warnings": ["ostrzeżenia"]
}
\`\`\``;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: prompt }] })
    });

    if (!aiResponse.ok) {
      return new Response(JSON.stringify({ error: 'AI service error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';

    let agentData;
    try {
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || aiContent.match(/\{[\s\S]*\}/);
      agentData = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiContent);
    } catch {
      // Fallback - generate basic data from available info
      const fallbackTopics = [
        contact.company?.industry,
        contact.position,
        ...(contact.tags || [])
      ].filter(Boolean);
      
      agentData = {
        agent_persona: `${contact.full_name} - kontakt biznesowy`,
        agent_profile: { pain_points: [], interests: [], goals: [], communication_style: 'Do ustalenia', key_topics: [], business_value: 'Do oceny' },
        memory_summary: `${contact.full_name}${contact.position ? `, ${contact.position}` : ''}${contact.company?.name ? ` w ${contact.company.name}` : ''}. ${contact.profile_summary || ''}`.substring(0, 500),
        topics: fallbackTopics.slice(0, 10),
        insights: [{ text: 'Wymaga więcej danych', source: 'system', importance: 'high' }],
        next_steps: ['Uzupełnij dane'],
        warnings: []
      };
    }

    // Build knowledge sources for initialization
    const knowledgeSources = [
      { type: 'profile', count: 1, updated: new Date().toISOString() },
      { type: 'consultations', count: consultations.data?.length || 0, updated: new Date().toISOString() },
      { type: 'needs', count: needs.data?.length || 0, updated: new Date().toISOString() },
      { type: 'offers', count: offers.data?.length || 0, updated: new Date().toISOString() },
      { type: 'connections', count: connections.data?.length || 0, updated: new Date().toISOString() },
      { type: 'bi_data', count: biData.data ? 1 : 0, updated: new Date().toISOString() }
    ];

    // Upsert agent memory with memory_summary and topics
    const { data: savedAgent, error: saveError } = await supabase
      .from('contact_agent_memory')
      .upsert({
        tenant_id: tenantId,
        contact_id: contact_id,
        agent_persona: agentData.agent_persona,
        agent_profile: { ...agentData.agent_profile, next_steps: agentData.next_steps, warnings: agentData.warnings },
        memory_summary: agentData.memory_summary?.substring(0, 1000) || null,
        topics: agentData.topics || [],
        insights: agentData.insights || [],
        last_refresh_at: new Date().toISOString(),
        last_learning_at: new Date().toISOString(),
        conversation_count: 0,
        knowledge_sources: knowledgeSources,
        refresh_sources: { initialized_at: new Date().toISOString(), data_sources: ['contacts', 'needs', 'offers', 'consultations'] }
      }, { onConflict: 'contact_id' })
      .select()
      .single();

    if (saveError) {
      console.error('Save error:', saveError);
      throw saveError;
    }

    // ============= REGENERATE EMBEDDING WITH AGENT KNOWLEDGE =============
    // CRITICAL: Re-generate embedding so semantic search can find this contact
    // based on agent_persona and agent_profile content (e.g., "BMW", "samochody", "dealer")
    console.log(`[Init Agent] Triggering embedding regeneration for ${contact.full_name}...`);
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const embeddingResponse = await fetch(`${supabaseUrl}/functions/v1/generate-embedding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('Authorization') || '',
        },
        body: JSON.stringify({
          type: 'contact',
          id: contact_id
        })
      });
      
      if (embeddingResponse.ok) {
        console.log(`[Init Agent] ✓ Embedding regenerated for ${contact.full_name} with agent knowledge`);
      } else {
        console.warn(`[Init Agent] Embedding regeneration returned ${embeddingResponse.status}`);
      }
    } catch (embErr) {
      console.warn('[Init Agent] Embedding regeneration failed:', embErr);
      // Don't throw - agent is still initialized, embedding can be regenerated later
    }

    // Log AI agent initialization activity
    await supabase.from('contact_activity_log').insert({
      tenant_id: tenantId,
      contact_id: contact_id,
      activity_type: 'ai_agent_initialized',
      description: 'Zainicjalizowano agenta AI z regeneracją embeddingu',
      metadata: { model: 'google/gemini-2.5-flash', embedding_regenerated: true }
    });

    return new Response(
      JSON.stringify({
        success: true,
        contact_id,
        contact_name: contact.full_name,
        agent: savedAgent,
        memory_summary: agentData.memory_summary,
        topics: agentData.topics,
        topics_count: agentData.topics?.length || 0,
        data_sources: { consultations: consultations.data?.length || 0, needs: needs.data?.length || 0, offers: offers.data?.length || 0, connections: connections.data?.length || 0, bi_data: !!biData.data }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
