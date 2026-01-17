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
    const { contact_id, question, session_id, conversation_history } = await req.json();

    if (!contact_id || !question) {
      return new Response(
        JSON.stringify({ error: 'contact_id and question are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch agent memory
    const { data: agentMemory, error: agentError } = await supabase
      .from('contact_agent_memory')
      .select('*')
      .eq('contact_id', contact_id)
      .single();

    if (agentError || !agentMemory) {
      return new Response(
        JSON.stringify({ 
          error: 'Agent not initialized for this contact',
          suggestion: 'Call initialize-contact-agent first'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch fresh contact data
    const { data: contact } = await supabase
      .from('contacts')
      .select(`
        *,
        company:companies(*),
        primary_group:contact_groups(*)
      `)
      .eq('id', contact_id)
      .single();

    // Fetch recent consultations with more details
    const { data: consultations } = await supabase
      .from('consultations')
      .select('*')
      .eq('contact_id', contact_id)
      .order('scheduled_at', { ascending: false })
      .limit(10);

    // Fetch recent consultation meetings
    const { data: recentMeetings } = await supabase
      .from('consultation_meetings')
      .select('*')
      .eq('contact_id', contact_id)
      .order('meeting_date', { ascending: false })
      .limit(10);

    // Fetch needs and offers
    const { data: needs } = await supabase
      .from('needs')
      .select('*')
      .eq('contact_id', contact_id);

    const { data: offers } = await supabase
      .from('offers')
      .select('*')
      .eq('contact_id', contact_id);

    // Fetch tasks
    const { data: taskContacts } = await supabase
      .from('task_contacts')
      .select('task_id, role, tasks(*)')
      .eq('contact_id', contact_id);

    // Fetch BI data
    const { data: biData } = await supabase
      .from('contact_bi_data')
      .select('*')
      .eq('contact_id', contact_id)
      .maybeSingle();

    // Fetch previous conversation history from database if session_id provided
    let dbConversationHistory: Array<{role: string; content: string}> = [];
    if (session_id) {
      const { data: prevMessages } = await supabase
        .from('agent_conversations')
        .select('role, content')
        .eq('contact_id', contact_id)
        .eq('session_id', session_id)
        .order('created_at', { ascending: true })
        .limit(20);
      
      dbConversationHistory = prevMessages || [];
    }

    // Combine with provided conversation history
    const fullHistory = [
      ...dbConversationHistory,
      ...(conversation_history || [])
    ];

    const conversationContext = fullHistory.length > 0 
      ? fullHistory.map((m: any) => `${m.role === 'user' ? 'DIRECTOR' : 'AGENT'}: ${m.content}`).join('\n')
      : 'Brak wcześniejszej rozmowy w tej sesji.';

    const profile = agentMemory.agent_profile || {};

    const prompt = `Jesteś Contact Agent - osobistym asystentem AI dla kontaktu biznesowego. Prowadzisz konwersację z Dyrektorem (użytkownikiem) na temat tego kontaktu.

## TWOJA ROLA

Jesteś asystentem który:
- Zna wszystkie szczegóły o tym kontakcie
- Pomaga przygotować się do spotkań
- Sugeruje tematy do rozmów
- Może PROPONOWAĆ AKCJE do wykonania (które Director zatwierdzi)
- Pamięta kontekst rozmowy i uczy się z każdej interakcji

## TWOJE MOŻLIWOŚCI

Możesz zaproponować następujące akcje (Director musi je zatwierdzić):
- CREATE_TASK: Utwórz zadanie powiązane z tym kontaktem
- ADD_NOTE: Dodaj notatkę do kontaktu  
- UPDATE_PROFILE: Zaktualizuj dane kontaktu (np. stanowisko, telefon)
- ADD_INSIGHT: Zapisz nowy insight do swojej pamięci o tym kontakcie
- CREATE_NEED: Dodaj nową potrzebę klienta
- CREATE_OFFER: Dodaj nową ofertę/kompetencję klienta
- SCHEDULE_FOLLOWUP: Zaplanuj follow-up kontakt

---

## TWOJA WIEDZA O TYM KONTAKCIE

**Podstawowe dane:**
- Imię i nazwisko: ${contact?.full_name}
- Stanowisko: ${contact?.position || 'nieznane'}
- Firma: ${contact?.company?.name || contact?.company || 'nieznana'}
- Branża: ${contact?.company?.industry || 'nieznana'}
- Email: ${contact?.email || 'brak'}
- Telefon: ${contact?.phone || 'brak'}
- Miasto: ${contact?.city || 'nieznane'}
- Siła relacji: ${contact?.relationship_strength}/10
- Ostatni kontakt: ${contact?.last_contact_date || 'nieznany'}

**Notatki:**
${contact?.notes || 'Brak notatek'}

**AI Analiza firmy:**
${contact?.company?.ai_analysis || 'Brak analizy'}

**Twoja persona dla tego kontaktu:**
${agentMemory.agent_persona}

**Profil (szczegółowa wiedza):**
- Wyzwania: ${(profile.pain_points || []).join(', ') || 'nieznane'}
- Cele: ${(profile.goals || []).join(', ') || 'nieznane'}
- Zainteresowania: ${(profile.interests || []).join(', ') || 'nieznane'}
- Styl komunikacji: ${profile.communication_style || 'nieznany'}
- Podejmowanie decyzji: ${profile.decision_making || 'nieznane'}
- Kluczowe tematy: ${(profile.key_topics || []).join(', ') || 'brak'}
- Dynamika relacji: ${profile.relationship_dynamics || 'nieznana'}
- Wartość biznesowa: ${profile.business_value || 'nieoceniona'}
- Timeline: ${profile.timeline_summary || 'brak'}
- Następne kroki: ${(profile.next_steps || []).join(', ') || 'brak'}
- Ostrzeżenia: ${(profile.warnings || []).join(', ') || 'brak'}

**Zebrane insights:**
${(agentMemory.insights || []).map((i: any) => `- [${i.importance}] ${i.text} (źródło: ${i.source})`).join('\n') || 'Brak'}

---

## AKTUALNE DANE

**Potrzeby (${needs?.length || 0}):**
${(needs || []).map(n => `- [${n.status}] ${n.title}: ${n.description || ''} (priorytet: ${n.priority})`).join('\n') || 'Brak'}

**Oferty (${offers?.length || 0}):**
${(offers || []).map(o => `- [${o.status}] ${o.title}: ${o.description || ''}`).join('\n') || 'Brak'}

**Zadania (${taskContacts?.length || 0}):**
${(taskContacts || []).map((tc: any) => `- [${tc.tasks?.status}] ${tc.tasks?.title} (rola: ${tc.role}, termin: ${tc.tasks?.due_date || 'brak'})`).join('\n') || 'Brak'}

**Ostatnie konsultacje:**
${(consultations || []).slice(0, 5).map(c => `- ${c.scheduled_at}: ${c.status} | ${c.notes?.substring(0, 150) || 'brak notatek'}`).join('\n') || 'Brak'}

**Ostatnie spotkania:**
${(recentMeetings || []).slice(0, 5).map(m => `- ${m.meeting_date}: ${m.meeting_type} | ${m.comment || 'brak komentarza'} | Follow-up: ${m.follow_up || 'brak'}`).join('\n') || 'Brak'}

**Dane z wywiadu BI (${biData?.completeness_score ? (biData.completeness_score * 100).toFixed(0) + '% kompletne' : 'nie przeprowadzony'}):**
${biData?.bi_profile ? `
- Przychody ostatni rok: ${biData.bi_profile.section_2_business_metrics?.revenue_last_year ? biData.bi_profile.section_2_business_metrics.revenue_last_year.toLocaleString() + ' PLN' : 'nieznane'}
- Pracownicy: ${biData.bi_profile.section_2_business_metrics?.employees_count || 'nieznane'}
- EBITDA: ${biData.bi_profile.section_2_business_metrics?.ebitda_last_year ? biData.bi_profile.section_2_business_metrics.ebitda_last_year.toLocaleString() + ' PLN' : 'nieznane'}
- Top priorytety: ${(biData.bi_profile.section_3_priorities_challenges?.top_3_priorities || []).join(', ') || 'nieznane'}
- Największe wyzwanie: ${biData.bi_profile.section_3_priorities_challenges?.biggest_challenge || 'nieznane'}
- Strategia 2-3 lata: ${biData.bi_profile.section_3_priorities_challenges?.strategy_2_3_years || 'nieznana'}
- Planowane inwestycje: ${(biData.bi_profile.section_4_investments?.planned_investments || []).map((i: any) => i.type || i.description).join(', ') || 'brak'}
- Źródło kontaktu: ${biData.bi_profile.section_5_cc_relations?.source_of_contact?.person || 'nieznane'}
- Pasje: ${(biData.bi_profile.section_6_personal?.passions || []).join(', ') || 'nieznane'}
` : 'Brak danych BI - wywiad nie przeprowadzony'}

---

## KONTEKST ROZMOWY (poprzednie wiadomości w tej sesji)

${conversationContext}

---

## NOWA WIADOMOŚĆ OD DIRECTORA

"${question}"

---

## ZADANIE

Odpowiedz na wiadomość Directora wykorzystując swoją wiedzę o tym kontakcie.
Bądź konkretny, praktyczny i pomocny. Mów w pierwszej osobie jako asystent.
Jeśli Director wspomina o czymś ważnym do zapamiętania lub do zrobienia - zaproponuj odpowiednią akcję.

**Zwróć JSON:**
\`\`\`json
{
  "answer": "Twoja odpowiedź na wiadomość Directora - naturalna, konwersacyjna",
  "relevant_history": ["punkty z historii kontaktu relevantne do rozmowy"],
  "suggested_topics": ["tematy które warto poruszyć w kontekście rozmowy"],
  "warnings": ["ostrzeżenia lub rzeczy na które zwrócić uwagę"],
  "action_items": ["sugerowane działania do rozważenia"],
  "proposed_actions": [
    {
      "type": "CREATE_TASK | ADD_NOTE | UPDATE_PROFILE | ADD_INSIGHT | CREATE_NEED | CREATE_OFFER | SCHEDULE_FOLLOWUP",
      "data": {
        "title": "dla zadań",
        "description": "opis",
        "priority": "high/medium/low",
        "due_date": "YYYY-MM-DD",
        "field": "dla UPDATE_PROFILE - nazwa pola",
        "value": "dla UPDATE_PROFILE - nowa wartość",
        "text": "dla ADD_INSIGHT/ADD_NOTE",
        "importance": "dla ADD_INSIGHT - high/medium/low"
      },
      "reason": "dlaczego proponujesz tę akcję"
    }
  ],
  "memory_update": {
    "new_insights": [
      {
        "text": "nowy insight wyciągnięty z tej rozmowy",
        "source": "conversation",
        "importance": "high/medium/low"
      }
    ],
    "profile_updates": {
      "key_topics": ["zaktualizowane tematy jeśli pojawiły się nowe"],
      "other_field": "wartość jeśli trzeba zaktualizować"
    }
  }
}
\`\`\`

Jeśli nie ma nic do zaproponowania jako akcje lub memory_update, zwróć puste tablice/obiekty.
NIE proponuj akcji przy każdej wiadomości - tylko gdy to ma sens (np. Director prosi o utworzenie zadania, wspomina coś ważnego do zapamiętania, etc.)`;

    console.log('Querying Contact Agent with conversation context...');

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
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';

    // Parse response
    let response;
    try {
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                        aiContent.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiContent;
      response = JSON.parse(jsonStr);
    } catch (parseError) {
      response = {
        answer: aiContent,
        relevant_history: [],
        suggested_topics: [],
        warnings: [],
        action_items: [],
        proposed_actions: [],
        memory_update: { new_insights: [], profile_updates: {} }
      };
    }

    // Generate or use provided session_id
    const currentSessionId = session_id || crypto.randomUUID();

    // Save conversation to database
    try {
      // Save user message
      await supabase.from('agent_conversations').insert({
        tenant_id: agentMemory.tenant_id,
        contact_id: contact_id,
        session_id: currentSessionId,
        role: 'user',
        content: question,
        extracted_data: {}
      });

      // Save assistant response
      await supabase.from('agent_conversations').insert({
        tenant_id: agentMemory.tenant_id,
        contact_id: contact_id,
        session_id: currentSessionId,
        role: 'assistant',
        content: response.answer,
        extracted_data: {
          proposed_actions: response.proposed_actions || [],
          memory_update: response.memory_update || {}
        }
      });

      // If there are memory updates with new insights, update agent memory
      if (response.memory_update?.new_insights?.length > 0) {
        const currentInsights = agentMemory.insights || [];
        const newInsights = response.memory_update.new_insights.map((i: any) => ({
          ...i,
          added_at: new Date().toISOString()
        }));
        
        await supabase
          .from('contact_agent_memory')
          .update({
            insights: [...currentInsights, ...newInsights],
            updated_at: new Date().toISOString()
          })
          .eq('contact_id', contact_id);
      }
    } catch (saveError) {
      console.error('Error saving conversation:', saveError);
      // Continue even if save fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        session_id: currentSessionId,
        contact_name: contact?.full_name,
        ...response
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
