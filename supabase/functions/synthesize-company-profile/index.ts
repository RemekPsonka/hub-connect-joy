import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Lovable AI for synthesis
async function synthesizeWithAI(
  companyName: string,
  sourceData: any,
  wwwData: any,
  externalData: any,
  financialData: any,
  internalNotes: string,
  apiKey: string
): Promise<any> {
  const systemPrompt = `Jesteś analitykiem biznesowym. Na podstawie dostarczonych danych stwórz szczegółowy profil klienta.

WAŻNE: Zwróć PŁASKI JSON z wszystkimi polami na głównym poziomie. NIE używaj zagnieżdżonych sekcji.

Struktura odpowiedzi (wszystkie pola opcjonalne - wypełnij tylko te, dla których masz dane):

{
  "summary": "Zwięzłe podsumowanie firmy (3-5 zdań)",
  "name": "Oficjalna nazwa",
  "short_name": "Skrócona nazwa",
  "legal_form": "Forma prawna",
  "industry": "Główna branża",
  "sub_industries": ["Podbranże"],
  "year_founded": 2000,
  "description": "Opis działalności (200 słów)",
  
  "products": [{"name": "Produkt", "category": "Kategoria", "description": "Opis"}],
  "services": [{"name": "Usługa", "description": "Opis"}],
  "key_projects": ["Realizacja 1", "Realizacja 2"],
  
  "management": [{"name": "Jan Kowalski", "position": "Prezes", "verified": true}],
  "employee_count": "50-100",
  "company_size": "medium",
  
  "revenue": {"amount": 50000000, "year": 2024, "currency": "PLN"},
  "revenue_history": [{"year": 2024, "amount": 50000000}, {"year": 2023, "amount": 45000000}],
  "growth_rate": 10,
  "market_position": "Opis pozycji rynkowej",
  
  "headquarters": {"city": "Warszawa", "address": "ul. Przykładowa 1"},
  "locations": [{"type": "headquarters", "city": "Warszawa"}],
  
  "main_competitors": ["Konkurent 1", "Konkurent 2"],
  "competitive_advantages": ["Przewaga 1", "Przewaga 2"],
  
  "partnerships": ["Partner 1", "Partner 2"],
  "certifications": ["ISO 9001"],
  "awards": ["Nagroda 2023"],
  
  "recent_news": [{"title": "Tytuł", "date": "2024-01", "summary": "Streszczenie"}],
  "market_signals": ["Sygnał 1"],
  
  "collaboration_opportunities": [{"area": "Obszar", "description": "Opis", "priority": "high"}],
  "seeking_partners": "Czego szuka",
  "seeking_clients": "Jakich klientów szuka",
  
  "red_flags": ["Ryzyko 1"],
  "missing_info": ["Brakujące dane"],
  
  "social_media": {"linkedin": "url", "facebook": "url"},
  
  "nip": "1234567890",
  "krs": "0000123456",
  "regon": "123456789",
  
  "confidence": "high/medium/low",
  "data_sources_used": ["krs_api", "website", "perplexity"]
}

Odpowiedz TYLKO JSON, bez dodatkowego tekstu.`;

  const userPrompt = `Dane firmy "${companyName}":

=== DANE REJESTROWE (API) ===
${sourceData ? JSON.stringify(sourceData, null, 2) : 'Brak danych'}

=== DANE ZE STRONY WWW ===
${wwwData ? JSON.stringify(wwwData, null, 2) : 'Brak danych'}

=== DANE ZEWNĘTRZNE (NEWS, KONTRAKTY) ===
${externalData ? JSON.stringify(externalData, null, 2) : 'Brak danych'}

=== DANE FINANSOWE ===
${financialData ? JSON.stringify(financialData, null, 2) : 'Brak danych'}

=== NOTATKI WEWNĘTRZNE ===
${internalNotes || 'Brak notatek'}

Stwórz pełny profil klienta. Zsyntetyzuj dane ze wszystkich źródeł.`;

  try {
    const response = await fetch('https://api.lovable.dev/v1/chat/completions', {
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
        max_tokens: 4000
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

// Calculate confidence score
function calculateConfidence(profile: any, sourceData: any, wwwData: any, externalData: any): number {
  let score = 0;
  const weights = {
    hasVerifiedRegistry: 0.25,
    hasWebsiteData: 0.2,
    hasExternalData: 0.15,
    hasFinancialData: 0.15,
    hasManagement: 0.1,
    hasProducts: 0.1,
    hasDescription: 0.05,
  };

  if (sourceData?.source === 'krs_api' || sourceData?.source === 'ceidg_api') {
    score += weights.hasVerifiedRegistry;
  }
  if (wwwData?.pages_scanned > 0) {
    score += weights.hasWebsiteData;
  }
  if (externalData?.citations?.length > 0) {
    score += weights.hasExternalData;
  }
  if (profile.revenue?.amount || profile.revenue_history?.length > 0) {
    score += weights.hasFinancialData;
  }
  if (profile.management?.length > 0) {
    score += weights.hasManagement;
  }
  if (profile.products?.length > 0 || profile.services?.length > 0) {
    score += weights.hasProducts;
  }
  if (profile.description?.length > 100) {
    score += weights.hasDescription;
  }

  return Math.round(score * 100) / 100;
}

// Identify missing sections
function identifyMissingSections(profile: any): string[] {
  const missing: string[] = [];
  
  if (!profile.description || profile.description.length < 50) missing.push('description');
  if (!profile.products?.length && !profile.services?.length) missing.push('products_services');
  if (!profile.management?.length) missing.push('management');
  if (!profile.revenue?.amount && !profile.revenue_history?.length) missing.push('financial_data');
  if (!profile.headquarters?.city) missing.push('location');
  if (!profile.main_competitors?.length) missing.push('competition');
  if (!profile.recent_news?.length) missing.push('news');
  
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

    console.log(`[Stage 5] Starting profile synthesis for: ${company.name}`);

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

    // Synthesize profile
    const profile = await synthesizeWithAI(
      company.name,
      company.source_data_api,
      company.www_data,
      company.external_data,
      company.financial_data_3y,
      internalNotes,
      lovableKey
    );

    // Calculate confidence and missing sections
    const confidenceScore = calculateConfidence(
      profile,
      company.source_data_api,
      company.www_data,
      company.external_data
    );
    const missingSections = identifyMissingSections(profile);

    // Add metadata
    profile.synthesis_date = new Date().toISOString();
    profile.sources_used = {
      source_data: !!company.source_data_api,
      www_data: !!company.www_data,
      external_data: !!company.external_data,
      financial_data: !!company.financial_data_3y,
    };

    // Save to database
    const { error: updateError } = await supabase
      .from('companies')
      .update({
        ai_analysis: profile,
        company_analysis_status: 'completed',
        company_analysis_date: new Date().toISOString(),
        analysis_confidence_score: confidenceScore,
        analysis_missing_sections: missingSections,
        analysis_data_sources: profile.sources_used,
        // Update basic fields from synthesis
        ...(profile.industry && !company.industry ? { industry: profile.industry } : {}),
        ...(profile.employee_count && !company.employee_count ? { employee_count: profile.employee_count } : {}),
        ...(profile.company_size && !company.company_size ? { company_size: profile.company_size } : {}),
        ...(profile.tagline && !company.tagline ? { tagline: profile.tagline } : {}),
      })
      .eq('id', company_id);

    if (updateError) {
      console.error('[Stage 5] Database update error:', updateError);
      throw updateError;
    }

    console.log(`[Stage 5] Completed with confidence ${confidenceScore}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        profile,
        confidence_score: confidenceScore,
        missing_sections: missingSections
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
