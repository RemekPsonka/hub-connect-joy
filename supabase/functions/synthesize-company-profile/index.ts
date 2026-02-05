import { z } from "zod";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

// Zod schema for request validation
const requestSchema = z.object({
  company_id: z.string().uuid("company_id musi byc poprawnym UUID"),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// Company AI Profile - JSON Response Format
// ============================================

// Robust JSON parser with repair logic
function parseAIResponse(content: string): any {
  // 1. Direct parse
  try {
    return JSON.parse(content);
  } catch (e) {
    console.log('[Parser] Direct parse failed, trying extraction');
  }

  // 2. Extract from markdown blocks
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch (e) {
      console.log('[Parser] Markdown extraction failed');
    }
  }

  // 3. Find JSON object in text
  const objectMatch = content.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    let jsonStr = objectMatch[0];
    
    // Try direct parse first
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.log('[Parser] Object extraction failed, attempting repair');
    }

    // 4. Repair truncated JSON
    try {
      // Count quotes and balance
      const quoteCount = (jsonStr.match(/(?<!\\)"/g) || []).length;
      if (quoteCount % 2 !== 0) {
        jsonStr += '"';
      }

      // Balance brackets
      const openBrackets = (jsonStr.match(/\[/g) || []).length;
      const closeBrackets = (jsonStr.match(/\]/g) || []).length;
      jsonStr += ']'.repeat(Math.max(0, openBrackets - closeBrackets));

      // Balance braces
      const openBraces = (jsonStr.match(/\{/g) || []).length;
      const closeBraces = (jsonStr.match(/\}/g) || []).length;
      jsonStr += '}'.repeat(Math.max(0, openBraces - closeBraces));

      return JSON.parse(jsonStr);
    } catch (e) {
      console.log('[Parser] Repair failed:', e);
    }
  }

  throw new Error('Could not parse AI response as JSON');
}

// Build fallback profile from raw source data
function buildFallbackProfile(company: any): any {
  const source = company.source_data_api || {};
  const external = company.external_data || {};
  const www = company.www_data || {};
  const financial = company.financial_data_3y || {};

  console.log('[Fallback] Building from raw sources');

  return {
    name: source.name_official || source.official_name || company.name,
    legal_form: source.legal_form,
    industry: source.industry || company.industry,
    description: external.summary || www.company_description || `Firma ${company.name}`,
    
    nip: source.nip,
    krs: source.krs,
    regon: source.regon,
    address: source.address,
    city: source.city,
    postal_code: source.postal_code,
    country: 'Polska',
    website: company.website,
    
    management: source.management || [],
    shareholders: source.shareholders || [],
    
    products: www.products || [],
    services: www.services || [],
    
    recent_news: external.press_mentions || external.recent_news || [],
    awards: external.awards || [],
    certifications: www.certifications || [],
    
    revenue: financial.year_2024 || financial.year_2023 ? {
      amount: financial.year_2024?.revenue || financial.year_2023?.revenue,
      year: financial.year_2024 ? 2024 : 2023,
      currency: 'PLN'
    } : undefined,
    
    fallback_used: true,
    confidence: 'low',
    analysis_notes: ['Profil wygenerowany z surowych danych źródłowych (fallback)']
  };
}

// Main synthesis function
async function synthesizeProfile(
  companyName: string,
  sourceData: any,
  wwwData: any,
  externalData: any,
  financialData: any,
  internalNotes: string,
  apiKey: string
): Promise<any> {
  
  const systemPrompt = `Jesteś ekspertem od analizy biznesowej firm polskich.
Stwórz KOMPLETNY profil firmy w formacie JSON.

ZASADY:
1. Wypełnij WSZYSTKIE pola dla których masz dane
2. Priorytet źródeł: KRS/CEIDG > WWW > Perplexity
3. Używaj polskiego języka
4. Zwróć TYLKO valid JSON object, BEZ markdown, BEZ komentarzy

STRUKTURA JSON (wypełnij tylko pola z danymi):
{
  "name": "Pełna nazwa firmy",
  "short_name": "Nazwa skrócona",
  "legal_form": "S.A./sp. z o.o./itp.",
  "industry": "Główna branża",
  "sub_industries": ["specjalizacja1", "specjalizacja2"],
  "description": "Opis działalności 2-3 zdania",
  "tagline": "Motto/slogan firmy",
  "year_founded": 2000,
  "founder_info": "Info o założycielu",
  "founding_story": "Historia powstania",
  
  "timeline": [{"year": 2000, "event": "Założenie firmy"}],
  
  "revenue": {"amount": 50000000, "year": 2024, "currency": "PLN"},
  "revenue_history": [{"year": 2024, "amount": 50000000, "growth_pct": 15}],
  "employee_count": "50-100",
  "company_size": "medium",
  "market_position": "Pozycja rynkowa",
  "growth_rate": 15,
  
  "business_model": "Model biznesowy",
  "value_proposition": "Propozycja wartości",
  "competitive_advantages": ["przewaga1", "przewaga2"],
  "competitive_differentiation": "Wyróżniki",
  
  "products": [{"name": "Produkt", "category": "Kategoria", "description": "Opis"}],
  "services": [{"name": "Usługa", "description": "Opis"}],
  "flagship_products": ["Główny produkt"],
  "certifications": ["ISO 9001"],
  "awards": ["Nagroda"],
  
  "represented_brands": [{"name": "Marka", "type": "represented"}],
  "partnerships": ["Partner"],
  
  "locations": [{"type": "headquarters", "city": "Miasto", "address": "Adres"}],
  "geographic_coverage": {"poland_cities": [], "poland_regions": [], "international_countries": []},
  
  "reference_projects": [{"name": "Projekt", "client": "Klient", "year": 2024}],
  "key_clients": [{"name": "Klient", "industry": "Branża"}],
  "target_industries": ["Branża docelowa"],
  
  "main_competitors": [{"name": "Konkurent", "strength": "Mocna strona"}],
  "market_challenges": ["Wyzwanie"],
  
  "offer_summary": "Podsumowanie oferty",
  "unique_selling_points": ["USP1", "USP2"],
  
  "what_company_seeks": "Czego szuka firma",
  "expansion_plans": "Plany rozwoju",
  "hiring_positions": ["Stanowisko"],
  
  "collaboration_opportunities": [{"area": "Obszar", "description": "Opis", "priority": "high"}],
  "ideal_partner_profile": "Profil partnera",
  
  "management": [{"name": "Imię Nazwisko", "position": "Stanowisko", "source": "krs"}],
  "shareholders": [{"name": "Udziałowiec", "ownership_percent": 50}],
  
  "recent_news": [{"date": "2024-12", "title": "Tytuł", "summary": "Streszczenie"}],
  "market_signals": [{"type": "expansion", "description": "Opis"}],
  "sentiment": "positive/neutral/negative",
  
  "csr_activities": [{"area": "Ekologia", "description": "Działania"}],
  "sustainability_initiatives": ["Inicjatywa"],
  
  "nip": "1234567890",
  "regon": "123456789",
  "krs": "0000123456",
  "address": "ul. Przykładowa 1",
  "city": "Warszawa",
  "postal_code": "00-001",
  "country": "Polska",
  "website": "https://example.com",
  "phone": "+48123456789",
  "email": "kontakt@example.com",
  
  "confidence": "high/medium/low",
  "analysis_notes": ["Uwaga 1"]
}`;

  const userPrompt = `Stwórz profil firmy "${companyName}":

=== REJESTR KRS/CEIDG ===
${sourceData ? JSON.stringify(sourceData, null, 2) : 'Brak danych'}

=== STRONA WWW ===
${wwwData ? JSON.stringify(wwwData, null, 2) : 'Brak danych'}

=== DANE ZEWNĘTRZNE (Perplexity) ===
${externalData ? JSON.stringify(externalData, null, 2) : 'Brak danych'}

=== FINANSE ===
${financialData ? JSON.stringify(financialData, null, 2) : 'Brak danych'}

=== NOTATKI WEWNĘTRZNE ===
${internalNotes || 'Brak'}

Zwróć TYLKO JSON object. Nie dodawaj markdown ani komentarzy.`;

  console.log('[Synthesis] Starting for:', companyName);
  console.log('[Synthesis] Input sizes:', {
    source: JSON.stringify(sourceData || {}).length,
    www: JSON.stringify(wwwData || {}).length,
    external: JSON.stringify(externalData || {}).length,
    financial: JSON.stringify(financialData || {}).length
  });

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
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 16000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Synthesis] API Error:', response.status, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    console.error('[Synthesis] No content in response');
    throw new Error('No content in AI response');
  }

  console.log('[Synthesis] Response length:', content.length);
  console.log('[Synthesis] First 300 chars:', content.substring(0, 300));

  const profile = parseAIResponse(content);
  const filledFields = Object.keys(profile).filter(k => {
    const v = profile[k];
    return v !== null && v !== undefined && v !== '' && 
           !(Array.isArray(v) && v.length === 0);
  });
  
  console.log('[Synthesis] Parsed successfully, fields:', filledFields.length);
  
  return profile;
}

// Build used_sources array
function buildUsedSources(sourceData: any, wwwData: any, externalData: any, financialData: any): string[] {
  const sources: string[] = [];
  if (sourceData?.source === 'krs_api') sources.push('krs_api');
  if (sourceData?.source === 'ceidg_api') sources.push('ceidg_api');
  if (wwwData?.pages_scanned > 0 || wwwData?.categories) sources.push('website_firecrawl');
  if (externalData?.sources?.length > 0 || externalData?.citations?.length > 0 || externalData?.raw_analyses) sources.push('perplexity_external');
  if (financialData?.year_2024 || financialData?.year_2023 || financialData?.years?.length > 0) sources.push('financial_api');
  return sources;
}

// Calculate confidence score (0-100)
function calculateConfidence(profile: any, sourceData: any, wwwData: any, externalData: any, financialData: any): number {
  let score = 0;
  
  // Critical fields (15 pts each)
  if (profile.nip || profile.krs) score += 15;
  if (profile.products?.length > 0 || profile.services?.length > 0) score += 15;
  if (profile.management?.length > 0) score += 15;
  if (profile.revenue?.amount) score += 15;
  
  // Important fields (8 pts each)
  if (profile.description) score += 8;
  if (profile.industry) score += 8;
  if (profile.reference_projects?.length > 0 || profile.key_clients?.length > 0) score += 8;
  if (profile.main_competitors?.length > 0) score += 8;
  
  // Source bonuses (2 pts each)
  if (sourceData?.source) score += 2;
  if (wwwData?.pages_scanned > 0 || wwwData?.categories) score += 2;
  if (externalData?.sources?.length > 0 || externalData?.raw_analyses) score += 2;
  if (financialData?.year_2024 || financialData?.year_2023) score += 2;
  
  return Math.min(100, score);
}

// Identify missing sections
function identifyMissingSections(profile: any): string[] {
  const missing: string[] = [];
  if (!profile.description) missing.push('description');
  if (!profile.industry) missing.push('industry');
  if (!profile.products?.length && !profile.services?.length) missing.push('products_services');
  if (!profile.management?.length) missing.push('management');
  if (!profile.revenue?.amount) missing.push('financials');
  if (!profile.recent_news?.length) missing.push('news');
  return missing;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate request body with Zod BEFORE auth
    const body = await req.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: validation.error.format() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { company_id } = validation.data;

    // Verify authorization
    const authResult = await verifyAuth(req, supabase);
    if (isAuthError(authResult)) {
      return unauthorizedResponse(authResult, corsHeaders);
    }

    console.log(`[synthesize-company-profile] Authorized user: ${authResult.user.id}, tenant: ${authResult.tenantId}`);
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Lovable AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    console.log(`[Stage 5] Starting synthesis for: ${company.name}`);

    await supabase
      .from('companies')
      .update({ company_analysis_status: 'processing' })
      .eq('id', company_id);

    const { data: relatedContacts } = await supabase
      .from('contacts')
      .select('notes')
      .eq('company_id', company_id)
      .limit(5);

    const internalNotes = relatedContacts?.map(c => c.notes).filter(Boolean).join('\n') || '';

    let profile: any;
    let useFallback = false;

    try {
      profile = await synthesizeProfile(
        company.name,
        company.source_data_api,
        company.www_data,
        company.external_data,
        company.financial_data_3y,
        internalNotes,
        lovableKey
      );
    } catch (synthError: any) {
      console.error('[Stage 5] Synthesis failed, using fallback:', synthError.message);
      profile = buildFallbackProfile(company);
      useFallback = true;
    }

    const usedSources = buildUsedSources(company.source_data_api, company.www_data, company.external_data, company.financial_data_3y);
    const confidenceScore = useFallback ? 30 : calculateConfidence(profile, company.source_data_api, company.www_data, company.external_data, company.financial_data_3y);
    const missingSections = identifyMissingSections(profile);

    profile.overall_confidence_score = confidenceScore;
    profile.used_sources = usedSources;
    profile.generated_at = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('companies')
      .update({
        ai_analysis: profile,
        company_analysis_status: 'completed',
        company_analysis_date: new Date().toISOString(),
        analysis_confidence_score: confidenceScore,
        analysis_missing_sections: missingSections,
        analysis_data_sources: { used_sources: usedSources },
        ...(profile.industry && !company.industry ? { industry: profile.industry } : {}),
        ...(profile.employee_count && !company.employee_count ? { employee_count: profile.employee_count } : {}),
        ...(profile.company_size && !company.company_size ? { company_size: profile.company_size } : {}),
      })
      .eq('id', company_id);

    if (updateError) throw updateError;

    console.log(`[Stage 5] Completed: confidence=${confidenceScore}, missing=${missingSections.length}, fallback=${useFallback}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        profile,
        overall_confidence_score: confidenceScore,
        used_sources: usedSources,
        missing_sections: missingSections,
        fallback_used: useFallback
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
