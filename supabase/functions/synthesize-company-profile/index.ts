import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// Tabela 5: company_ai_profile - 16 Sections
// ============================================

// Lovable AI for synthesis with 16-section structure
async function synthesizeWithAI(
  companyName: string,
  sourceData: any,
  wwwData: any,
  externalData: any,
  financialData: any,
  internalNotes: string,
  apiKey: string
): Promise<any> {
  const systemPrompt = `Jesteś analitykiem biznesowym. Na podstawie dostarczonych danych stwórz profil klienta w strukturze 16 sekcji.

Zwróć JSON z następującymi sekcjami:

{
  "section_1_summary": {
    "short_description": "Zwięzłe podsumowanie firmy (2-3 zdania)",
    "main_activity": "Główna działalność",
    "key_facts": ["Fakt 1", "Fakt 2", "Fakt 3"]
  },
  
  "section_2_key_data": {
    "name": "Oficjalna nazwa",
    "short_name": "Nazwa skrócona",
    "legal_form": "sp. z o.o.",
    "nip": "1234567890",
    "regon": "123456789",
    "krs": "0000123456",
    "founded_year": 2000,
    "headquarters_city": "Warszawa",
    "headquarters_address": "ul. Przykładowa 1",
    "employee_count": "50-100",
    "company_size": "small/medium/large"
  },
  
  "section_3_business_activity": {
    "industry": "IT / Technologia",
    "sub_industries": ["SaaS", "Cloud", "AI"],
    "business_model": "B2B SaaS",
    "value_proposition": "Główna propozycja wartości",
    "target_clients": "Średnie i duże przedsiębiorstwa",
    "geographic_scope": "Polska, Europa Środkowa"
  },
  
  "section_4_offer": {
    "products": [{"name": "Produkt", "category": "Kategoria", "description": "Opis"}],
    "services": [{"name": "Usługa", "description": "Opis"}],
    "key_features": ["Cecha 1", "Cecha 2"],
    "pricing_model": "Subskrypcja / Projekt / Licencja",
    "certifications": ["ISO 9001", "ISO 27001"]
  },
  
  "section_5_realizations": {
    "reference_projects": [{"name": "Projekt", "client": "Klient", "description": "Opis", "year": 2024}],
    "key_clients": ["Klient 1", "Klient 2"],
    "industries_served": ["Finanse", "Retail"],
    "case_studies_available": true
  },
  
  "section_6_management": {
    "board_members": [{"name": "Jan Kowalski", "position": "Prezes", "source": "krs/www"}],
    "key_executives": [{"name": "Anna Nowak", "position": "CFO"}],
    "shareholders": [{"name": "Udziałowiec", "share_percent": 50}],
    "organizational_structure": "Opis struktury"
  },
  
  "section_7_history": {
    "founded_story": "Historia założenia",
    "timeline": [{"year": 2000, "event": "Założenie firmy"}],
    "major_milestones": ["Kamień milowy 1", "Kamień milowy 2"],
    "mergers_acquisitions": []
  },
  
  "section_8_financial_situation": {
    "latest_revenue": {"amount": 50000000, "year": 2024, "formatted": "50 mln PLN"},
    "revenue_trend": "ascending/descending/stable",
    "profitability": "profitable/break-even/loss",
    "growth_rate_percent": 15,
    "financial_health": "strong/stable/declining",
    "ranking_positions": ["Gazele Biznesu 2024", "Forbes Diamenty"]
  },
  
  "section_9_market_position": {
    "market_share": "5-10%",
    "position": "leader/challenger/follower/niche",
    "main_competitors": ["Konkurent 1", "Konkurent 2"],
    "competitive_advantages": ["Przewaga 1", "Przewaga 2"],
    "market_challenges": ["Wyzwanie 1"]
  },
  
  "section_10_partnerships": {
    "strategic_partners": ["Partner 1", "Partner 2"],
    "technology_partners": ["Microsoft", "AWS"],
    "distribution_partners": [],
    "represented_brands": ["Marka 1"],
    "partnership_types": ["Technology", "Distribution"]
  },
  
  "section_11_media_activity": {
    "recent_news": [{"title": "Tytuł", "date": "2024-12", "summary": "Streszczenie", "source": "money.pl"}],
    "press_mentions_count": 15,
    "media_sentiment": "positive/neutral/negative",
    "key_announcements": ["Ogłoszenie 1"]
  },
  
  "section_12_social_media": {
    "linkedin_url": "https://linkedin.com/company/...",
    "linkedin_followers": 5000,
    "facebook_url": "https://facebook.com/...",
    "twitter_url": null,
    "youtube_url": null,
    "instagram_url": null,
    "social_activity_level": "high/medium/low/none"
  },
  
  "section_13_cooperation_opportunities": {
    "what_company_seeks": "Czego szuka firma",
    "ideal_partner_profile": "Profil idealnego partnera",
    "collaboration_areas": [{"area": "Obszar", "description": "Opis", "priority": "high/medium/low"}],
    "expansion_plans": "Plany ekspansji"
  },
  
  "section_14_risks": {
    "red_flags": ["Ryzyko 1", "Ryzyko 2"],
    "financial_risks": [],
    "operational_risks": [],
    "reputation_risks": [],
    "risk_level": "high/medium/low/none"
  },
  
  "section_15_recommendations": {
    "approach_strategy": "Jak podejść do firmy",
    "key_contacts_to_find": ["Stanowisko 1", "Stanowisko 2"],
    "meeting_topics": ["Temat 1", "Temat 2"],
    "value_proposition_for_them": "Co możemy im zaoferować",
    "timing_recommendation": "Dobry moment / Poczekać"
  },
  
  "section_16_missing_info": {
    "critical_gaps": ["Brak danych finansowych", "Brak zarządu"],
    "nice_to_have": ["Struktura organizacyjna"],
    "data_quality_issues": ["Nieaktualne dane WWW"],
    "recommended_actions": ["Zweryfikować KRS", "Przeskanować ponownie stronę"]
  }
}

Wypełnij tylko te sekcje i pola, dla których masz dane. Jeśli brakuje danych, pozostaw pole puste lub jako null.
Odpowiedz TYLKO JSON, bez dodatkowego tekstu.`;

  const userPrompt = `Dane firmy "${companyName}":

=== DANE REJESTROWE (KRS/CEIDG API) ===
${sourceData ? JSON.stringify(sourceData, null, 2) : 'Brak danych'}

=== DANE ZE STRONY WWW (Firecrawl) ===
${wwwData ? JSON.stringify(wwwData, null, 2) : 'Brak danych'}

=== DANE ZEWNĘTRZNE (Perplexity - news, kontrakty, rynek) ===
${externalData ? JSON.stringify(externalData, null, 2) : 'Brak danych'}

=== DANE FINANSOWE (3 lata) ===
${financialData ? JSON.stringify(financialData, null, 2) : 'Brak danych'}

=== NOTATKI WEWNĘTRZNE (od handlowców) ===
${internalNotes || 'Brak notatek'}

Stwórz pełny profil klienta w strukturze 16 sekcji. Zsyntetyzuj dane ze wszystkich źródeł, rozwiąż konflikty (priorytet: KRS > WWW > Perplexity), wypełnij sekcję section_16_missing_info o brakujących danych.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 6000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Lovable AI] Error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Lovable AI] No JSON found in response');
      throw new Error('No JSON in AI response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('[Lovable AI] Synthesis error:', error);
    throw error;
  }
}

// Build used_sources[] based on available data
function buildUsedSources(sourceData: any, wwwData: any, externalData: any, financialData: any): string[] {
  const sources: string[] = [];
  
  if (sourceData?.source === 'krs_api') sources.push('krs_api');
  if (sourceData?.source === 'ceidg_api') sources.push('ceidg_api');
  if (wwwData?.pages_scanned > 0 || wwwData?.categories) sources.push('website_firecrawl');
  if (externalData?.sources?.length > 0 || externalData?.citations?.length > 0) sources.push('perplexity_external');
  if (financialData?.year_2024 || financialData?.year_2023 || financialData?.years?.length > 0) {
    sources.push('financial_api');
  }
  
  // Add specific financial data sources if available
  if (financialData?.data_sources?.length > 0) {
    financialData.data_sources.forEach((s: string) => {
      if (!sources.includes(s) && typeof s === 'string') {
        sources.push(s);
      }
    });
  }
  
  return sources;
}

// Calculate overall_confidence_score (0-100)
function calculateConfidence(
  profile: any, 
  sourceData: any, 
  wwwData: any, 
  externalData: any, 
  financialData: any
): number {
  let score = 0;
  
  // Critical sections (15 points each - max 60)
  if (profile.section_2_key_data?.nip || profile.section_2_key_data?.krs) score += 15;
  if (profile.section_4_offer?.products?.length > 0 || profile.section_4_offer?.services?.length > 0) score += 15;
  if (profile.section_6_management?.board_members?.length > 0) score += 15;
  if (profile.section_8_financial_situation?.latest_revenue?.amount) score += 15;
  
  // Important sections (8 points each - max 32)
  if (profile.section_1_summary?.short_description) score += 8;
  if (profile.section_3_business_activity?.industry) score += 8;
  if (profile.section_5_realizations?.reference_projects?.length > 0 || 
      profile.section_5_realizations?.key_clients?.length > 0) score += 8;
  if (profile.section_9_market_position?.main_competitors?.length > 0) score += 8;
  
  // Data source bonuses (2 points each - max 8)
  if (sourceData?.source === 'krs_api' || sourceData?.source === 'ceidg_api') score += 2;
  if (wwwData?.pages_scanned > 0 || wwwData?.categories) score += 2;
  if (externalData?.sources?.length > 0 || externalData?.citations?.length > 0) score += 2;
  if (financialData?.year_2024 || financialData?.year_2023) score += 2;
  
  return Math.min(100, score);
}

// Identify missing sections for 16-section structure
function identifyMissingSections(profile: any): string[] {
  const missing: string[] = [];
  
  if (!profile.section_1_summary?.short_description) missing.push('section_1_summary');
  if (!profile.section_2_key_data?.name) missing.push('section_2_key_data');
  if (!profile.section_3_business_activity?.industry) missing.push('section_3_business_activity');
  if (!profile.section_4_offer?.products?.length && !profile.section_4_offer?.services?.length) {
    missing.push('section_4_offer');
  }
  if (!profile.section_5_realizations?.reference_projects?.length && 
      !profile.section_5_realizations?.key_clients?.length) {
    missing.push('section_5_realizations');
  }
  if (!profile.section_6_management?.board_members?.length) missing.push('section_6_management');
  if (!profile.section_7_history?.timeline?.length && !profile.section_7_history?.founded_story) {
    missing.push('section_7_history');
  }
  if (!profile.section_8_financial_situation?.latest_revenue) missing.push('section_8_financial_situation');
  if (!profile.section_9_market_position?.main_competitors?.length) missing.push('section_9_market_position');
  if (!profile.section_10_partnerships?.strategic_partners?.length && 
      !profile.section_10_partnerships?.technology_partners?.length) {
    missing.push('section_10_partnerships');
  }
  if (!profile.section_11_media_activity?.recent_news?.length) missing.push('section_11_media_activity');
  if (!profile.section_12_social_media?.linkedin_url) missing.push('section_12_social_media');
  if (!profile.section_13_cooperation_opportunities?.collaboration_areas?.length) {
    missing.push('section_13_cooperation_opportunities');
  }
  // section_14_risks and section_15_recommendations can be empty
  // section_16_missing_info is always filled by AI
  
  return missing;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company_id } = await req.json();

    if (!company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!lovableKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Lovable AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch company with all stage data
    const { data: company, error: fetchError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', company_id)
      .single();

    if (fetchError || !company) {
      return new Response(
        JSON.stringify({ success: false, error: 'Company not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Stage 5] Starting 16-section profile synthesis for: ${company.name}`);

    // Update status to processing
    await supabase
      .from('companies')
      .update({ company_analysis_status: 'processing' })
      .eq('id', company_id);

    // Get internal notes if any (from contacts)
    const { data: relatedContacts } = await supabase
      .from('contacts')
      .select('notes')
      .eq('company_id', company_id)
      .limit(5);

    const internalNotes = relatedContacts
      ?.map(c => c.notes)
      .filter(Boolean)
      .join('\n') || '';

    // Synthesize profile with 16-section structure
    const profile = await synthesizeWithAI(
      company.name,
      company.source_data_api,
      company.www_data,
      company.external_data,
      company.financial_data_3y,
      internalNotes,
      lovableKey
    );

    // Build metadata fields
    const usedSources = buildUsedSources(
      company.source_data_api,
      company.www_data,
      company.external_data,
      company.financial_data_3y
    );
    
    const confidenceScore = calculateConfidence(
      profile,
      company.source_data_api,
      company.www_data,
      company.external_data,
      company.financial_data_3y
    );
    
    const missingSections = identifyMissingSections(profile);

    // Add top-level metadata to profile
    profile.overall_confidence_score = confidenceScore;
    profile.used_sources = usedSources;
    profile.generated_at = new Date().toISOString();

    // Save to database
    const { error: updateError } = await supabase
      .from('companies')
      .update({
        ai_analysis: profile,
        company_analysis_status: 'completed',
        company_analysis_date: new Date().toISOString(),
        analysis_confidence_score: confidenceScore,
        analysis_missing_sections: missingSections,
        analysis_data_sources: { used_sources: usedSources },
        // Update basic fields from synthesis if not already set
        ...(profile.section_3_business_activity?.industry && !company.industry 
            ? { industry: profile.section_3_business_activity.industry } : {}),
        ...(profile.section_2_key_data?.employee_count && !company.employee_count 
            ? { employee_count: profile.section_2_key_data.employee_count } : {}),
        ...(profile.section_2_key_data?.company_size && !company.company_size 
            ? { company_size: profile.section_2_key_data.company_size } : {}),
      })
      .eq('id', company_id);

    if (updateError) {
      console.error('[Stage 5] Database update error:', updateError);
      throw updateError;
    }

    console.log(`[Stage 5] Completed with confidence ${confidenceScore}, missing: ${missingSections.length} sections`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        profile,
        overall_confidence_score: confidenceScore,
        used_sources: usedSources,
        missing_sections: missingSections,
        generated_at: profile.generated_at
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Stage 5] Error:', error);

    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
