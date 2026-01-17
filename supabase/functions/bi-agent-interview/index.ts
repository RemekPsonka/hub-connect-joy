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

// All fields in order for sequential questioning
const ALL_FIELDS_ORDERED: { section: string; field: string; label: string }[] = [
  { section: 'section_1_basic_info', field: 'industry', label: 'Branża?' },
  { section: 'section_1_basic_info', field: 'company_main', label: 'Nazwa firmy?' },
  { section: 'section_1_basic_info', field: 'nip', label: 'NIP?' },
  { section: 'section_1_basic_info', field: 'website', label: 'Strona www?' },
  { section: 'section_1_basic_info', field: 'linkedin', label: 'LinkedIn?' },
  { section: 'section_1_basic_info', field: 'headquarters', label: 'Siedziba?' },
  { section: 'section_1_basic_info', field: 'founded_year', label: 'Rok założenia?' },
  { section: 'section_1_basic_info', field: 'assistant_name', label: 'Asystent - imię?' },
  { section: 'section_1_basic_info', field: 'assistant_email', label: 'Asystent - email?' },
  { section: 'section_1_basic_info', field: 'assistant_phone', label: 'Asystent - telefon?' },
  { section: 'section_2_business_metrics', field: 'employees_count', label: 'Ilu pracowników?' },
  { section: 'section_2_business_metrics', field: 'clients_current', label: 'Ilu klientów obecnie?' },
  { section: 'section_2_business_metrics', field: 'clients_plan_this_year', label: 'Plan klientów na rok?' },
  { section: 'section_2_business_metrics', field: 'revenue_last_year', label: 'Przychód 2024?' },
  { section: 'section_2_business_metrics', field: 'revenue_plan_this_year', label: 'Plan przychodu?' },
  { section: 'section_2_business_metrics', field: 'ebitda_last_year', label: 'EBITDA 2024?' },
  { section: 'section_2_business_metrics', field: 'main_activity', label: 'Główna działalność?' },
  { section: 'section_2_business_metrics', field: 'markets', label: 'Rynki?' },
  { section: 'section_2_business_metrics', field: 'top_products', label: 'Top produkty?' },
  { section: 'section_2_business_metrics', field: 'value_proposition', label: 'Propozycja wartości?' },
  { section: 'section_2_business_metrics', field: 'ownership_structure', label: 'Struktura własności?' },
  { section: 'section_3_priorities_challenges', field: 'top_3_priorities', label: 'Top 3 priorytety?' },
  { section: 'section_3_priorities_challenges', field: 'biggest_challenge', label: 'Największe wyzwanie?' },
  { section: 'section_3_priorities_challenges', field: 'biggest_achievement', label: 'Największy sukces?' },
  { section: 'section_3_priorities_challenges', field: 'top_3_clients', label: 'Top 3 klientów?' },
  { section: 'section_3_priorities_challenges', field: 'what_seeking', label: 'Czego szuka?' },
  { section: 'section_3_priorities_challenges', field: 'strategy_2_3_years', label: 'Strategia 2-3 lata?' },
  { section: 'section_4_investments', field: 'recent_investments', label: 'Ostatnie inwestycje?' },
  { section: 'section_4_investments', field: 'planned_investments', label: 'Planowane inwestycje?' },
  { section: 'section_5_cc_relations', field: 'source_of_contact', label: 'Skąd kontakt?' },
  { section: 'section_5_cc_relations', field: 'attended_cc_meetings', label: 'Uczestnictwo w CC?' },
  { section: 'section_5_cc_relations', field: 'wants_to_meet', label: 'Kogo chce poznać?' },
  { section: 'section_5_cc_relations', field: 'value_to_cc', label: 'Wartość dla CC?' },
  { section: 'section_6_personal', field: 'family', label: 'Rodzina?' },
  { section: 'section_6_personal', field: 'passions', label: 'Pasje?' },
  { section: 'section_6_personal', field: 'personal_goals_2_3_years', label: 'Cele osobiste?' },
  { section: 'section_6_personal', field: 'life_principles', label: 'Zasady życiowe?' },
];

// Find next empty field
function findNextEmptyField(biProfile: any, currentFieldIndex: number = -1): { section: string; field: string; label: string; index: number } | null {
  for (let i = currentFieldIndex + 1; i < ALL_FIELDS_ORDERED.length; i++) {
    const fieldInfo = ALL_FIELDS_ORDERED[i];
    const sectionData = biProfile[fieldInfo.section] || {};
    const value = sectionData[fieldInfo.field];
    if (value === null || value === undefined || value === '') {
      return { ...fieldInfo, index: i };
    }
  }
  return null;
}

// Find current field index based on last asked question
function findCurrentFieldIndex(conversationLog: any[]): number {
  if (!conversationLog || conversationLog.length === 0) return -1;
  
  // Find last agent message with question_field
  for (let i = conversationLog.length - 1; i >= 0; i--) {
    const msg = conversationLog[i];
    if (msg.speaker === 'agent' && msg.question_field) {
      const idx = ALL_FIELDS_ORDERED.findIndex(f => f.field === msg.question_field);
      if (idx >= 0) return idx;
    }
  }
  return -1;
}

// Calculate completeness score - liczymy TYLKO pola z ALL_FIELDS_ORDERED (te o które pytamy w wywiadzie)
function calculateCompleteness(biProfile: any): number {
  if (!biProfile) return 0;
  
  let filledCount = 0;
  
  for (const fieldInfo of ALL_FIELDS_ORDERED) {
    const sectionData = biProfile[fieldInfo.section] || {};
    const value = sectionData[fieldInfo.field];
    if (value !== null && value !== undefined && value !== '') {
      filledCount++;
    }
  }
  
  return Math.min(1, filledCount / ALL_FIELDS_ORDERED.length);
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

    // 5. Pre-AI detection of signals - immediate handling without AI call
    const endSignals = ['koniec', 'kończymy', 'wystarczy', 'na razie tyle', 'stop', 'przerwij', 'później', 'przerywam', 'zakończ', 'to tyle', 'dosyć', 'starczy'];
    const skipSignals = ['dalej', 'pomiń', 'następne', 'skip', 'next', '-', '.', 'nie wiem', 'brak', 'n/a', 'nd'];
    
    const msgLower = userMessage.toLowerCase().trim();
    const isEndingRequest = userMessage !== 'START_INTERVIEW' && endSignals.some(signal => msgLower.includes(signal));
    const isSkipRequest = userMessage !== 'START_INTERVIEW' && skipSignals.some(signal => msgLower === signal);
    const isStartRequest = userMessage === 'START_INTERVIEW';

    // Get current field index from conversation
    const currentFieldIndex = findCurrentFieldIndex(session.conversation_log || []);

    if (isEndingRequest) {
      console.log('End signal detected, pausing interview immediately');
      
      const updatedConversationLog = [
        ...(session.conversation_log || []),
        { timestamp: new Date().toISOString(), speaker: 'user', message: userMessage },
        { timestamp: new Date().toISOString(), speaker: 'agent', message: 'OK, wstrzymano.' }
      ];
      
      await supabase
        .from('bi_interview_sessions')
        .update({
          status: 'paused',
          conversation_log: updatedConversationLog
        })
        .eq('id', session.id);

      return new Response(
        JSON.stringify({
          success: true,
          agent_message: 'OK, wstrzymano.',
          next_question: null,
          completeness: biData.completeness_score || 0,
          sections_completed: getCompletedSections(biData.bi_profile || {}),
          status: 'paused',
          session_id: session.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle skip request - move to next question without AI
    if (isSkipRequest) {
      console.log('Skip signal detected, moving to next question');
      
      const nextField = findNextEmptyField(biData.bi_profile || {}, currentFieldIndex);
      
      if (!nextField) {
        // All fields completed
        const updatedConversationLog = [
          ...(session.conversation_log || []),
          { timestamp: new Date().toISOString(), speaker: 'user', message: userMessage },
          { timestamp: new Date().toISOString(), speaker: 'agent', message: 'Wszystkie pola zebrane.' }
        ];
        
        await supabase
          .from('bi_interview_sessions')
          .update({
            status: 'completed',
            conversation_log: updatedConversationLog,
            completed_at: new Date().toISOString()
          })
          .eq('id', session.id);
        
        return new Response(
          JSON.stringify({
            success: true,
            agent_message: 'Wszystkie pola zebrane.',
            next_question: null,
            completeness: 1,
            sections_completed: getCompletedSections(biData.bi_profile || {}),
            status: 'completed',
            session_id: session.id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const updatedConversationLog = [
        ...(session.conversation_log || []),
        { timestamp: new Date().toISOString(), speaker: 'user', message: userMessage },
        { timestamp: new Date().toISOString(), speaker: 'agent', message: nextField.label, question_field: nextField.field }
      ];
      
      await supabase
        .from('bi_interview_sessions')
        .update({
          conversation_log: updatedConversationLog,
          questions_asked: (session.questions_asked || 0) + 1
        })
        .eq('id', session.id);
      
      return new Response(
        JSON.stringify({
          success: true,
          agent_message: nextField.label,
          next_question: { section: nextField.section, field: nextField.field },
          completeness: biData.completeness_score || 0,
          sections_completed: getCompletedSections(biData.bi_profile || {}),
          status: 'in_progress',
          session_id: session.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle start request - first question without AI
    if (isStartRequest) {
      console.log('Start interview, asking first question');
      
      const nextField = findNextEmptyField(biData.bi_profile || {}, -1);
      
      if (!nextField) {
        return new Response(
          JSON.stringify({
            success: true,
            agent_message: 'Wszystkie pola już wypełnione.',
            next_question: null,
            completeness: 1,
            sections_completed: getCompletedSections(biData.bi_profile || {}),
            status: 'completed',
            session_id: session.id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const updatedConversationLog = [
        ...(session.conversation_log || []),
        { timestamp: new Date().toISOString(), speaker: 'user', message: 'START' },
        { timestamp: new Date().toISOString(), speaker: 'agent', message: nextField.label, question_field: nextField.field }
      ];
      
      await supabase
        .from('bi_interview_sessions')
        .update({
          conversation_log: updatedConversationLog,
          questions_asked: 1
        })
        .eq('id', session.id);
      
      return new Response(
        JSON.stringify({
          success: true,
          agent_message: nextField.label,
          next_question: { section: nextField.section, field: nextField.field },
          completeness: biData.completeness_score || 0,
          sections_completed: getCompletedSections(biData.bi_profile || {}),
          status: 'in_progress',
          session_id: session.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. AI is only used for data extraction now (not for question generation)
    // Find current field from last agent message
    const lastAgentMsg = (session.conversation_log || []).slice().reverse().find((m: any) => m.speaker === 'agent' && m.question_field);
    const currentField = lastAgentMsg?.question_field;
    const currentSection = ALL_FIELDS_ORDERED.find(f => f.field === currentField)?.section;

    // Build extraction prompt with formatting instructions
    const extractionPrompt = `
Wyciągnij i SFORMATUJ dane z odpowiedzi dyrektora.

POLE: ${currentField || 'unknown'}
ODPOWIEDŹ DYREKTORA: "${userMessage}"

ZASADY FORMATOWANIA:
- Pisz poprawną polszczyzną, pełnymi zdaniami
- Listy: "1) ..., 2) ..., 3) ..."
- Liczby: "1500 pracowników", "350 mln PLN"
- Nazwy własne z dużej litery
- Popraw literówki i rozwiń skróty myślowe
- Zachowaj sens, popraw styl

PRZYKŁADY:
"it 50 osób" → "Branża IT, 50 pracowników"
"przygotować nato kupić robota" → "1) Przygotowanie do zadań NATO, 2) Zakup robota chirurgicznego"
"szpital wojskowy flanka" → "Szpital wojskowy z nadzorem nad flanką wschodnią NATO"
"-" lub "nie dotyczy" → null

Zwróć TYLKO JSON:
{
  "value": "sformatowana wartość lub null",
  "extracted": true/false
}
`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calling AI for data extraction...');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'user', content: extractionPrompt }
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

    // Parse AI extraction response
    let extractedValue: any = null;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.extracted && parsed.value !== null && parsed.value !== '') {
          extractedValue = parsed.value;
        }
      }
    } catch (parseError) {
      console.log('Failed to parse extraction, using raw value');
      // Use raw message as value if parsing fails
      extractedValue = userMessage;
    }

    // Find next empty field
    const nextField = findNextEmptyField(biData.bi_profile || {}, currentFieldIndex);

    // 7. Update BI profile with extracted data
    const updatedBiProfile = { ...(biData.bi_profile || {}) };
    
    if (extractedValue !== null && currentSection && currentField) {
      if (!updatedBiProfile[currentSection]) {
        updatedBiProfile[currentSection] = {};
      }
      
      const oldValue = updatedBiProfile[currentSection]?.[currentField];
      updatedBiProfile[currentSection][currentField] = extractedValue;
      
      // Log change to history
      if (oldValue !== extractedValue) {
        await supabase
          .from('contact_bi_history')
          .insert({
            contact_bi_id: biData.id,
            field_path: `${currentSection}.${currentField}`,
            old_value: oldValue !== undefined ? JSON.stringify(oldValue) : null,
            new_value: JSON.stringify(extractedValue),
            change_reason: 'bi_interview'
          });
      }
    }

    // Calculate new completeness
    const newCompleteness = calculateCompleteness(updatedBiProfile);
    const newCompletedSections = getCompletedSections(updatedBiProfile);
    
    // Determine status and next message
    const isCompleted = !nextField;
    const newStatus = isCompleted ? 'completed' : 'in_progress';
    const nextMessage = isCompleted ? 'Wszystkie pola zebrane.' : nextField.label;

    // Update BI data
    await supabase
      .from('contact_bi_data')
      .update({
        bi_profile: updatedBiProfile,
        completeness_score: newCompleteness,
        last_bi_update: new Date().toISOString(),
        bi_status: isCompleted ? 'complete' : 'in_progress',
        next_review_date: isCompleted 
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
        message: nextMessage,
        question_field: nextField?.field || null
      }
    ];

    await supabase
      .from('bi_interview_sessions')
      .update({
        questions_asked: (session.questions_asked || 0) + 1,
        questions_answered: (session.questions_answered || 0) + (extractedValue !== null ? 1 : 0),
        sections_completed: newCompletedSections,
        conversation_log: updatedConversationLog,
        status: newStatus,
        completed_at: isCompleted ? new Date().toISOString() : null
      })
      .eq('id', session.id);

    console.log(`BI Interview updated: completeness=${newCompleteness}, status=${newStatus}`);

    return new Response(
      JSON.stringify({
        success: true,
        agent_message: nextMessage,
        next_question: nextField ? { section: nextField.section, field: nextField.field } : null,
        completeness: newCompleteness,
        sections_completed: newCompletedSections,
        status: newStatus,
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
