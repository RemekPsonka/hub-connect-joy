import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// Company AI Profile - Flat Structure for UI
// ============================================

// Repair common JSON errors from AI responses
function repairJson(jsonString: string): string {
  let repaired = jsonString;
  
  // 1. Remove trailing commas before } or ]
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
  
  // 2. Remove control characters that break JSON (except newlines, tabs)
  repaired = repaired.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // 3. Fix double commas
  repaired = repaired.replace(/,\s*,/g, ',');
  
  // 4. Fix missing commas between properties (simple heuristic)
  repaired = repaired.replace(/"\s*\n\s*"/g, '",\n"');
  
  // 5. Ensure strings with newlines are properly escaped
  repaired = repaired.replace(/:\s*"([^"]*)\n([^"]*)"/g, (match, p1, p2) => {
    return `: "${p1}\\n${p2}"`;
  });
  
  return repaired;
}

// Fallback: Extract key fields manually when JSON is severely malformed
function extractFieldsManually(content: string): any {
  const result: any = {};
  
  // Try to extract common fields
  const fieldPatterns = [
    { key: 'name', regex: /"name"\s*:\s*"([^"]+)"/ },
    { key: 'description', regex: /"description"\s*:\s*"([^"]+)"/ },
    { key: 'industry', regex: /"industry"\s*:\s*"([^"]+)"/ },
    { key: 'legal_form', regex: /"legal_form"\s*:\s*"([^"]+)"/ },
    { key: 'nip', regex: /"nip"\s*:\s*"([^"]+)"/ },
    { key: 'krs', regex: /"krs"\s*:\s*"([^"]+)"/ },
    { key: 'regon', regex: /"regon"\s*:\s*"([^"]+)"/ },
  ];
  
  for (const { key, regex } of fieldPatterns) {
    const match = content.match(regex);
    if (match) {
      result[key] = match[1];
    }
  }
  
  return result;
}

// Lovable AI for synthesis with flat structure (matches CompanyAnalysis interface)
async function synthesizeWithAI(
  companyName: string,
  sourceData: any,
  wwwData: any,
  externalData: any,
  financialData: any,
  internalNotes: string,
  apiKey: string
): Promise<any> {
  const systemPrompt = `Jesteś analitykiem biznesowym. Na podstawie dostarczonych danych stwórz profil klienta w płaskiej strukturze JSON.

Zwróć JSON z następującymi polami (wypełnij tylko te, dla których masz dane):

{
  "name": "Oficjalna nazwa firmy",
  "short_name": "Nazwa skrócona",
  "legal_form": "sp. z o.o. / S.A. / itp.",
  "industry": "Główna branża",
  "sub_industries": ["Specjalizacja 1", "Specjalizacja 2"],
  "description": "Zwięzły opis działalności firmy (2-3 zdania)",
  "tagline": "Motto lub hasło firmy",
  "year_founded": 2000,
  "founder_info": "Informacje o założycielu",
  "founding_story": "Historia założenia firmy",
  
  "business_model": "Opis modelu biznesowego (B2B/B2C/SaaS/itp.)",
  "value_proposition": "Główna propozycja wartości",
  "competitive_advantages": ["Przewaga 1", "Przewaga 2"],
  "competitive_differentiation": "Czym firma wyróżnia się od konkurencji",
  
  "revenue": {"amount": 50000000, "year": 2024, "currency": "PLN"},
  "revenue_history": [{"year": 2024, "amount": 50000000, "growth_pct": 15}],
  "employee_count": "50-100",
  "company_size": "small/medium/large",
  "market_position": "Pozycja na rynku (lider/challenger/niche)",
  "growth_rate": 15,
  
  "products": [{"name": "Produkt", "category": "Kategoria", "description": "Opis", "target_customer": "Klient docelowy"}],
  "services": [{"name": "Usługa", "description": "Opis", "target": "Klient docelowy"}],
  "flagship_products": ["Główny produkt 1", "Główny produkt 2"],
  "certifications": ["ISO 9001", "ISO 27001"],
  "awards": ["Nagroda 1", "Nagroda 2"],
  
  "locations": [{"type": "headquarters/branch/warehouse", "city": "Warszawa", "address": "ul. Przykładowa 1"}],
  "geographic_coverage": {
    "poland_cities": ["Warszawa", "Kraków"],
    "poland_regions": ["Mazowieckie", "Małopolskie"],
    "international_countries": ["Niemcy", "Czechy"]
  },
  
  "reference_projects": [{"name": "Projekt", "client": "Klient", "description": "Opis", "year": 2024}],
  "key_clients": [{"name": "Klient", "industry": "Branża"}],
  "target_industries": ["Finanse", "Retail", "Produkcja"],
  
  "management": [{"name": "Jan Kowalski", "position": "Prezes Zarządu", "source": "krs"}],
  "shareholders": [{"name": "Udziałowiec", "ownership_percent": 50, "type": "individual/company"}],
  
  "main_competitors": [{"name": "Konkurent", "strength": "Mocna strona", "weakness": "Słaba strona"}],
  "market_challenges": ["Wyzwanie rynkowe 1"],
  
  "collaboration_opportunities": [{"area": "Obszar współpracy", "description": "Opis możliwości", "priority": "high/medium/low"}],
  "ideal_partner_profile": "Profil idealnego partnera biznesowego",
  "what_company_seeks": "Czego szuka firma (partnerzy, klienci, dostawcy)",
  "expansion_plans": "Plany rozwoju i ekspansji",
  
  "recent_news": [{"date": "2024-12", "title": "Tytuł", "summary": "Streszczenie", "source": "źródło", "sentiment": "positive/neutral/negative"}],
  "market_signals": [{"type": "expansion/hiring/investment/partnership", "description": "Opis sygnału"}],
  "sentiment": "positive/neutral/negative",
  
  "represented_brands": [{"name": "Marka", "type": "own/represented/distributed"}],
  "partnerships": ["Partner strategiczny 1", "Partner technologiczny 2"],
  
  "csr_activities": [{"area": "Obszar CSR", "description": "Opis aktywności"}],
  "sustainability_initiatives": ["Inicjatywa 1"],
  
  "timeline": [{"year": 2000, "event": "Założenie firmy"}, {"year": 2020, "event": "Ekspansja zagraniczna"}],
  
  "nip": "1234567890",
  "regon": "123456789",
  "krs": "0000123456",
  "address": "ul. Przykładowa 1",
  "city": "Warszawa",
  "postal_code": "00-001",
  
  "confidence": "high/medium/low",
  "analysis_notes": ["Uwaga 1 o jakości danych"]
}

WAŻNE:
- Wypełnij TYLKO pola dla których masz dane. Nie wymyślaj informacji.
- Użyj tej płaskiej struktury, NIE używaj sekcji section_1_*, section_2_* itp.
- Rozwiąż konflikty danych: priorytet KRS > WWW > Perplexity
- Odpowiedz TYLKO JSON, bez dodatkowego tekstu.`;

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

Stwórz pełny profil klienta w płaskiej strukturze JSON. Zsyntetyzuj dane ze wszystkich źródeł.`;

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
        max_tokens: 8000
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

    // Multi-tier parsing with repair logic
    let parsed: any = null;
    let lastError: Error | null = null;

    // Attempt 1: Direct parse
    try {
      parsed = JSON.parse(jsonMatch[0]);
      console.log('[Lovable AI] JSON parsed successfully on first attempt');
    } catch (e1) {
      console.warn('[Lovable AI] First parse failed, attempting repair...', (e1 as Error).message);
      lastError = e1 as Error;
      
      // Attempt 2: Parse after repair
      try {
        const repaired = repairJson(jsonMatch[0]);
        parsed = JSON.parse(repaired);
        console.log('[Lovable AI] JSON repaired and parsed successfully');
      } catch (e2) {
        console.warn('[Lovable AI] Repair failed, trying manual extraction...', (e2 as Error).message);
        
        // Attempt 3: Manual field extraction
        try {
          parsed = extractFieldsManually(content);
          if (Object.keys(parsed).length > 0) {
            console.log('[Lovable AI] Extracted fields manually:', Object.keys(parsed).length);
          } else {
            throw new Error('No fields could be extracted');
          }
        } catch (e3) {
          console.error('[Lovable AI] All parsing attempts failed');
          throw lastError;
        }
      }
    }

    return parsed;
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

// Calculate overall_confidence_score (0-100) for flat structure
function calculateConfidence(
  profile: any, 
  sourceData: any, 
  wwwData: any, 
  externalData: any, 
  financialData: any
): number {
  let score = 0;
  
  // Critical fields (15 points each - max 60)
  if (profile.nip || profile.krs) score += 15;
  if (profile.products?.length > 0 || profile.services?.length > 0) score += 15;
  if (profile.management?.length > 0) score += 15;
  if (profile.revenue?.amount) score += 15;
  
  // Important fields (8 points each - max 32)
  if (profile.description) score += 8;
  if (profile.industry) score += 8;
  if (profile.reference_projects?.length > 0 || profile.key_clients?.length > 0) score += 8;
  if (profile.main_competitors?.length > 0) score += 8;
  
  // Data source bonuses (2 points each - max 8)
  if (sourceData?.source === 'krs_api' || sourceData?.source === 'ceidg_api') score += 2;
  if (wwwData?.pages_scanned > 0 || wwwData?.categories) score += 2;
  if (externalData?.sources?.length > 0 || externalData?.citations?.length > 0) score += 2;
  if (financialData?.year_2024 || financialData?.year_2023) score += 2;
  
  return Math.min(100, score);
}

// Identify missing data areas for flat structure
function identifyMissingSections(profile: any): string[] {
  const missing: string[] = [];
  
  if (!profile.description) missing.push('description');
  if (!profile.name) missing.push('name');
  if (!profile.industry) missing.push('industry');
  if (!profile.products?.length && !profile.services?.length) missing.push('products_services');
  if (!profile.reference_projects?.length && !profile.key_clients?.length) missing.push('clients_projects');
  if (!profile.management?.length) missing.push('management');
  if (!profile.timeline?.length && !profile.founding_story) missing.push('history');
  if (!profile.revenue?.amount) missing.push('financials');
  if (!profile.main_competitors?.length) missing.push('competition');
  if (!profile.partnerships?.length && !profile.represented_brands?.length) missing.push('partnerships');
  if (!profile.recent_news?.length) missing.push('news');
  if (!profile.collaboration_opportunities?.length) missing.push('collaboration');
  
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

    console.log(`[Stage 5] Starting flat profile synthesis for: ${company.name}`);

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

    // Synthesize profile with flat structure
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
        // Update basic fields from synthesis if not already set (flat structure)
        ...(profile.industry && !company.industry ? { industry: profile.industry } : {}),
        ...(profile.employee_count && !company.employee_count ? { employee_count: profile.employee_count } : {}),
        ...(profile.company_size && !company.company_size ? { company_size: profile.company_size } : {}),
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
