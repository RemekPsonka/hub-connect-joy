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

    // Fetch ALL data about the contact including full company analysis
    const [
      contactResult,
      consultationsResult,
      needsResult,
      offersResult,
      tasksResult,
      conversationsResult,
      biDataResult,
      dealTeamResult
    ] = await Promise.all([
      supabase
        .from('contacts')
        .select(`*, 
          company:companies(
            id, name, industry, website, description, 
            revenue_amount, employee_count, growth_rate,
            ai_analysis, analysis_confidence_score,
            www_data, external_data, 
            source_data_api, financial_data_3y
          ), 
          primary_group:contact_groups(*)`)
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
        .maybeSingle(),
      supabase
        .from('deal_team_contacts')
        .select('id, notes, category, status')
        .eq('contact_id', contact_id)
    ]);

    const contact = contactResult.data;
    const consultations = consultationsResult.data || [];
    const needs = needsResult.data || [];
    const offers = offersResult.data || [];
    const tasks = tasksResult.data || [];
    const conversations = conversationsResult.data || [];
    const biData = biDataResult.data;
    const dealTeamContacts = dealTeamResult.data || [];

    // Build deal context for learning
    let dealContextStr = '';
    if (dealTeamContacts.length > 0) {
      const dtcIds = dealTeamContacts.map((d: any) => d.id);
      const { data: weeklyStatuses } = await supabase
        .from('deal_team_weekly_statuses')
        .select('week_start, status_summary, next_steps, blockers')
        .in('team_contact_id', dtcIds)
        .order('created_at', { ascending: false })
        .limit(5);
      
      const dealNotes = dealTeamContacts.filter((d: any) => d.notes).map((d: any) => d.notes.substring(0, 200));
      
      if (dealNotes.length > 0) {
        dealContextStr += `\n## NOTATKI Z PROCESU SPRZEDAŻY\n${dealNotes.join('\n')}`;
      }
      if (weeklyStatuses && weeklyStatuses.length > 0) {
        dealContextStr += `\n## STATUSY TYGODNIOWE\n${weeklyStatuses.map((ws: any) => 
          `- ${ws.week_start}: ${ws.status_summary}${ws.next_steps ? ` → ${ws.next_steps}` : ''}${ws.blockers ? ` ⚠ ${ws.blockers}` : ''}`
        ).join('\n')}`;
      }
    }

    // Fetch task comments
    const taskIds = tasks.map((t: any) => t.task_id);
    let taskCommentsStr = '';
    if (taskIds.length > 0) {
      const { data: comments } = await supabase
        .from('task_comments')
        .select('content')
        .in('task_id', taskIds)
        .order('created_at', { ascending: false })
        .limit(5);
      if (comments && comments.length > 0) {
        taskCommentsStr = `\n## KOMENTARZE DO ZADAŃ\n${comments.map((c: any) => `- ${c.content.substring(0, 150)}`).join('\n')}`;
      }
    }

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

    // Extract company data for learning
    const company = contact.company as any;
    const aiAnalysis = company?.ai_analysis as any;
    
    // Build company context section
    let companyContext = '';
    if (company) {
      companyContext = `
## DANE FIRMY: ${company.name || 'nieznana'}
- Branża: ${company.industry || 'nieznana'}
- Strona WWW: ${company.website || 'brak'}
- Opis: ${company.description?.substring(0, 300) || 'brak'}
- Przychody: ${company.revenue_amount ? `${company.revenue_amount} PLN` : 'nieznane'}
- Zatrudnienie: ${company.employee_count || 'nieznane'}
- Wzrost: ${company.growth_rate ? `${company.growth_rate}%` : 'nieznany'}`;

      if (aiAnalysis) {
        const products = aiAnalysis.products_and_services?.products || [];
        const services = aiAnalysis.products_and_services?.services || [];
        
        companyContext += `

## ANALIZA AI FIRMY (pełny profil 16-sekcyjny)
### Produkty firmy (${products.length}):
${products.slice(0, 8).map((p: any) => `- ${p.name || p}: ${p.description?.substring(0, 100) || ''}`).join('\n') || 'brak danych'}

### Usługi firmy (${services.length}):
${services.slice(0, 8).map((s: any) => `- ${s.name || s}: ${s.description?.substring(0, 100) || ''}`).join('\n') || 'brak danych'}

### Model biznesowy firmy:
- Typ: ${aiAnalysis.business_model?.type || 'nieznany'}
- Główne źródła przychodu: ${(aiAnalysis.business_model?.revenue_sources || []).join(', ') || 'nieznane'}
- Opis: ${aiAnalysis.business_model?.description?.substring(0, 150) || 'brak'}

### Klienci firmy:
- Typy klientów: ${(aiAnalysis.clients_projects?.client_types || []).join(', ') || 'nieznane'}
- Sektory: ${(aiAnalysis.clients_projects?.sectors || []).join(', ') || 'nieznane'}
- Przykładowi klienci: ${(aiAnalysis.clients_projects?.notable_clients || []).slice(0, 5).join(', ') || 'brak'}

### Konkurencja:
${(aiAnalysis.competition?.competitors || []).slice(0, 5).map((c: any) => `- ${c.name || c}: ${c.description?.substring(0, 60) || ''}`).join('\n') || 'brak danych'}
- Pozycja rynkowa: ${aiAnalysis.competition?.market_position || 'nieznana'}

### Czego firma szuka:
- Szukani klienci: ${aiAnalysis.seeking?.clients?.substring(0, 150) || 'brak danych'}
- Szukani partnerzy: ${aiAnalysis.seeking?.partners?.substring(0, 150) || 'brak danych'}
- Szukani pracownicy: ${aiAnalysis.seeking?.employees?.substring(0, 150) || 'brak danych'}

### Możliwości współpracy:
${(aiAnalysis.collaboration?.opportunities || []).slice(0, 5).map((o: any) => `- ${o.area || o}: ${o.description?.substring(0, 100) || ''}`).join('\n') || 'brak danych'}

### Zarząd firmy:
${(aiAnalysis.management?.people || []).slice(0, 5).map((p: any) => `- ${p.name}: ${p.position || 'brak'} - ${p.background?.substring(0, 60) || ''}`).join('\n') || 'brak danych'}

### Lokalizacje i zasięg:
- Siedziba: ${aiAnalysis.locations_coverage?.headquarters || 'nieznana'}
- Zasięg: ${aiAnalysis.locations_coverage?.coverage_area || 'nieznany'}
- Oddziały: ${(aiAnalysis.locations_coverage?.locations || []).slice(0, 3).map((l: any) => l.city || l).join(', ') || 'brak'}

### Najnowsze wiadomości:
${(aiAnalysis.news_signals?.items || []).slice(0, 3).map((n: any) => `- ${n.title?.substring(0, 100) || n}`).join('\n') || 'brak'}

### CSR / Działalność społeczna:
${aiAnalysis.csr?.activities?.slice(0, 2).map((a: any) => `- ${a.name || a}: ${a.description?.substring(0, 80) || ''}`).join('\n') || 'brak danych'}`;
      }
      
      // Add financial data if available
      const financialData = company.financial_data_3y as any;
      if (financialData) {
        companyContext += `

### Szczegółowe dane finansowe:
${JSON.stringify(financialData).substring(0, 500)}`;
      }
    }

    // Build comprehensive learning prompt
    const learningPrompt = `Jesteś Contact Agent dla ${contact.full_name}. 
Przeanalizuj WSZYSTKIE dostępne dane o OSOBIE oraz jej FIRMIE i stwórz skondensowaną wiedzę.

## DANE PODSTAWOWE OSOBY
- Imię i nazwisko: ${contact.full_name}
- Stanowisko: ${contact.position || 'nieznane'}
- Firma: ${company?.name || contact.company || 'nieznana'}
- Branża firmy: ${company?.industry || 'nieznana'}
- Email: ${contact.email || 'brak'}
- Miasto: ${contact.city || 'nieznane'}
- Notatki: ${contact.notes || 'Brak'}
- AI Profile Summary: ${contact.profile_summary || 'Brak'}
- Tagi: ${(contact.tags || []).join(', ') || 'brak'}
- Siła relacji: ${contact.relationship_strength || 5}/10 ${(contact.relationship_strength || 5) <= 3 ? '(słaba - wymaga budowania zaufania)' : (contact.relationship_strength || 5) >= 7 ? '(silna - można działać biznesowo)' : '(średnia)'}
- Grupa: ${contact.primary_group?.name || 'brak'}
${companyContext}
${dealContextStr}
${taskCommentsStr}

## KONSULTACJE Z TĄ OSOBĄ (${consultations.length})
${consultations.slice(0, 10).map((c: any) => 
  `- ${c.scheduled_at?.split('T')[0] || '?'}: ${c.notes?.substring(0, 200) || 'brak notatek'} | AI Summary: ${c.ai_summary?.substring(0, 150) || 'brak'}`
).join('\n') || 'Brak konsultacji'}

## POTRZEBY KONTAKTU (${needs.length})
${needs.map((n: any) => `- [${n.status}] ${n.title}: ${n.description?.substring(0, 100) || ''}`).join('\n') || 'Brak potrzeb'}

## OFERTY KONTAKTU (${offers.length})
${offers.map((o: any) => `- [${o.status}] ${o.title}: ${o.description?.substring(0, 100) || ''}`).join('\n') || 'Brak ofert'}

## ZADANIA (${tasks.length})
${tasks.slice(0, 10).map((t: any) => `- [${(t.tasks as any)?.status || '?'}] ${(t.tasks as any)?.title || 'brak tytułu'} (rola: ${t.role})`).join('\n') || 'Brak zadań'}

## HISTORIA ROZMÓW Z AGENTEM (${conversations.length} wiadomości)
${conversations.slice(0, 15).map((c: any) => `${c.role}: ${c.content.substring(0, 150)}...`).join('\n') || 'Brak historii rozmów'}

${biData ? `## DANE BI
${JSON.stringify(biData.bi_profile || {}, null, 2).substring(0, 500)}` : ''}

## TWOJE ZADANIE
Przeanalizuj powyższe dane O OSOBIE I JEJ FIRMIE i stwórz:

1. **memory_summary** - Zwięzłe podsumowanie (max 700 znaków) opisujące:
   - Kim jest ta osoba i jaka jest jej rola?
   - Czym zajmuje się jej firma (produkty, usługi)?
   - Jakie ma potrzeby / czego szuka?
   - Co oferuje?
   - Jaki jest kontekst biznesowy?

2. **topics** - Lista 10-20 słów kluczowych/tematów:
   - Imię i nazwisko, stanowisko
   - Nazwa firmy, branża
   - Produkty i usługi firmy
   - Specjalizacje, kompetencje
   - Zainteresowania biznesowe
   - Kluczowe tematy z konsultacji

3. **can_answer** - Lista pytań na które możesz odpowiedzieć o tej osobie I jej firmie

4. **key_insights** - 3-7 najważniejszych spostrzeżeń o osobie i firmie

Zwróć JSON:
\`\`\`json
{
  "memory_summary": "Kim jest osoba, jaka firma, czym się zajmują, czego szukają, co oferują...",
  "topics": ["imię", "stanowisko", "firma", "branża", "produkty", "usługi", "specjalizacja", ...],
  "can_answer": ["Pytania o osobę", "Pytania o firmę", "Pytania o produkty/usługi", ...],
  "key_insights": [
    {"text": "insight o osobie lub firmie", "importance": "high/medium/low"}
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

    // ============= TRIGGER EMBEDDING REGENERATION =============
    // This ensures the contact's profile_embedding includes agent knowledge
    console.log(`[Learn Agent] Triggering embedding regeneration to include agent knowledge...`);
    
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
        console.log(`[Learn Agent] Embedding regenerated successfully for ${contact.full_name}`);
      } else {
        console.warn(`[Learn Agent] Embedding regeneration failed: ${embeddingResponse.status}`);
      }
    } catch (embeddingError) {
      console.warn(`[Learn Agent] Embedding regeneration error:`, embeddingError);
      // Don't fail the whole operation if embedding fails
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
        sources: knowledgeSources.filter(s => s.count > 0).map(s => s.type),
        embedding_regenerated: true
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
        knowledge_sources: knowledgeSources.filter(s => s.count > 0),
        embedding_regenerated: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
