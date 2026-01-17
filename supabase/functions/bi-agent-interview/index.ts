import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// BI Interview Framework - 6 sekcji
const BI_FRAMEWORK = {
  section_1_basic_info: {
    name: 'Podstawowe informacje',
    fields: ['full_name', 'company_main', 'industry', 'nip', 'website', 'linkedin', 
             'assistant_name', 'assistant_email', 'assistant_phone', 
             'headquarters', 'residence', 'founded_year', 'company_age_years']
  },
  section_2_business_metrics: {
    name: 'Metryki biznesowe',
    fields: ['employees_count', 'clients_current', 'clients_plan_this_year',
             'revenue_last_year', 'revenue_plan_this_year', 
             'ebitda_last_year', 'ebitda_plan_this_year', 'ebitda_yoy_change_percent',
             'other_kpis', 'main_activity', 'markets', 'top_products',
             'value_proposition', 'formal_role', 'ownership_structure',
             'total_business_scale', 'other_businesses']
  },
  section_3_priorities_challenges: {
    name: 'Priorytety i wyzwania',
    fields: ['top_3_priorities', 'biggest_challenge', 'biggest_achievement',
             'proudest_products', 'top_3_clients', 'client_profile',
             'what_seeking', 'strategy_2_3_years', 'consults_decisions_with',
             'economic_situation_impact']
  },
  section_4_investments: {
    name: 'Inwestycje',
    fields: ['recent_investments', 'planned_investments']
  },
  section_5_cc_relations: {
    name: 'Relacje CC',
    fields: ['source_of_contact', 'attended_cc_meetings', 'wants_to_meet',
             'currently_cooperates_with', 'value_to_cc', 'engagement_in_cc']
  },
  section_6_personal: {
    name: 'Prywatne',
    fields: ['family', 'work_life_balance', 'personal_goals_2_3_years',
             'succession_plan', 'passions', 'life_principles', 
             'philanthropy', 'other_memberships']
  }
};

// Calculate completeness score
function calculateCompleteness(biProfile: any): number {
  const allFields: string[] = [];
  Object.values(BI_FRAMEWORK).forEach((section: any) => {
    section.fields.forEach((field: string) => allFields.push(field));
  });
  
  let filledCount = 0;
  Object.keys(BI_FRAMEWORK).forEach(sectionKey => {
    const sectionData = biProfile[sectionKey] || {};
    Object.keys(sectionData).forEach(key => {
      if (sectionData[key] !== null && sectionData[key] !== undefined && sectionData[key] !== '') {
        filledCount++;
      }
    });
  });
  
  return Math.min(1, filledCount / allFields.length);
}

// Check which sections are complete
function getCompletedSections(biProfile: any): string[] {
  const completed: string[] = [];
  
  Object.entries(BI_FRAMEWORK).forEach(([sectionKey, section]: [string, any]) => {
    const sectionData = biProfile[sectionKey] || {};
    const filledFields = Object.keys(sectionData).filter(k => 
      sectionData[k] !== null && sectionData[k] !== undefined && sectionData[k] !== ''
    );
    // Consider section complete if at least 60% of fields are filled
    if (filledFields.length >= section.fields.length * 0.6) {
      completed.push(sectionKey);
    }
  });
  
  return completed;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contactId, sessionId, userMessage, tenantId } = await req.json();
    
    if (!contactId || !userMessage) {
      return new Response(
        JSON.stringify({ error: 'Missing contactId or userMessage' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`BI Interview: contactId=${contactId}, message=${userMessage.substring(0, 50)}...`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Get contact data
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*, companies(*)')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      console.error('Contact not found:', contactError);
      return new Response(
        JSON.stringify({ error: 'Contact not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const effectiveTenantId = tenantId || contact.tenant_id;

    // 2. Get or create BI data
    let { data: biData, error: biError } = await supabase
      .from('contact_bi_data')
      .select('*')
      .eq('contact_id', contactId)
      .single();

    if (biError && biError.code === 'PGRST116') {
      // Create new BI data
      const { data: newBiData, error: createError } = await supabase
        .from('contact_bi_data')
        .insert({
          contact_id: contactId,
          tenant_id: effectiveTenantId,
          bi_profile: {},
          bi_status: 'incomplete',
          completeness_score: 0.0
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating BI data:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create BI data' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      biData = newBiData;
    }

    // 3. Get or create session
    let session: any = null;
    
    if (sessionId) {
      const { data: existingSession } = await supabase
        .from('bi_interview_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      session = existingSession;
    }

    if (!session) {
      const { data: newSession, error: sessionError } = await supabase
        .from('bi_interview_sessions')
        .insert({
          contact_bi_id: biData.id,
          session_type: biData.bi_status === 'incomplete' ? 'initial' : 'update',
          status: 'in_progress',
          conversation_log: []
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Error creating session:', sessionError);
        return new Response(
          JSON.stringify({ error: 'Failed to create session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      session = newSession;
    }

    // 4. Get company data if available
    const companyInfo = contact.companies ? {
      name: contact.companies.name,
      industry: contact.companies.industry,
      nip: contact.companies.nip,
      website: contact.companies.website,
      description: contact.companies.description,
      employee_count: contact.companies.employee_count
    } : null;

    // 5. Build BI Agent prompt
    const completedSections = getCompletedSections(biData.bi_profile || {});
    const recentConversation = (session.conversation_log || []).slice(-10);

    const biAgentPrompt = `
Jesteś BI Agentem (Business Intelligence) przeprowadzającym strukturalny wywiad biznesowy dla kontaktu.

## KONTAKT
- **Imię i nazwisko:** ${contact.full_name}
- **Firma:** ${contact.company || 'nieznana'}
- **Stanowisko:** ${contact.position || 'nieznane'}
- **Email:** ${contact.email || 'brak'}
- **Telefon:** ${contact.phone || 'brak'}
- **Notatki:** ${contact.notes || 'brak'}

${companyInfo ? `
## DANE FIRMY (z systemu)
${JSON.stringify(companyInfo, null, 2)}
` : ''}

## OBECNY STAN DANYCH BI

**Completeness:** ${((biData.completeness_score || 0) * 100).toFixed(0)}%
**Status:** ${biData.bi_status}
**Sekcje kompletne:** ${completedSections.length > 0 ? completedSections.join(', ') : 'żadna'}

**Obecne dane BI:**
${JSON.stringify(biData.bi_profile || {}, null, 2)}

## HISTORIA KONWERSACJI (ostatnie wiadomości)
${recentConversation.map((msg: any) => `${msg.speaker === 'user' ? 'Użytkownik' : 'Agent'}: ${msg.message}`).join('\n') || 'Brak historii - to początek wywiadu'}

---

## FRAMEWORK WYWIADU (6 SEKCJI)

### Sekcja 1: Podstawowe informacje (section_1_basic_info)
Pola: full_name, company_main, industry, nip, website, linkedin, assistant_name, assistant_email, assistant_phone, headquarters, residence, founded_year, company_age_years

### Sekcja 2: Metryki biznesowe (section_2_business_metrics)
Pola: employees_count, clients_current, clients_plan_this_year, revenue_last_year, revenue_plan_this_year, ebitda_last_year, ebitda_plan_this_year, ebitda_yoy_change_percent, other_kpis (retention_rate, nps_score, avg_deal_size), main_activity, markets[], top_products[], value_proposition, formal_role, ownership_structure (user_shares_percent, has_partners, partners[]), total_business_scale, other_businesses[]

### Sekcja 3: Priorytety i wyzwania (section_3_priorities_challenges)
Pola: top_3_priorities[], biggest_challenge, biggest_achievement, proudest_products[], top_3_clients[], client_profile, what_seeking[], strategy_2_3_years, consults_decisions_with[], economic_situation_impact (opportunities[], threats[])

### Sekcja 4: Inwestycje (section_4_investments)
Pola: recent_investments[] (type, description, date, rationale, cost), planned_investments[] (type, description, timeline, budget, needs[])

### Sekcja 5: Relacje CC (section_5_cc_relations)
Pola: source_of_contact (person, relation), attended_cc_meetings[], wants_to_meet[], currently_cooperates_with[], value_to_cc (contacts[], knowledge[], resources[]), engagement_in_cc[]

### Sekcja 6: Prywatne (section_6_personal)
Pola: family (marital_status, spouse_name, children, children_ages[]), work_life_balance, personal_goals_2_3_years[], succession_plan (exists, notes), passions[], life_principles[], philanthropy (supports, organizations[]), other_memberships[]

---

## OSTATNIA WIADOMOŚĆ OD UŻYTKOWNIKA

"${userMessage}"

---

## TWOJE ZADANIE

${userMessage === 'START_INTERVIEW' ? `
To jest POCZĄTEK WYWIADU. Przywitaj się ciepło, przedstaw cel wywiadu (zebranie kompleksowych informacji biznesowych) i zadaj pierwsze pytanie z sekcji 1 (podstawowe informacje). Zacznij od potwierdzenia danych które już mamy.
` : `
1. **Analiza wiadomości:**
   - Wyciągnij wszystkie fakty z odpowiedzi
   - Dopasuj je do odpowiednich pól w schemacie BI
   
2. **Następne pytanie:**
   - Jeśli sekcja niekompletna → kontynuuj tę sekcję
   - Jeśli sekcja kompletna → przejdź do następnej
   - Jeśli wszystko kompletne → zaproponuj zakończenie
`}

**STYL KONWERSACJI:**
- Naturalny, profesjonalny ale ciepły ton
- Zadawaj 1-2 pytania na raz (nie więcej!)
- Używaj kontekstu z poprzednich odpowiedzi
- Dziękuj za odpowiedzi przed kolejnym pytaniem
- Jeśli użytkownik mówi "nie wiem" → zapisz null, nie naciskaj
- Jeśli odpowiedź niejednoznaczna → dopytaj elegancko

**WAŻNE:** 
- NIE wymyślaj danych - tylko to co użytkownik podał
- Jeśli użytkownik chce przerwać ("później", "koniec") → status="paused"

---

## OUTPUT FORMAT (zwróć TYLKO valid JSON, bez markdown code blocks)

{
  "extracted_data": {
    "section_2_business_metrics": {
      "employees_count": 50,
      "revenue_last_year": 15000000
    }
  },
  
  "agent_message": "Dziękuję za informację! Rozumiem, że macie 50 pracowników. A jakie są planowane przychody na ten rok?",
  
  "next_question": {
    "section": "section_2_business_metrics",
    "field": "revenue_plan_this_year"
  },
  
  "session_update": {
    "questions_asked": 5,
    "questions_answered": 4,
    "sections_completed": ["section_1_basic_info"]
  },
  
  "status": "in_progress"
}

Możliwe statusy: "in_progress", "paused", "completed"
`;

    // 6. Call AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calling AI for BI interview...');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: biAgentPrompt }
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
    const rawContent = aiData.choices?.[0]?.message?.content || '';
    
    console.log('AI response received, parsing...');

    // Parse AI response
    let agentResponse: any;
    try {
      // Try to extract JSON from response
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        agentResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.log('Raw content:', rawContent.substring(0, 500));
      
      // Fallback response
      agentResponse = {
        extracted_data: {},
        agent_message: rawContent || 'Przepraszam, wystąpił problem. Czy możesz powtórzyć?',
        next_question: null,
        session_update: {
          questions_asked: session.questions_asked || 0,
          questions_answered: session.questions_answered || 0,
          sections_completed: session.sections_completed || []
        },
        status: 'in_progress'
      };
    }

    // 7. Update BI profile with extracted data
    const updatedBiProfile = { ...(biData.bi_profile || {}) };
    const extractedData = agentResponse.extracted_data || {};
    
    for (const [sectionKey, sectionData] of Object.entries(extractedData)) {
      if (typeof sectionData === 'object' && sectionData !== null) {
        if (!updatedBiProfile[sectionKey]) {
          updatedBiProfile[sectionKey] = {};
        }
        
        for (const [fieldKey, value] of Object.entries(sectionData as object)) {
          const oldValue = updatedBiProfile[sectionKey]?.[fieldKey];
          updatedBiProfile[sectionKey][fieldKey] = value;
          
          // Log change to history
          if (oldValue !== value) {
            await supabase
              .from('contact_bi_history')
              .insert({
                contact_bi_id: biData.id,
                field_path: `${sectionKey}.${fieldKey}`,
                old_value: oldValue !== undefined ? JSON.stringify(oldValue) : null,
                new_value: JSON.stringify(value),
                change_reason: 'bi_interview'
              });
          }
        }
      }
    }

    // Calculate new completeness
    const newCompleteness = calculateCompleteness(updatedBiProfile);
    const newCompletedSections = getCompletedSections(updatedBiProfile);
    const newStatus = agentResponse.status === 'completed' ? 'complete' : 
                      agentResponse.status === 'paused' ? 'in_progress' : 'in_progress';

    // Update BI data
    await supabase
      .from('contact_bi_data')
      .update({
        bi_profile: updatedBiProfile,
        completeness_score: newCompleteness,
        last_bi_update: new Date().toISOString(),
        bi_status: newStatus,
        next_review_date: agentResponse.status === 'completed' 
          ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() 
          : null
      })
      .eq('id', biData.id);

    // 8. Update session
    const updatedConversationLog = [
      ...(session.conversation_log || []),
      {
        timestamp: new Date().toISOString(),
        speaker: 'user',
        message: userMessage
      },
      {
        timestamp: new Date().toISOString(),
        speaker: 'agent',
        message: agentResponse.agent_message,
        question_field: agentResponse.next_question?.field
      }
    ];

    await supabase
      .from('bi_interview_sessions')
      .update({
        questions_asked: (agentResponse.session_update?.questions_asked || session.questions_asked || 0) + 1,
        questions_answered: agentResponse.session_update?.questions_answered || session.questions_answered || 0,
        sections_completed: newCompletedSections,
        conversation_log: updatedConversationLog,
        status: agentResponse.status,
        completed_at: agentResponse.status === 'completed' ? new Date().toISOString() : null
      })
      .eq('id', session.id);

    console.log(`BI Interview updated: completeness=${newCompleteness}, status=${agentResponse.status}`);

    return new Response(
      JSON.stringify({
        success: true,
        agent_message: agentResponse.agent_message,
        next_question: agentResponse.next_question,
        completeness: newCompleteness,
        sections_completed: newCompletedSections,
        status: agentResponse.status,
        session_id: session.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('BI Interview error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
