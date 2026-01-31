import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessInterviewId } = await req.json();
    
    if (!businessInterviewId) {
      throw new Error('businessInterviewId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch Business Interview with contact
    const { data: bi, error: biError } = await supabase
      .from('business_interviews')
      .select('*, contacts(*)')
      .eq('id', businessInterviewId)
      .single();

    if (biError || !bi) {
      throw new Error(`Business Interview not found: ${biError?.message}`);
    }

    const contact = bi.contacts;
    const tenantId = bi.tenant_id;

    // 2. Fetch company if contact has one
    let company = null;
    if (contact?.company_id) {
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', contact.company_id)
        .single();
      company = companyData;
    }

    // 3. Fetch other contacts for matching recommendations
    const { data: otherContacts } = await supabase
      .from('contacts')
      .select('id, full_name, company, position, profile_summary')
      .eq('tenant_id', tenantId)
      .neq('id', contact.id)
      .eq('is_active', true)
      .limit(50);

    // 4. Fetch needs and offers for matching
    const { data: allNeeds } = await supabase
      .from('needs')
      .select('id, title, description, contact_id, contacts(full_name, company)')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .limit(30);

    const { data: allOffers } = await supabase
      .from('offers')
      .select('id, title, description, contact_id, contacts(full_name, company)')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .limit(30);

    // 5. Build AI prompt
    const prompt = buildPrompt(bi, contact, company, otherContacts || [], allNeeds || [], allOffers || []);

    // 6. Call AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: getSystemPrompt() },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No AI response content');
    }

    // 7. Parse AI response
    const parsedResult = parseAIResponse(aiContent);

    // 8. Get current version count
    const { count: versionCount } = await supabase
      .from('bi_ai_outputs')
      .select('*', { count: 'exact', head: true })
      .eq('business_interview_id', businessInterviewId);

    const newVersion = (versionCount || 0) + 1;

    // 9. Save to bi_ai_outputs
    const { data: aiOutput, error: saveError } = await supabase
      .from('bi_ai_outputs')
      .insert({
        business_interview_id: businessInterviewId,
        tenant_id: tenantId,
        version: newVersion,
        processing_status: 'completed',
        missing_info: parsedResult.missing_info,
        needs_offers: parsedResult.needs_offers,
        task_proposals: parsedResult.task_proposals,
        connection_recommendations: parsedResult.connection_recommendations,
        summary: parsedResult.summary,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Save error:', saveError);
      throw new Error(`Failed to save AI output: ${saveError.message}`);
    }

    // 10. Update BI enriched data if provided
    if (parsedResult.enriched_data && Object.keys(parsedResult.enriched_data).length > 0) {
      const updateData: Record<string, any> = {};
      
      if (parsedResult.enriched_data.section_a_basic) {
        updateData.section_a_basic = {
          ...(bi.section_a_basic || {}),
          ...parsedResult.enriched_data.section_a_basic
        };
      }
      if (parsedResult.enriched_data.section_c_company_profile) {
        updateData.section_c_company_profile = {
          ...(bi.section_c_company_profile || {}),
          ...parsedResult.enriched_data.section_c_company_profile
        };
      }
      if (parsedResult.enriched_data.section_g_needs) {
        updateData.section_g_needs = {
          ...(bi.section_g_needs || {}),
          ...parsedResult.enriched_data.section_g_needs
        };
      }

      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('business_interviews')
          .update({
            ...updateData,
            status: 'ai_processed',
            updated_at: new Date().toISOString()
          })
          .eq('id', businessInterviewId);
      }
    } else {
      // Just update status
      await supabase
        .from('business_interviews')
        .update({
          status: 'ai_processed',
          updated_at: new Date().toISOString()
        })
        .eq('id', businessInterviewId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        aiOutputId: aiOutput.id,
        summary: parsedResult.summary
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('process-bi-ai error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getSystemPrompt(): string {
  return `Jesteś asystentem AI analizującym dane z formularza Business Interview (BI).
Twoje zadania:
1. UZUPEŁNIJ DANE: Na podstawie kontekstu uzupełnij brakujące pola (rozwiń skróty, popraw literówki)
2. WYGENERUJ PYTANIA: Zidentyfikuj max 10 najważniejszych brakujących informacji
3. PROPOZYCJE POTRZEB/OFERT: Na podstawie danych wygeneruj propozycje do systemu CRM
4. PROPOZYCJE ZADAŃ: Zaproponuj konkretne działania follow-up
5. REKOMENDACJE POŁĄCZEŃ: Znajdź pasujące kontakty z dostarczonej listy

Odpowiadaj WYŁĄCZNIE w formacie JSON zgodnym ze strukturą:
{
  "summary": {
    "key_insights": ["insight1", "insight2"],
    "relationship_assessment": "ocena stanu relacji",
    "priority_level": "high|medium|low"
  },
  "enriched_data": {
    "section_a_basic": { "poprawione pola" },
    "section_c_company_profile": { "poprawione pola" },
    "section_g_needs": { "poprawione pola" }
  },
  "missing_info": [
    { "id": "uuid", "question": "pytanie", "priority": "high|medium|low", "section": "A-N" }
  ],
  "needs_offers": [
    { "id": "uuid", "type": "need|offer", "title": "tytuł", "description": "opis", "category": "kategoria", "confidence": 0.8 }
  ],
  "task_proposals": [
    { "id": "uuid", "title": "tytuł zadania", "description": "opis", "priority": "high|medium|low", "due_days": 7 }
  ],
  "connection_recommendations": [
    { "id": "uuid", "contact_id": "uuid kontaktu", "contact_name": "imię", "reason": "powód połączenia", "match_type": "need_offer|expertise|industry" }
  ]
}

WAŻNE:
- Generuj unikalne UUID dla każdego elementu (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
- Odpowiadaj po polsku
- Bądź konkretny i praktyczny
- Uwzględnij siłę relacji w rekomendacjach`;
}

function buildPrompt(
  bi: any, 
  contact: any, 
  company: any | null,
  otherContacts: any[],
  allNeeds: any[],
  allOffers: any[]
): string {
  const sections = [];

  sections.push(`## DANE KONTAKTU
- Imię i nazwisko: ${contact?.full_name || 'brak'}
- Stanowisko: ${contact?.position || 'brak'}
- Firma: ${contact?.company || 'brak'}
- Email: ${contact?.email || 'brak'}
- Telefon: ${contact?.phone || 'brak'}
- Siła relacji: ${contact?.relationship_strength || 5}/10
- Profil: ${contact?.profile_summary || 'brak'}`);

  if (company) {
    sections.push(`## DANE FIRMY
- Nazwa: ${company.name}
- Branża: ${company.industry || 'brak'}
- Wielkość: ${company.company_size || 'brak'}
- Przychody: ${company.revenue_amount ? `${company.revenue_amount} ${company.revenue_currency || 'PLN'}` : 'brak'}
- Opis: ${company.description || 'brak'}
- Strona: ${company.website || 'brak'}`);
  }

  sections.push(`## DANE Z ARKUSZA BI

### Sekcja A - Dane podstawowe
${JSON.stringify(bi.section_a_basic || {}, null, 2)}

### Sekcja C - Profil firmy
${JSON.stringify(bi.section_c_company_profile || {}, null, 2)}

### Sekcja D - Skala działalności
${JSON.stringify(bi.section_d_scale || {}, null, 2)}

### Sekcja F - Strategia
${JSON.stringify(bi.section_f_strategy || {}, null, 2)}

### Sekcja G - Potrzeby
${JSON.stringify(bi.section_g_needs || {}, null, 2)}

### Sekcja H - Inwestycje
${JSON.stringify(bi.section_h_investments || {}, null, 2)}

### Sekcja J - Wartość dla CC
${JSON.stringify(bi.section_j_value_for_cc || {}, null, 2)}

### Sekcja K - Zaangażowanie
${JSON.stringify(bi.section_k_engagement || {}, null, 2)}

### Sekcja L - Sfera osobista
${JSON.stringify(bi.section_l_personal || {}, null, 2)}

### Sekcja M - Organizacje
${JSON.stringify(bi.section_m_organizations || {}, null, 2)}

### Sekcja N - Follow-up
${JSON.stringify(bi.section_n_followup || {}, null, 2)}`);

  // Add other contacts for matching
  if (otherContacts.length > 0) {
    sections.push(`## INNI KONTAKTY DO MATCHOWANIA
${otherContacts.map(c => `- ${c.full_name} (${c.company || 'brak firmy'}, ${c.position || 'brak stanowiska'}): ${c.profile_summary || 'brak opisu'}`).join('\n')}`);
  }

  // Add existing needs for matching
  if (allNeeds.length > 0) {
    sections.push(`## ISTNIEJĄCE POTRZEBY W SIECI
${allNeeds.map(n => `- [${n.contacts?.full_name || 'nieznany'}] ${n.title}: ${n.description || ''}`).join('\n')}`);
  }

  // Add existing offers for matching
  if (allOffers.length > 0) {
    sections.push(`## ISTNIEJĄCE OFERTY W SIECI
${allOffers.map(o => `- [${o.contacts?.full_name || 'nieznany'}] ${o.title}: ${o.description || ''}`).join('\n')}`);
  }

  sections.push(`## ZADANIE
Przeanalizuj powyższe dane i zwróć JSON z:
1. summary - kluczowe spostrzeżenia
2. enriched_data - uzupełnione/poprawione dane BI
3. missing_info - max 10 pytań o brakujące informacje
4. needs_offers - propozycje potrzeb i ofert
5. task_proposals - propozycje zadań follow-up
6. connection_recommendations - rekomendacje połączeń z innymi kontaktami`);

  return sections.join('\n\n');
}

function parseAIResponse(content: string): {
  summary: any;
  enriched_data: any;
  missing_info: any[];
  needs_offers: any[];
  task_proposals: any[];
  connection_recommendations: any[];
} {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in AI response');
      return getEmptyResult();
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      summary: parsed.summary || { key_insights: [], relationship_assessment: '', priority_level: 'medium' },
      enriched_data: parsed.enriched_data || {},
      missing_info: Array.isArray(parsed.missing_info) ? parsed.missing_info : [],
      needs_offers: Array.isArray(parsed.needs_offers) ? parsed.needs_offers : [],
      task_proposals: Array.isArray(parsed.task_proposals) ? parsed.task_proposals : [],
      connection_recommendations: Array.isArray(parsed.connection_recommendations) ? parsed.connection_recommendations : [],
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return getEmptyResult();
  }
}

function getEmptyResult() {
  return {
    summary: { key_insights: [], relationship_assessment: 'Nie udało się przeanalizować', priority_level: 'medium' },
    enriched_data: {},
    missing_info: [],
    needs_offers: [],
    task_proposals: [],
    connection_recommendations: [],
  };
}
