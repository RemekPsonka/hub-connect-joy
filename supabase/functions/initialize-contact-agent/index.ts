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

    // Fetch contact with all related data including full company analysis
    const { data: contact, error: contactError } = await supabase
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
      .single();

    if (contactError || !contact) {
      return new Response(
        JSON.stringify({ error: 'Contact not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch related data including deal team context
    const [consultations, needs, offers, tasks, connections, biData, dealTeamResult] = await Promise.all([
      supabase.from('consultations').select('*').eq('contact_id', contact_id).order('scheduled_at', { ascending: false }),
      supabase.from('needs').select('*').eq('contact_id', contact_id),
      supabase.from('offers').select('*').eq('contact_id', contact_id),
      supabase.from('task_contacts').select('task_id, role, tasks(*)').eq('contact_id', contact_id),
      supabase.from('connections').select(`*, contact_a:contacts!connections_contact_a_id_fkey(id, full_name), contact_b:contacts!connections_contact_b_id_fkey(id, full_name)`).or(`contact_a_id.eq.${contact_id},contact_b_id.eq.${contact_id}`),
      supabase.from('contact_bi').select('contact_id, answers, ai_summary, last_filled_at').eq('contact_id', contact_id).maybeSingle(),
      supabase.from('deal_team_contacts').select('id, notes, category, status').eq('contact_id', contact_id),
    ]);

    // Fetch weekly statuses + task comments for enriched context
    let dealContextStr = '';
    const dealTeamContacts = dealTeamResult.data || [];
    if (dealTeamContacts.length > 0) {
      const dtcIds = dealTeamContacts.map((d: any) => d.id);
      const { data: weeklyStatuses } = await supabase
        .from('deal_team_weekly_statuses')
        .select('week_start, status_summary, next_steps')
        .in('team_contact_id', dtcIds)
        .order('created_at', { ascending: false })
        .limit(3);
      
      const dealNotes = dealTeamContacts.filter((d: any) => d.notes).map((d: any) => d.notes.substring(0, 200));
      
      if (dealNotes.length > 0 || (weeklyStatuses && weeklyStatuses.length > 0)) {
        dealContextStr = '\n## KONTEKST PROCESU SPRZEDAŻY';
        if (dealNotes.length > 0) dealContextStr += `\nNotatki Kanban: ${dealNotes.join('; ')}`;
        if (weeklyStatuses && weeklyStatuses.length > 0) {
          dealContextStr += `\nStatusy tygodniowe:\n${weeklyStatuses.map((ws: any) => `- ${ws.week_start}: ${ws.status_summary}`).join('\n')}`;
        }
      }
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Extract company data for prompt
    const company = contact.company;
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
- Wzrost: ${company.growth_rate ? `${company.growth_rate}%` : 'nieznany'}
- Pewność analizy: ${company.analysis_confidence_score || 'brak'}%`;

      if (aiAnalysis) {
        // Products and services
        const products = aiAnalysis.products_and_services?.products || [];
        const services = aiAnalysis.products_and_services?.services || [];
        
        companyContext += `

## ANALIZA AI FIRMY (16 sekcji)
### Produkty (${products.length}):
${products.slice(0, 5).map((p: any) => `- ${p.name || p}: ${p.description?.substring(0, 80) || ''}`).join('\n') || 'brak danych'}

### Usługi (${services.length}):
${services.slice(0, 5).map((s: any) => `- ${s.name || s}: ${s.description?.substring(0, 80) || ''}`).join('\n') || 'brak danych'}

### Model biznesowy:
- Typ: ${aiAnalysis.business_model?.type || 'nieznany'}
- Główne źródła przychodu: ${(aiAnalysis.business_model?.revenue_sources || []).join(', ') || 'nieznane'}

### Klienci:
- Typy klientów: ${(aiAnalysis.clients_projects?.client_types || []).join(', ') || 'nieznane'}
- Sektory: ${(aiAnalysis.clients_projects?.sectors || []).join(', ') || 'nieznane'}

### Konkurencja:
${(aiAnalysis.competition?.competitors || []).slice(0, 3).map((c: any) => `- ${c.name || c}`).join('\n') || 'brak danych'}

### Czego firma szuka:
- Klienci: ${aiAnalysis.seeking?.clients?.substring(0, 100) || 'brak danych'}
- Partnerzy: ${aiAnalysis.seeking?.partners?.substring(0, 100) || 'brak danych'}
- Pracownicy: ${aiAnalysis.seeking?.employees?.substring(0, 100) || 'brak danych'}

### Możliwości współpracy:
${(aiAnalysis.collaboration?.opportunities || []).slice(0, 3).map((o: any) => `- ${o.area || o}: ${o.description?.substring(0, 80) || ''}`).join('\n') || 'brak danych'}

### Zarząd firmy:
${(aiAnalysis.management?.people || []).slice(0, 3).map((p: any) => `- ${p.name}: ${p.position || 'brak stanowiska'}`).join('\n') || 'brak danych'}

### Najnowsze wiadomości:
${(aiAnalysis.news_signals?.items || []).slice(0, 2).map((n: any) => `- ${n.title?.substring(0, 80) || n}`).join('\n') || 'brak'}`;
      }
      
      // Add financial data if available
      const financialData = company.financial_data_3y as any;
      if (financialData) {
        companyContext += `

### Dane finansowe:
${JSON.stringify(financialData).substring(0, 400)}`;
      }
    }

    // Build data strings for prompt
    const needsStr = (needs.data || []).map((n: any) => `${n.title} (${n.description?.substring(0, 100) || ''})`).join('; ') || 'Brak';
    const offersStr = (offers.data || []).map((o: any) => `${o.title} (${o.description?.substring(0, 100) || ''})`).join('; ') || 'Brak';
    const consultationsStr = consultations.data?.slice(0, 5).map((c: any) => `- ${c.notes?.substring(0, 200) || c.ai_summary?.substring(0, 200) || 'brak notatek'}`).join('\n') || 'brak';
    const biDataStr = biData.data ? JSON.stringify(biData.data).substring(0, 500) : 'brak danych BI';

    // Build prompt for AI - ROZBUDOWANY prompt generujący szczegółowe dane z uzasadnieniami
    const prompt = `Jesteś ekspertem od analizy biznesowej i relacji B2B. Przygotuj SZCZEGÓŁOWY, POGŁĘBIONY profil osoby i GOTOWY BRIEF pod spotkanie biznesowe.

## ZASADY KRYTYCZNE:
1. NIGDY nie pisz hasłowo - każdy punkt musi być UZASADNIONY i ROZWINIĘTY (minimum 2-3 zdania)
2. Każde wyzwanie/cel MUSI zawierać KONTEKST i DLACZEGO jest ważne dla TEJ osoby
3. Uwzględnij perspektywę OSOBY (rola, decyzyjność, styl) I jej FIRMY (sytuacja, produkty, finanse)
4. Przygotuj KONKRETNY brief pod spotkanie z DO/DON'T
5. Wszystkie odpowiedzi po polsku

## DANE KONTAKTU
- Imię i nazwisko: ${contact.full_name}
- Stanowisko: ${contact.position || 'nieznane'}
- Firma: ${company?.name || contact.company || 'nieznana'}
- Branża: ${company?.industry || 'nieznana'}
- Miasto: ${contact.city || 'nieznane'}
- Siła relacji: ${contact.relationship_strength || 5}/10 ${(contact.relationship_strength || 5) <= 3 ? '⚠️ SŁABA RELACJA - priorytet: BUDOWANIE ZAUFANIA' : (contact.relationship_strength || 5) >= 7 ? '✓ SILNA RELACJA - można przejść do konkretu biznesowego' : ''}
- Notatki: ${contact.notes || 'Brak'}
- AI Profile Summary: ${contact.profile_summary || 'Brak'}
- Tagi: ${(contact.tags || []).join(', ') || 'brak'}
${companyContext}
${dealContextStr}

## INSTRUKCJE DOT. SIŁY RELACJI
${(contact.relationship_strength || 5) <= 3 ? `
⚠️ SŁABA RELACJA (${contact.relationship_strength || 5}/10):
- Agent powinien położyć DUŻY nacisk na budowanie relacji i zaufania
- Szukaj wspólnych zainteresowań (hobby, sport, rodzina)
- Zadawaj pytania osobiste (ale nie natarczywe)
- Unikaj twardych tematów sprzedażowych
- Proponuj spotkania nieformalne
- DO: poznaj człowieka zanim przejdziesz do biznesu
- DON'T: nie naciskaj na decyzje biznesowe
` : (contact.relationship_strength || 5) >= 7 ? `
✓ SILNA RELACJA (${contact.relationship_strength || 5}/10):
- Można przejść od razu do konkretów biznesowych
- Proponuj ambitne cele i projekty
- Bądź bezpośredni w komunikacji
- Możesz prosić o polecenia i referencje
` : `
ŚREDNIA RELACJA (${contact.relationship_strength || 5}/10):
- Zbalansowane podejście - budowanie relacji + lekkie tematy biznesowe
- Mieszaj tematy osobiste z biznesowymi
- Sprawdzaj czy jest otwarty na konkretne propozycje
`}

## POTRZEBY KONTAKTU: ${needsStr}
## OFERTY KONTAKTU: ${offersStr}
## KONSULTACJE (${consultations.data?.length || 0}):
${consultationsStr}

## BI DATA (jeśli dostępne):
${biDataStr}

Zwróć JSON z ROZBUDOWANYMI sekcjami:

{
  "agent_persona": "Kim jest ta osoba w kontekście jej firmy i jak budować z nią relację. 3-4 zdania opisujące człowieka, jego pozycję, styl myślenia i podejście do biznesu.",
  
  "person_profile": {
    "summary": "Szczegółowy opis osoby: kim jest, jaką ma historię, czym się wyróżnia, jakie ma podejście do pracy (4-5 zdań)",
    "role_in_company": "Dokładny opis roli w firmie: zakres odpowiedzialności, wpływ na decyzje, kluczowe obszary działania",
    "decision_making_style": "Jak podejmuje decyzje: szybko/wolno, analitycznie/intuicyjnie, samodzielnie/zespołowo",
    "communication_preferences": "Preferowany styl komunikacji: formalny/nieformalny, szczegółowy/skrótowy, co cenią w rozmówcach"
  },
  
  "challenges_detailed": [
    {
      "challenge": "Nazwa wyzwania",
      "context": "Dlaczego to wyzwanie istnieje - kontekst sytuacji firmy i osoby (2-3 zdania)",
      "why_it_matters": "Dlaczego to jest ważne dla TEJ konkretnej osoby, jakie ma konsekwencje",
      "potential_approach": "Jak możemy pomóc w tym wyzwaniu - konkretne propozycje"
    }
  ],
  
  "goals_detailed": [
    {
      "goal": "Cel osoby/firmy",
      "timeline": "short/medium/long",
      "priority": "high/medium/low",
      "context": "Dlaczego ten cel jest istotny, z czego wynika",
      "how_we_can_help": "Konkretna propozycja jak możemy wesprzeć osiągnięcie tego celu"
    }
  ],
  
  "topics_to_discuss": [
    {
      "topic": "Temat do rozmowy",
      "why_relevant": "Dlaczego warto poruszyć ten temat - co łączy z naszą ofertą/wspólnymi interesami",
      "suggested_angle": "Z jakiej perspektywy podejść, jakie pytania zadać"
    }
  ],
  
  "business_value_detailed": {
    "summary": "Rozwinięta ocena wartości biznesowej tej relacji (3-4 zdania)",
    "strategic_importance": "Dlaczego ta relacja jest strategicznie ważna",
    "potential_deal_size": "Szacunkowa skala potencjalnej współpracy",
    "risks": "Potencjalne ryzyka i jak je mitygować"
  },
  
  "company_context": {
    "key_facts": "Najważniejsze fakty o firmie wpływające na relację",
    "current_situation": "Aktualna sytuacja firmy (finansowa, rynkowa, strategiczna)",
    "products_services_relevant": "Produkty/usługi firmy istotne dla naszej współpracy",
    "opportunities": "Konkretne możliwości współpracy wynikające z analizy firmy"
  },
  
  "meeting_brief": {
    "one_liner": "Najważniejsza rzecz do zapamiętania przed spotkaniem (1 zdanie)",
    "what_to_know": [
      "Kluczowa informacja #1 o osobie/firmie (pełne zdanie z kontekstem)",
      "Kluczowa informacja #2",
      "Kluczowa informacja #3",
      "Kluczowa informacja #4"
    ],
    "do": [
      "Konkretna rzecz którą POWINIENEŚ robić w rozmowie (z uzasadnieniem)",
      "Kolejna rekomendacja DO",
      "Kolejna rekomendacja DO"
    ],
    "dont": [
      "Konkretna rzecz której UNIKAJ w rozmowie (z uzasadnieniem)",
      "Kolejna rekomendacja DON'T",
      "Kolejna rekomendacja DON'T"
    ],
    "opening_topics": [
      "Temat na otwarcie rozmowy #1",
      "Temat na otwarcie rozmowy #2",
      "Temat na otwarcie rozmowy #3"
    ]
  },
  
  "memory_summary": "Zwięzłe, ale treściwe podsumowanie (max 800 znaków): kim jest osoba, jaka jest jej rola, czym firma się zajmuje, jaka jest sytuacja, czego szuka, co oferuje, co jest najważniejsze w relacji",
  
  "topics": ["słowa kluczowe opisujące osobę", "branża", "produkty firmy", "usługi", "specjalizacja", "zainteresowania biznesowe"],
  
  "insights": [
    {
      "text": "Rozwinięty insight o osobie lub firmie z uzasadnieniem dlaczego jest ważny (2-3 zdania)",
      "source": "Źródło tego wniosku (np. dane finansowe, historia, konsultacje)",
      "importance": "high/medium/low"
    }
  ],
  
  "next_steps": [
    "Konkretny, szczegółowy następny krok z uzasadnieniem dlaczego teraz i jak to zrobić"
  ],
  
  "warnings": ["Ostrzeżenie z wyjaśnieniem dlaczego jest istotne"]
}`;

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

    // Upsert agent memory with ALL new detailed fields in agent_profile
    const { data: savedAgent, error: saveError } = await supabase
      .from('contact_agent_memory')
      .upsert({
        tenant_id: tenantId,
        contact_id: contact_id,
        agent_persona: agentData.agent_persona,
        agent_profile: { 
          // Nowe rozbudowane sekcje
          person_profile: agentData.person_profile || null,
          challenges_detailed: agentData.challenges_detailed || [],
          goals_detailed: agentData.goals_detailed || [],
          topics_to_discuss: agentData.topics_to_discuss || [],
          business_value_detailed: agentData.business_value_detailed || null,
          company_context: agentData.company_context || null,
          meeting_brief: agentData.meeting_brief || null,
          // Legacy fields for backward compatibility
          pain_points: agentData.challenges_detailed?.map((c: any) => c.challenge) || [],
          goals: agentData.goals_detailed?.map((g: any) => g.goal) || [],
          key_topics: agentData.topics_to_discuss?.map((t: any) => t.topic) || [],
          business_value: agentData.business_value_detailed?.summary || '',
          next_steps: agentData.next_steps || [], 
          warnings: agentData.warnings || []
        },
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
    await supabase.from('audit_log').insert({
      tenant_id: tenantId,
      entity_type: 'contact',
      entity_id: contact_id,
      actor_id: null,
      action: 'ai_agent_initialized',
      diff: {},
      metadata: {
        description: 'Zainicjalizowano agenta AI z regeneracją embeddingu',
        model: 'google/gemini-2.5-flash',
        embedding_regenerated: true,
      }
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
