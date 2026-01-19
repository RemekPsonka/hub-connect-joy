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

    const { contact_id, trigger = 'manual' } = await req.json();

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

    console.log(`[Learn Agent] Learning for contact ${contact_id}, trigger: ${trigger}`);

    // Check if agent exists
    const { data: existingAgent, error: agentError } = await supabase
      .from('contact_agent_memory')
      .select('*')
      .eq('contact_id', contact_id)
      .single();

    if (agentError || !existingAgent) {
      return new Response(
        JSON.stringify({ 
          error: 'Agent not initialized for this contact',
          suggestion: 'Call initialize-contact-agent first'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch ALL data about the contact
    const [
      contactResult,
      consultationsResult,
      needsResult,
      offersResult,
      tasksResult,
      conversationsResult,
      biDataResult
    ] = await Promise.all([
      supabase
        .from('contacts')
        .select(`*, company:companies(*), primary_group:contact_groups(*)`)
        .eq('id', contact_id)
        .single(),
      supabase
        .from('consultations')
        .select('*')
        .eq('contact_id', contact_id)
        .order('scheduled_at', { ascending: false }),
      supabase
        .from('needs')
        .select('*')
        .eq('contact_id', contact_id),
      supabase
        .from('offers')
        .select('*')
        .eq('contact_id', contact_id),
      supabase
        .from('task_contacts')
        .select('task_id, role, tasks(*)')
        .eq('contact_id', contact_id),
      supabase
        .from('agent_conversations')
        .select('role, content, created_at')
        .eq('contact_id', contact_id)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('contact_bi_data')
        .select('*')
        .eq('contact_id', contact_id)
        .maybeSingle()
    ]);

    const contact = contactResult.data;
    const consultations = consultationsResult.data || [];
    const needs = needsResult.data || [];
    const offers = offersResult.data || [];
    const tasks = tasksResult.data || [];
    const conversations = conversationsResult.data || [];
    const biData = biDataResult.data;

    if (!contact) {
      return new Response(
        JSON.stringify({ error: 'Contact not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build comprehensive learning prompt
    const learningPrompt = `Jesteś Contact Agent dla ${contact.full_name}. 
Przeanalizuj WSZYSTKIE dostępne dane i stwórz skondensowaną wiedzę o tej osobie.

## DANE PODSTAWOWE
- Imię i nazwisko: ${contact.full_name}
- Stanowisko: ${contact.position || 'nieznane'}
- Firma: ${contact.company?.name || contact.company || 'nieznana'}
- Branża firmy: ${contact.company?.industry || 'nieznana'}
- Email: ${contact.email || 'brak'}
- Miasto: ${contact.city || 'nieznane'}
- Notatki: ${contact.notes || 'Brak'}
- AI Profile Summary: ${contact.profile_summary || 'Brak'}
- Tagi: ${(contact.tags || []).join(', ') || 'brak'}
- Siła relacji: ${contact.relationship_strength || 'nieznana'}/10
- Grupa: ${contact.primary_group?.name || 'brak'}

## KONSULTACJE (${consultations.length})
${consultations.slice(0, 10).map((c: any) => 
  `- ${c.scheduled_at?.split('T')[0] || '?'}: ${c.notes?.substring(0, 200) || 'brak notatek'} | AI Summary: ${c.ai_summary?.substring(0, 150) || 'brak'}`
).join('\n') || 'Brak konsultacji'}

## POTRZEBY (${needs.length})
${needs.map((n: any) => `- [${n.status}] ${n.title}: ${n.description?.substring(0, 100) || ''}`).join('\n') || 'Brak potrzeb'}

## OFERTY (${offers.length})
${offers.map((o: any) => `- [${o.status}] ${o.title}: ${o.description?.substring(0, 100) || ''}`).join('\n') || 'Brak ofert'}

## ZADANIA (${tasks.length})
${tasks.slice(0, 10).map((t: any) => `- [${(t.tasks as any)?.status || '?'}] ${(t.tasks as any)?.title || 'brak tytułu'} (rola: ${t.role})`).join('\n') || 'Brak zadań'}

## HISTORIA ROZMÓW Z AGENTEM (${conversations.length} wiadomości)
${conversations.slice(0, 15).map((c: any) => `${c.role}: ${c.content.substring(0, 150)}...`).join('\n') || 'Brak historii rozmów'}

${biData ? `## DANE BI
${JSON.stringify(biData.bi_profile || {}, null, 2).substring(0, 500)}` : ''}

## TWOJE ZADANIE
Przeanalizuj powyższe dane i stwórz:

1. **memory_summary** - Zwięzłe podsumowanie (max 600 znaków) opisujące:
   - Kim jest ta osoba?
   - Czym się zajmuje?
   - Jakie ma potrzeby/szuka czego?
   - Co oferuje?
   - Co jest najważniejsze do zapamiętania?

2. **topics** - Lista 5-15 słów kluczowych/tematów kojarzonych z tą osobą (np. branża, specjalizacja, produkty, usługi, zainteresowania biznesowe)

3. **can_answer** - Lista pytań na które możesz odpowiedzieć o tej osobie

4. **key_insights** - 3-5 najważniejszych spostrzeżeń

Zwróć JSON:
\`\`\`json
{
  "memory_summary": "Kim jest, czym się zajmuje, czego szuka, co oferuje...",
  "topics": ["temat1", "temat2", "branża", "specjalizacja", ...],
  "can_answer": ["Na jakie pytania mogę odpowiedzieć?", ...],
  "key_insights": [
    {"text": "insight", "importance": "high/medium/low"}
  ]
}
\`\`\``;

    console.log(`[Learn Agent] Sending learning request to AI...`);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({ 
        model: 'google/gemini-2.5-flash', 
        messages: [{ role: 'user', content: learningPrompt }] 
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI service error:', aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: 'AI service error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';

    let learningData;
    try {
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || aiContent.match(/\{[\s\S]*\}/);
      learningData = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiContent);
    } catch {
      console.error('Failed to parse AI response:', aiContent);
      learningData = {
        memory_summary: `${contact.full_name} - kontakt biznesowy. ${contact.profile_summary || ''}`.substring(0, 600),
        topics: contact.tags || [],
        can_answer: ['Podstawowe informacje o kontakcie'],
        key_insights: [{ text: 'Wymaga więcej danych do pełnej analizy', importance: 'high' }]
      };
    }

    // Build knowledge sources list
    const knowledgeSources = [
      { type: 'profile', count: 1, updated: new Date().toISOString() },
      { type: 'consultations', count: consultations.length, updated: new Date().toISOString() },
      { type: 'needs', count: needs.length, updated: new Date().toISOString() },
      { type: 'offers', count: offers.length, updated: new Date().toISOString() },
      { type: 'tasks', count: tasks.length, updated: new Date().toISOString() },
      { type: 'conversations', count: conversations.length, updated: new Date().toISOString() },
      { type: 'bi_data', count: biData ? 1 : 0, updated: new Date().toISOString() }
    ];

    // Update agent memory with learned knowledge
    const { error: updateError } = await supabase
      .from('contact_agent_memory')
      .update({
        memory_summary: learningData.memory_summary?.substring(0, 1000) || null,
        topics: learningData.topics || [],
        conversation_count: (existingAgent.conversation_count || 0) + (trigger === 'conversation' ? 1 : 0),
        last_learning_at: new Date().toISOString(),
        knowledge_sources: knowledgeSources,
        insights: [
          ...(existingAgent.insights || []),
          ...(learningData.key_insights || []).map((i: any) => ({
            ...i,
            source: `learn-agent:${trigger}`,
            created_at: new Date().toISOString()
          }))
        ].slice(-20) // Keep last 20 insights
      })
      .eq('contact_id', contact_id);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    // Log learning activity
    await supabase.from('contact_activity_log').insert({
      tenant_id: tenantId,
      contact_id: contact_id,
      activity_type: 'ai_agent_learned',
      description: `Agent zaktualizował wiedzę (trigger: ${trigger})`,
      metadata: { 
        trigger, 
        topics_count: learningData.topics?.length || 0,
        sources: knowledgeSources.filter(s => s.count > 0).map(s => s.type)
      }
    });

    console.log(`[Learn Agent] Successfully updated agent knowledge for ${contact.full_name}`);

    return new Response(
      JSON.stringify({
        success: true,
        contact_id,
        contact_name: contact.full_name,
        trigger,
        memory_summary: learningData.memory_summary,
        topics: learningData.topics,
        topics_count: learningData.topics?.length || 0,
        can_answer: learningData.can_answer,
        key_insights_count: learningData.key_insights?.length || 0,
        knowledge_sources: knowledgeSources.filter(s => s.count > 0)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
