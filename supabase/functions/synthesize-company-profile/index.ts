import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// Company AI Profile - Simplified Tool Calling
// ============================================

// Simplified schema - fewer optional fields, flatter structure
const profileToolSchema = {
  type: "function",
  function: {
    name: "save_company_profile",
    description: "Zapisz profil firmy",
    parameters: {
      type: "object",
      properties: {
        // Core identity
        name: { type: "string" },
        short_name: { type: "string" },
        legal_form: { type: "string" },
        industry: { type: "string" },
        sub_industries: { type: "array", items: { type: "string" } },
        description: { type: "string" },
        tagline: { type: "string" },
        year_founded: { type: "number" },
        founder_info: { type: "string" },
        founding_story: { type: "string" },

        // Timeline as simple array
        timeline: { type: "array", items: { type: "string" } },

        // Financials - simplified
        revenue_amount: { type: "number" },
        revenue_year: { type: "number" },
        revenue_currency: { type: "string" },
        revenue_history_json: { type: "string" },
        employee_count: { type: "string" },
        company_size: { type: "string" },
        market_position: { type: "string" },
        growth_rate: { type: "number" },

        // Business model
        business_model: { type: "string" },
        value_proposition: { type: "string" },
        competitive_advantages: { type: "array", items: { type: "string" } },
        competitive_differentiation: { type: "string" },

        // Products/Services as JSON strings
        products_json: { type: "string" },
        services_json: { type: "string" },
        flagship_products: { type: "array", items: { type: "string" } },
        certifications: { type: "array", items: { type: "string" } },
        awards: { type: "array", items: { type: "string" } },

        // Brands and partnerships
        represented_brands_json: { type: "string" },
        partnerships: { type: "array", items: { type: "string" } },

        // Locations as JSON string
        locations_json: { type: "string" },
        geographic_coverage_json: { type: "string" },

        // Clients/Projects as JSON strings
        reference_projects_json: { type: "string" },
        key_clients_json: { type: "string" },
        target_industries: { type: "array", items: { type: "string" } },

        // Competition
        main_competitors_json: { type: "string" },
        market_challenges: { type: "array", items: { type: "string" } },

        // Offer
        offer_summary: { type: "string" },
        unique_selling_points: { type: "array", items: { type: "string" } },

        // What company seeks
        what_company_seeks: { type: "string" },
        expansion_plans: { type: "string" },
        hiring_positions: { type: "array", items: { type: "string" } },

        // Collaboration
        collaboration_opportunities_json: { type: "string" },
        ideal_partner_profile: { type: "string" },

        // Management as JSON string
        management_json: { type: "string" },
        shareholders_json: { type: "string" },

        // News as JSON string
        recent_news_json: { type: "string" },
        market_signals_json: { type: "string" },
        sentiment: { type: "string" },

        // CSR
        csr_activities_json: { type: "string" },
        sustainability_initiatives: { type: "array", items: { type: "string" } },

        // Registry data
        nip: { type: "string" },
        regon: { type: "string" },
        krs: { type: "string" },
        address: { type: "string" },
        city: { type: "string" },
        postal_code: { type: "string" },
        country: { type: "string" },
        website: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },

        // Metadata
        confidence: { type: "string" },
        analysis_notes: { type: "array", items: { type: "string" } }
      },
      required: ["name", "description"]
    }
  }
};

// Parse JSON fields safely
function parseJsonField(value: string | undefined, fallback: any = []): any {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// Transform simplified response to full profile structure
function transformToFullProfile(simplified: any): any {
  return {
    // Core identity
    name: simplified.name,
    short_name: simplified.short_name,
    legal_form: simplified.legal_form,
    industry: simplified.industry,
    sub_industries: simplified.sub_industries,
    description: simplified.description,
    tagline: simplified.tagline,
    year_founded: simplified.year_founded,
    founder_info: simplified.founder_info,
    founding_story: simplified.founding_story,

    // Timeline - parse string array to objects
    timeline: (simplified.timeline || []).map((item: string, idx: number) => {
      const yearMatch = item.match(/^(\d{4})/);
      return {
        year: yearMatch ? parseInt(yearMatch[1]) : 2000 + idx,
        event: item.replace(/^\d{4}\s*[-:]\s*/, '')
      };
    }),

    // Financials
    revenue: simplified.revenue_amount ? {
      amount: simplified.revenue_amount,
      year: simplified.revenue_year || new Date().getFullYear(),
      currency: simplified.revenue_currency || 'PLN'
    } : undefined,
    revenue_history: parseJsonField(simplified.revenue_history_json, []),
    employee_count: simplified.employee_count,
    company_size: simplified.company_size,
    market_position: simplified.market_position,
    growth_rate: simplified.growth_rate,

    // Business model
    business_model: simplified.business_model,
    value_proposition: simplified.value_proposition,
    competitive_advantages: simplified.competitive_advantages,
    competitive_differentiation: simplified.competitive_differentiation,

    // Products/Services
    products: parseJsonField(simplified.products_json, []),
    services: parseJsonField(simplified.services_json, []),
    flagship_products: simplified.flagship_products,
    certifications: simplified.certifications,
    awards: simplified.awards,

    // Brands
    represented_brands: parseJsonField(simplified.represented_brands_json, []),
    partnerships: simplified.partnerships,

    // Locations
    locations: parseJsonField(simplified.locations_json, []),
    geographic_coverage: parseJsonField(simplified.geographic_coverage_json, {}),

    // Clients/Projects
    reference_projects: parseJsonField(simplified.reference_projects_json, []),
    key_clients: parseJsonField(simplified.key_clients_json, []),
    target_industries: simplified.target_industries,

    // Competition
    main_competitors: parseJsonField(simplified.main_competitors_json, []),
    market_challenges: simplified.market_challenges,

    // Offer
    offer_summary: simplified.offer_summary,
    unique_selling_points: simplified.unique_selling_points,

    // What company seeks
    what_company_seeks: simplified.what_company_seeks,
    expansion_plans: simplified.expansion_plans,
    hiring_positions: simplified.hiring_positions,

    // Collaboration
    collaboration_opportunities: parseJsonField(simplified.collaboration_opportunities_json, []),
    ideal_partner_profile: simplified.ideal_partner_profile,

    // Management
    management: parseJsonField(simplified.management_json, []),
    shareholders: parseJsonField(simplified.shareholders_json, []),

    // News
    recent_news: parseJsonField(simplified.recent_news_json, []),
    market_signals: parseJsonField(simplified.market_signals_json, []),
    sentiment: simplified.sentiment,

    // CSR
    csr_activities: parseJsonField(simplified.csr_activities_json, []),
    sustainability_initiatives: simplified.sustainability_initiatives,

    // Registry data
    nip: simplified.nip,
    regon: simplified.regon,
    krs: simplified.krs,
    address: simplified.address,
    city: simplified.city,
    postal_code: simplified.postal_code,
    country: simplified.country,
    website: simplified.website,
    phone: simplified.phone,
    email: simplified.email,

    // Metadata
    confidence: simplified.confidence,
    analysis_notes: simplified.analysis_notes
  };
}

// Synthesize company profile using Tool Calling
async function synthesizeWithToolCalling(
  companyName: string,
  sourceData: any,
  wwwData: any,
  externalData: any,
  financialData: any,
  internalNotes: string,
  apiKey: string
): Promise<any> {
  const systemPrompt = `Jesteś ekspertem od analizy biznesowej. Stwórz KOMPLETNY profil firmy.

ZASADY:
1. Wypełnij WSZYSTKIE pola dla których masz dane
2. Rozwiąż konflikty: KRS > WWW > Perplexity
3. Używaj polskiego języka

WAŻNE - POLA JSON:
Dla pól kończących się na "_json" (np. products_json, management_json) zwróć VALID JSON STRING, np:
- products_json: "[{\\"name\\":\\"Produkt\\",\\"description\\":\\"Opis\\"}]"
- management_json: "[{\\"name\\":\\"Jan Kowalski\\",\\"position\\":\\"Prezes\\"}]"

Dla timeline - zwróć tablicę stringów w formacie "YYYY - wydarzenie", np:
- timeline: ["2000 - Założenie firmy", "2010 - Ekspansja zagraniczna"]

SKĄD BRAĆ DANE:
- KRS: name, krs, nip, regon, address, management_json, shareholders_json
- WWW: products_json, services_json, locations_json, description
- External: recent_news_json, awards, market_signals_json
- Finanse: revenue_amount, revenue_year, growth_rate`;

  const userPrompt = `Profil firmy "${companyName}":

=== REJESTR (KRS/CEIDG) ===
${sourceData ? JSON.stringify(sourceData, null, 2) : 'Brak'}

=== STRONA WWW ===
${wwwData ? JSON.stringify(wwwData, null, 2) : 'Brak'}

=== DANE ZEWNĘTRZNE ===
${externalData ? JSON.stringify(externalData, null, 2) : 'Brak'}

=== FINANSE ===
${financialData ? JSON.stringify(financialData, null, 2) : 'Brak'}

=== NOTATKI ===
${internalNotes || 'Brak'}

Użyj save_company_profile. Pola *_json muszą zawierać valid JSON string.`;

  try {
    console.log(`[Lovable AI] Starting synthesis for: ${companyName}`);

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
        tools: [profileToolSchema],
        tool_choice: { type: "function", function: { name: "save_company_profile" } },
        temperature: 0.2,
        max_tokens: 12000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Lovable AI] API Error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== 'save_company_profile') {
      console.error('[Lovable AI] No tool call found');
      throw new Error('AI did not return structured profile');
    }

    const simplified = JSON.parse(toolCall.function.arguments);
    const profile = transformToFullProfile(simplified);
    
    console.log(`[Lovable AI] Profile parsed: ${Object.keys(profile).filter(k => profile[k]).length} fields`);

    return profile;

  } catch (error) {
    console.error('[Lovable AI] Synthesis error:', error);
    throw error;
  }
}

// Build used_sources[]
function buildUsedSources(sourceData: any, wwwData: any, externalData: any, financialData: any): string[] {
  const sources: string[] = [];
  if (sourceData?.source === 'krs_api') sources.push('krs_api');
  if (sourceData?.source === 'ceidg_api') sources.push('ceidg_api');
  if (wwwData?.pages_scanned > 0 || wwwData?.categories) sources.push('website_firecrawl');
  if (externalData?.sources?.length > 0 || externalData?.citations?.length > 0) sources.push('perplexity_external');
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
  if (externalData?.sources?.length > 0) score += 2;
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

    const profile = await synthesizeWithToolCalling(
      company.name,
      company.source_data_api,
      company.www_data,
      company.external_data,
      company.financial_data_3y,
      internalNotes,
      lovableKey
    );

    const usedSources = buildUsedSources(company.source_data_api, company.www_data, company.external_data, company.financial_data_3y);
    const confidenceScore = calculateConfidence(profile, company.source_data_api, company.www_data, company.external_data, company.financial_data_3y);
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

    console.log(`[Stage 5] Completed: confidence=${confidenceScore}, missing=${missingSections.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        profile,
        overall_confidence_score: confidenceScore,
        used_sources: usedSources,
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
