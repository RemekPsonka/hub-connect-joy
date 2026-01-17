import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contact_id } = await req.json();

    if (!contact_id) {
      return new Response(
        JSON.stringify({ error: 'contact_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch contact with all related data including profile_summary
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select(`
        *,
        company:companies(*),
        primary_group:contact_groups(*)
      `)
      .eq('id', contact_id)
      .single();

    if (contactError || !contact) {
      console.error('Contact fetch error:', contactError);
      return new Response(
        JSON.stringify({ error: 'Contact not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch ALL consultations (not limited) for full timeline
    const { data: consultations } = await supabase
      .from('consultations')
      .select('*')
      .eq('contact_id', contact_id)
      .order('scheduled_at', { ascending: false });

    // 3. Fetch consultation_meetings for this contact
    const { data: consultationMeetings } = await supabase
      .from('consultation_meetings')
      .select(`
        *,
        consultation:consultations(scheduled_at, status)
      `)
      .eq('contact_id', contact_id)
      .order('meeting_date', { ascending: false });

    // 4. Fetch consultation_recommendations (given and received)
    const { data: recommendations } = await supabase
      .from('consultation_recommendations')
      .select(`
        *,
        consultation:consultations(scheduled_at, contact_id),
        recommended_contact:contacts!consultation_recommendations_contact_id_fkey(full_name, company)
      `)
      .or(`contact_id.eq.${contact_id}`)
      .order('created_at', { ascending: false });

    // Also fetch recommendations WHERE this contact was recommended to others
    const { data: recommendationsReceived } = await supabase
      .from('consultation_recommendations')
      .select(`
        *,
        consultation:consultations(scheduled_at, contact_id, contacts:contact_id(full_name))
      `)
      .eq('contact_id', contact_id);

    // 5. Fetch consultation_thanks (business benefits)
    const { data: thanks } = await supabase
      .from('consultation_thanks')
      .select(`
        *,
        consultation:consultations(scheduled_at, contact_id)
      `)
      .eq('contact_id', contact_id);

    // 6. Fetch needs
    const { data: needs } = await supabase
      .from('needs')
      .select('*')
      .eq('contact_id', contact_id);

    // 7. Fetch offers
    const { data: offers } = await supabase
      .from('offers')
      .select('*')
      .eq('contact_id', contact_id);

    // 8. Fetch tasks related to this contact with details
    const { data: taskContacts } = await supabase
      .from('task_contacts')
      .select('task_id, role, tasks(*)')
      .eq('contact_id', contact_id);

    // 9. Fetch connections
    const { data: connections } = await supabase
      .from('connections')
      .select(`
        *,
        contact_a:contacts!connections_contact_a_id_fkey(id, full_name, company, position),
        contact_b:contacts!connections_contact_b_id_fkey(id, full_name, company, position)
      `)
      .or(`contact_a_id.eq.${contact_id},contact_b_id.eq.${contact_id}`);

    // 10. Fetch consultation questionnaires for deeper insights
    const consultationIds = (consultations || []).map(c => c.id);
    let questionnaires: any[] = [];
    if (consultationIds.length > 0) {
      const { data: q } = await supabase
        .from('consultation_questionnaire')
        .select('*')
        .in('consultation_id', consultationIds);
      questionnaires = q || [];
    }

    // 11. Fetch BI data if exists
    let biData: any = null;
    const { data: biDataResult } = await supabase
      .from('contact_bi_data')
      .select('*')
      .eq('contact_id', contact_id)
      .maybeSingle();
    
    if (biDataResult) {
      biData = biDataResult;
    }

    // Build TIMELINE - chronological history
    const timeline: Array<{date: string; type: string; description: string; details?: string}> = [];

    // Add consultations to timeline
    (consultations || []).forEach(c => {
      timeline.push({
        date: c.scheduled_at,
        type: 'consultation',
        description: `Konsultacja: ${c.status}`,
        details: `Agenda: ${c.agenda || 'brak'}\nNotatki: ${c.notes?.substring(0, 300) || 'brak'}\nPodsumowanie AI: ${c.ai_summary?.substring(0, 300) || 'brak'}`
      });
    });

    // Add consultation meetings to timeline
    (consultationMeetings || []).forEach(m => {
      timeline.push({
        date: m.meeting_date || m.created_at,
        type: 'meeting',
        description: `Spotkanie ${m.meeting_type}: ${m.contact_name || contact.full_name}`,
        details: `Firma: ${m.company || 'brak'}\nKomentarz: ${m.comment || 'brak'}\nFollow-up: ${m.follow_up || 'brak'}`
      });
    });

    // Add tasks with due dates to timeline
    (taskContacts || []).forEach((tc: any) => {
      if (tc.tasks?.due_date) {
        timeline.push({
          date: tc.tasks.due_date,
          type: 'task',
          description: `Zadanie: ${tc.tasks.title} (${tc.tasks.status})`,
          details: `Rola: ${tc.role}\nPriorytet: ${tc.tasks.priority}\nOpis: ${tc.tasks.description?.substring(0, 200) || 'brak'}`
        });
      }
    });

    // Sort timeline by date descending
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Build context for AI - EXTENDED VERSION
    const connectionsSummary = (connections || []).map(c => {
      const otherContact = c.contact_a?.id === contact_id ? c.contact_b : c.contact_a;
      return {
        name: otherContact?.full_name,
        company: otherContact?.company,
        position: otherContact?.position,
        type: c.connection_type,
        strength: c.strength
      };
    }).filter(c => c.name);

    const thanksSummary = (thanks || []).map(t => ({
      type: t.business_benefit_type,
      amount: t.transaction_amount,
      date: t.consultation?.scheduled_at
    }));

    const recommendationsSummary = [
      ...(recommendations || []).map(r => ({
        direction: 'given',
        type: r.recommendation_type,
        kind: r.recommendation_kind,
        topic: r.topic,
        to: r.recommended_contact?.full_name,
        company: r.company
      })),
      ...(recommendationsReceived || []).map(r => ({
        direction: 'received',
        type: r.recommendation_type,
        kind: r.recommendation_kind,
        topic: r.topic,
        from: r.consultation?.contacts?.full_name
      }))
    ];

    const prompt = `Jesteś ekspertem w budowaniu szczegółowych profili kontaktów biznesowych. Tworzysz profil "agenta" - asystenta AI który będzie pomagał w relacji z tym kontaktem.

## PEŁNE DANE KONTAKTU

### Podstawowe informacje
- Imię i nazwisko: ${contact.full_name}
- Stanowisko: ${contact.position || 'nieznane'}
- Email: ${contact.email || 'brak'}
- Telefon: ${contact.phone || 'brak'}
- Miasto: ${contact.city || 'nieznane'}
- LinkedIn: ${contact.linkedin_url || 'brak'}
- Źródło kontaktu: ${contact.source || 'nieznane'}
- Tagi: ${contact.tags?.join(', ') || 'brak'}
- Siła relacji: ${contact.relationship_strength}/10
- Ostatni kontakt: ${contact.last_contact_date || 'nieznany'}

### Notatki o kontakcie
${contact.notes || 'Brak notatek'}

### AI Profile Summary (wcześniejsza analiza)
${contact.profile_summary || 'Brak wcześniejszej analizy'}

### Firma
- Nazwa: ${contact.company?.name || contact.company || 'nieznana'}
- Branża: ${contact.company?.industry || 'nieznana'}
- Opis: ${contact.company?.description || 'brak'}
- Strona: ${contact.company?.website || 'brak'}
- Adres: ${contact.company?.address || 'brak'}, ${contact.company?.city || ''} ${contact.company?.postal_code || ''}
- Liczba pracowników: ${contact.company?.employee_count || 'nieznana'}

### AI Analiza Firmy
${contact.company?.ai_analysis || 'Brak analizy AI firmy'}

### Grupa kontaktu
- Nazwa grupy: ${contact.primary_group?.name || 'brak grupy'}
- Opis grupy: ${contact.primary_group?.description || 'brak'}

---

## POTRZEBY (${needs?.length || 0})
${(needs || []).map(n => `- [${n.status}] ${n.title}: ${n.description || ''} (priorytet: ${n.priority})`).join('\n') || 'Brak potrzeb'}

## OFERTY/KOMPETENCJE (${offers?.length || 0})
${(offers || []).map(o => `- [${o.status}] ${o.title}: ${o.description || ''}`).join('\n') || 'Brak ofert'}

---

## TIMELINE HISTORII KONTAKTU (chronologicznie, ${timeline.length} zdarzeń)
${timeline.slice(0, 30).map(t => `[${t.date}] ${t.type.toUpperCase()}: ${t.description}\n${t.details || ''}`).join('\n\n') || 'Brak historii'}

---

## KORZYŚCI BIZNESOWE (consultation_thanks) - ${thanksSummary.length}
${thanksSummary.map(t => `- ${t.type}: ${t.amount || 'bez kwoty'} (${t.date})`).join('\n') || 'Brak korzyści biznesowych'}

## REKOMENDACJE (dane i otrzymane) - ${recommendationsSummary.length}
${recommendationsSummary.map((r: any) => 
  r.direction === 'given' 
    ? `- DANO: ${r.type} (${r.kind}) do ${r.to || r.company || 'nieznany'} - temat: ${r.topic || 'brak'}`
    : `- OTRZYMANO: ${r.type} (${r.kind}) od ${r.from || 'nieznany'} - temat: ${r.topic || 'brak'}`
).join('\n') || 'Brak rekomendacji'}

---

## POWIĄZANIA W SIECI (${connections?.length || 0})
${connectionsSummary.map(c => `- ${c.name} (${c.position || ''} @ ${c.company || 'brak firmy'}) - typ: ${c.type}, siła: ${c.strength}/10`).join('\n') || 'Brak powiązań'}

## ZADANIA POWIĄZANE (${taskContacts?.length || 0})
${(taskContacts || []).map((tc: any) => `- [${tc.tasks?.status || 'nieznany'}] ${tc.tasks?.title || 'Bez tytułu'} (rola: ${tc.role}, priorytet: ${tc.tasks?.priority})\n  ${tc.tasks?.description?.substring(0, 150) || ''}`).join('\n') || 'Brak zadań'}

## DANE Z ANKIET KONSULTACYJNYCH
${questionnaires.map(q => `
- Zaangażowanie w grupę: ${q.group_engagement_rating}/10
- Cele biznesowe wymagające wsparcia: ${q.business_goals_needing_support || 'brak'}
- Szukani partnerzy strategiczni: ${q.strategic_partners_sought || 'brak'}
- Wartościowe tematy edukacyjne: ${q.valuable_education_topics || 'brak'}
- Wartość dla społeczności: ${q.value_for_community || 'brak'}
- Ekspertyza do wniesienia: ${q.expertise_contribution || 'brak'}
`).join('\n') || 'Brak danych z ankiet'}

---

## DANE Z WYWIADU BI (strukturalne) - kompletność: ${biData?.completeness_score ? (biData.completeness_score * 100).toFixed(0) + '%' : 'nie przeprowadzony'}
${biData?.bi_profile ? `
### Sekcja 1 - Dane podstawowe
${JSON.stringify(biData.bi_profile.section_1_basic_info || {}, null, 2)}

### Sekcja 2 - Metryki biznesowe  
${JSON.stringify(biData.bi_profile.section_2_business_metrics || {}, null, 2)}

### Sekcja 3 - Priorytety i wyzwania
${JSON.stringify(biData.bi_profile.section_3_priorities_challenges || {}, null, 2)}

### Sekcja 4 - Inwestycje
${JSON.stringify(biData.bi_profile.section_4_investments || {}, null, 2)}

### Sekcja 5 - Relacje CC
${JSON.stringify(biData.bi_profile.section_5_cc_relations || {}, null, 2)}

### Sekcja 6 - Dane prywatne
${JSON.stringify(biData.bi_profile.section_6_personal || {}, null, 2)}
` : 'Brak - BI nie przeprowadzony. Rozważ przeprowadzenie wywiadu BI dla pełnego obrazu klienta.'}

---

## ZADANIE

Na podstawie WSZYSTKICH powyższych danych wygeneruj szczegółowy profil agenta AI dla tego kontaktu.

**Zwróć JSON w formacie:**
\`\`\`json
{
  "agent_persona": "Szczegółowy opis jak AI powinno 'myśleć' o tej osobie - jej styl, preferencje, motywacje, co jest dla niej ważne, jak podchodzić do rozmów (3-5 zdań)",
  "agent_profile": {
    "pain_points": ["lista konkretnych problemów/wyzwań tej osoby - na podstawie danych"],
    "interests": ["zainteresowania biznesowe i osobiste - wywnioskowane z danych"],
    "goals": ["cele biznesowe - z ankiet, potrzeb, rozmów"],
    "communication_style": "szczegółowy opis jak preferuje komunikację - na podstawie historii",
    "decision_making": "jak podejmuje decyzje - wnioski z historii spotkań",
    "key_topics": ["tematy do poruszenia przy następnym spotkaniu - konkretne, z kontekstu"],
    "relationship_dynamics": "analiza jak budować i rozwijać relację z tą osobą",
    "business_value": "wartość biznesowa tej relacji - kwoty, rekomendacje, potencjał"
  },
  "insights": [
    {
      "text": "Konkretny insight/wniosek wyciągnięty z danych",
      "source": "skąd pochodzi (konsultacje/ankiety/potrzeby/rekomendacje/etc)",
      "importance": "high/medium/low"
    }
  ],
  "timeline_summary": "Podsumowanie kluczowych momentów w historii relacji (2-3 zdania)",
  "next_steps": ["konkretne rekomendowane następne kroki w relacji"],
  "warnings": ["rzeczy na które trzeba uważać, ryzyka w relacji"]
}
\`\`\`

Bądź BARDZO konkretny i praktyczny. Wyciągaj wnioski z danych, nie wymyślaj. Jeśli brakuje danych w jakimś obszarze, zaznacz to.`;

    console.log('Calling AI Gateway to generate extended agent profile...');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', errorText);
      return new Response(
        JSON.stringify({ error: 'AI service error', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';

    console.log('AI Response received, parsing...');

    // Extract JSON from response
    let agentData;
    try {
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                        aiContent.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiContent;
      agentData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      agentData = {
        agent_persona: `${contact.full_name} - kontakt biznesowy wymagający uzupełnienia danych`,
        agent_profile: {
          pain_points: [],
          interests: [],
          goals: [],
          communication_style: 'Do ustalenia',
          decision_making: 'Do ustalenia',
          key_topics: [],
          relationship_dynamics: 'Do analizy',
          business_value: 'Do oceny'
        },
        insights: [{
          text: 'Agent wymaga więcej danych do pełnej analizy',
          source: 'system',
          importance: 'high'
        }],
        timeline_summary: 'Brak wystarczających danych do podsumowania',
        next_steps: ['Uzupełnij dane kontaktu'],
        warnings: []
      };
    }

    // Upsert to contact_agent_memory with extended data sources
    const { data: savedAgent, error: saveError } = await supabase
      .from('contact_agent_memory')
      .upsert({
        tenant_id: contact.tenant_id,
        contact_id: contact_id,
        agent_persona: agentData.agent_persona,
        agent_profile: {
          ...agentData.agent_profile,
          timeline_summary: agentData.timeline_summary,
          next_steps: agentData.next_steps,
          warnings: agentData.warnings
        },
        insights: agentData.insights || [],
        last_refresh_at: new Date().toISOString(),
        refresh_sources: {
          initialized_at: new Date().toISOString(),
          data_sources: [
            'contacts', 
            'companies', 
            'company_ai_analysis',
            'profile_summary',
            'contact_groups',
            'consultations', 
            'consultation_meetings',
            'consultation_recommendations',
            'consultation_thanks',
            'consultation_questionnaire',
            'needs', 
            'offers', 
            'tasks', 
            'connections',
            'bi_data'
          ],
          timeline_events: timeline.length,
          consultations_count: consultations?.length || 0,
          meetings_count: consultationMeetings?.length || 0,
          recommendations_count: recommendationsSummary.length,
          thanks_count: thanksSummary.length,
          bi_data_completeness: biData?.completeness_score || 0,
          bi_status: biData?.bi_status || 'not_started'
        },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'contact_id'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Save error:', saveError);
      return new Response(
        JSON.stringify({ error: 'Failed to save agent', details: saveError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Contact Agent initialized successfully with extended data');

    return new Response(
      JSON.stringify({
        success: true,
        agent: savedAgent,
        next_steps: agentData.next_steps,
        warnings: agentData.warnings,
        data_summary: {
          timeline_events: timeline.length,
          consultations: consultations?.length || 0,
          meetings: consultationMeetings?.length || 0,
          recommendations: recommendationsSummary.length,
          business_benefits: thanksSummary.length,
          needs: needs?.length || 0,
          offers: offers?.length || 0,
          connections: connections?.length || 0,
          tasks: taskContacts?.length || 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
