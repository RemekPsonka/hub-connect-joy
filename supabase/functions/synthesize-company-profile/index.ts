import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// Company AI Profile - Tool Calling for reliable JSON
// ============================================

// Full schema definition for structured output
const profileToolSchema = {
  type: "function",
  function: {
    name: "save_company_profile",
    description: "Zapisz kompletny profil firmy ze wszystkimi sekcjami",
    parameters: {
      type: "object",
      properties: {
        // SEKCJA 1: Podstawowe informacje
        name: { type: "string", description: "Oficjalna nazwa firmy" },
        short_name: { type: "string", description: "Nazwa skrócona" },
        legal_form: { type: "string", description: "Forma prawna (sp. z o.o., S.A., itp.)" },
        industry: { type: "string", description: "Główna branża działalności" },
        sub_industries: { type: "array", items: { type: "string" }, description: "Specjalizacje i podkategorie" },
        description: { type: "string", description: "Zwięzły opis działalności firmy (2-4 zdania)" },
        tagline: { type: "string", description: "Motto lub hasło firmy" },
        year_founded: { type: "number", description: "Rok założenia" },
        founder_info: { type: "string", description: "Informacje o założycielu/założycielach" },
        founding_story: { type: "string", description: "Historia powstania firmy" },

        // SEKCJA 2: Historia i rozwój
        timeline: {
          type: "array",
          description: "Kluczowe wydarzenia w historii firmy",
          items: {
            type: "object",
            properties: {
              year: { type: "number" },
              event: { type: "string" },
              impact: { type: "string" }
            },
            required: ["year", "event"]
          }
        },
        mergers_acquisitions: {
          type: "array",
          description: "Fuzje i przejęcia",
          items: {
            type: "object",
            properties: {
              year: { type: "number" },
              type: { type: "string" },
              company: { type: "string" },
              details: { type: "string" }
            }
          }
        },

        // SEKCJA 3: Finanse
        revenue: {
          type: "object",
          description: "Aktualne przychody",
          properties: {
            amount: { type: "number" },
            year: { type: "number" },
            currency: { type: "string" }
          }
        },
        revenue_history: {
          type: "array",
          description: "Historia przychodów (ostatnie lata)",
          items: {
            type: "object",
            properties: {
              year: { type: "number" },
              amount: { type: "number" },
              growth_pct: { type: "number" }
            }
          }
        },
        financial_statements: {
          type: "array",
          description: "Kluczowe wskaźniki finansowe",
          items: {
            type: "object",
            properties: {
              year: { type: "number" },
              net_profit: { type: "number" },
              ebitda: { type: "number" },
              assets: { type: "number" }
            }
          }
        },
        employee_count: { type: "string", description: "Liczba pracowników (np. '50-100')" },
        company_size: { type: "string", description: "Rozmiar firmy (micro/small/medium/large)" },
        market_position: { type: "string", description: "Pozycja rynkowa (lider/challenger/niche)" },
        growth_rate: { type: "number", description: "Roczny wzrost w %" },

        // SEKCJA 4: Model biznesowy
        business_model: { type: "string", description: "Opis modelu biznesowego (B2B/B2C/SaaS/itp.)" },
        value_proposition: { type: "string", description: "Główna propozycja wartości dla klientów" },
        competitive_advantages: { type: "array", items: { type: "string" }, description: "Przewagi konkurencyjne" },
        competitive_differentiation: { type: "string", description: "Czym firma wyróżnia się od konkurencji" },

        // SEKCJA 5: Produkty i usługi
        products: {
          type: "array",
          description: "Lista produktów firmy",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              category: { type: "string" },
              description: { type: "string" },
              target_customer: { type: "string" }
            },
            required: ["name"]
          }
        },
        services: {
          type: "array",
          description: "Lista usług firmy",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              target: { type: "string" }
            },
            required: ["name"]
          }
        },
        flagship_products: { type: "array", items: { type: "string" }, description: "Flagowe produkty/usługi" },
        certifications: { type: "array", items: { type: "string" }, description: "Certyfikaty (ISO, itp.)" },
        awards: { type: "array", items: { type: "string" }, description: "Nagrody i wyróżnienia" },

        // SEKCJA 6: Marki i partnerstwa
        represented_brands: {
          type: "array",
          description: "Reprezentowane marki",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              type: { type: "string", enum: ["own", "represented", "distributed"] }
            }
          }
        },
        partnerships: { type: "array", items: { type: "string" }, description: "Partnerstwa strategiczne" },

        // SEKCJA 7: Lokalizacje
        locations: {
          type: "array",
          description: "Lokalizacje firmy",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["headquarters", "branch", "warehouse", "office"] },
              city: { type: "string" },
              address: { type: "string" },
              country: { type: "string" }
            }
          }
        },
        geographic_coverage: {
          type: "object",
          description: "Zasięg geograficzny działalności",
          properties: {
            poland_cities: { type: "array", items: { type: "string" } },
            poland_regions: { type: "array", items: { type: "string" } },
            international_countries: { type: "array", items: { type: "string" } }
          }
        },

        // SEKCJA 8: Klienci i projekty
        reference_projects: {
          type: "array",
          description: "Projekty referencyjne",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              client: { type: "string" },
              description: { type: "string" },
              year: { type: "number" },
              value: { type: "string" }
            }
          }
        },
        key_clients: {
          type: "array",
          description: "Kluczowi klienci",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              industry: { type: "string" },
              relationship_years: { type: "number" }
            }
          }
        },
        target_industries: { type: "array", items: { type: "string" }, description: "Branże docelowe" },

        // SEKCJA 9: Konkurencja
        main_competitors: {
          type: "array",
          description: "Główni konkurenci",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              strength: { type: "string" },
              weakness: { type: "string" }
            }
          }
        },
        market_challenges: { type: "array", items: { type: "string" }, description: "Wyzwania rynkowe" },

        // SEKCJA 10: Oferta
        offer_summary: { type: "string", description: "Podsumowanie oferty" },
        unique_selling_points: { type: "array", items: { type: "string" }, description: "Unikalne cechy oferty" },

        // SEKCJA 11: Czego szuka firma
        what_company_seeks: { type: "string", description: "Czego szuka firma (partnerzy, klienci, dostawcy)" },
        expansion_plans: { type: "string", description: "Plany rozwoju i ekspansji" },
        hiring_positions: { type: "array", items: { type: "string" }, description: "Poszukiwane stanowiska" },

        // SEKCJA 12: Możliwości współpracy
        collaboration_opportunities: {
          type: "array",
          description: "Możliwości współpracy",
          items: {
            type: "object",
            properties: {
              area: { type: "string" },
              description: { type: "string" },
              priority: { type: "string", enum: ["high", "medium", "low"] }
            }
          }
        },
        ideal_partner_profile: { type: "string", description: "Profil idealnego partnera biznesowego" },

        // SEKCJA 13: Zarząd i właściciele
        management: {
          type: "array",
          description: "Zarząd firmy",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              position: { type: "string" },
              source: { type: "string" },
              linkedin: { type: "string" }
            },
            required: ["name", "position"]
          }
        },
        shareholders: {
          type: "array",
          description: "Udziałowcy/akcjonariusze",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              ownership_percent: { type: "number" },
              type: { type: "string", enum: ["individual", "company", "fund"] }
            }
          }
        },

        // SEKCJA 14: Aktualności i sygnały
        recent_news: {
          type: "array",
          description: "Ostatnie wiadomości o firmie",
          items: {
            type: "object",
            properties: {
              date: { type: "string" },
              title: { type: "string" },
              summary: { type: "string" },
              source: { type: "string" },
              url: { type: "string" },
              sentiment: { type: "string", enum: ["positive", "neutral", "negative"] }
            }
          }
        },
        market_signals: {
          type: "array",
          description: "Sygnały rynkowe",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["expansion", "hiring", "investment", "partnership", "product_launch", "award"] },
              description: { type: "string" },
              date: { type: "string" }
            }
          }
        },
        sentiment: { type: "string", enum: ["positive", "neutral", "negative"], description: "Ogólny sentyment mediów" },

        // SEKCJA 15: CSR i zrównoważony rozwój
        csr_activities: {
          type: "array",
          description: "Aktywności CSR",
          items: {
            type: "object",
            properties: {
              area: { type: "string" },
              description: { type: "string" }
            }
          }
        },
        sustainability_initiatives: { type: "array", items: { type: "string" }, description: "Inicjatywy zrównoważonego rozwoju" },

        // SEKCJA 16: Dane rejestrowe
        nip: { type: "string", description: "NIP" },
        regon: { type: "string", description: "REGON" },
        krs: { type: "string", description: "KRS" },
        address: { type: "string", description: "Adres siedziby" },
        city: { type: "string", description: "Miasto" },
        postal_code: { type: "string", description: "Kod pocztowy" },
        country: { type: "string", description: "Kraj" },
        website: { type: "string", description: "Strona WWW" },
        phone: { type: "string", description: "Telefon" },
        email: { type: "string", description: "Email kontaktowy" },

        // Metadata
        confidence: { type: "string", enum: ["high", "medium", "low"], description: "Pewność danych" },
        analysis_notes: { type: "array", items: { type: "string" }, description: "Uwagi o jakości danych" }
      },
      required: ["name", "description"]
    }
  }
};

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
  const systemPrompt = `Jesteś ekspertem od analizy biznesowej firm. Twoim zadaniem jest stworzenie KOMPLETNEGO profilu firmy na podstawie dostarczonych danych.

ZASADY:
1. Wypełnij WSZYSTKIE pola dla których masz jakiekolwiek dane - im więcej, tym lepiej
2. Syntetyzuj dane z różnych źródeł - nie kopiuj surowych danych, ale twórz czytelne opisy
3. Rozwiąż konflikty danych: priorytet KRS > WWW > Perplexity
4. Użyj polskiego języka dla opisów

ŹRÓDŁA DANYCH I CO Z NICH WYCIĄGNĄĆ:
- KRS/CEIDG: name, legal_form, krs, nip, regon, address, management, shareholders, year_founded
- WWW (Firecrawl): products, services, brands, locations, projects, description, offer_summary
- External (Perplexity): recent_news, awards, market_signals, competitive_position, press mentions
- Finanse: revenue, revenue_history, financial_statements, employee_count, growth_rate

WAŻNE:
- Dla każdego pola tablicowego dodaj WSZYSTKIE znalezione elementy
- Dla management - każda osoba z KRS MUSI być wymieniona
- Dla products/services - wymień WSZYSTKIE znalezione na stronie WWW
- Dla news - dodaj WSZYSTKIE znalezione artykuły
- description powinien być syntezą 2-4 zdań opisujących firmę
- timeline - ułóż chronologicznie kluczowe wydarzenia

Użyj funkcji save_company_profile aby zapisać profil.`;

  const userPrompt = `Stwórz pełny profil firmy "${companyName}" na podstawie następujących danych:

=== DANE REJESTROWE (KRS/CEIDG) ===
${sourceData ? JSON.stringify(sourceData, null, 2) : 'Brak danych'}

=== DANE ZE STRONY WWW ===
${wwwData ? JSON.stringify(wwwData, null, 2) : 'Brak danych'}

=== DANE ZEWNĘTRZNE (Perplexity - newsy, kontrakty, rynek) ===
${externalData ? JSON.stringify(externalData, null, 2) : 'Brak danych'}

=== DANE FINANSOWE ===
${financialData ? JSON.stringify(financialData, null, 2) : 'Brak danych'}

=== NOTATKI WEWNĘTRZNE ===
${internalNotes || 'Brak notatek'}

Wypełnij profil jak najdokładniej - każde pole dla którego masz dane. Użyj funkcji save_company_profile.`;

  try {
    console.log(`[Lovable AI] Starting synthesis for: ${companyName}`);
    console.log(`[Lovable AI] Data available: source=${!!sourceData}, www=${!!wwwData}, external=${!!externalData}, financial=${!!financialData}`);

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
    console.log('[Lovable AI] Response received, parsing tool call...');

    // Extract profile from tool call
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== 'save_company_profile') {
      console.error('[Lovable AI] No tool call found in response');
      console.log('[Lovable AI] Raw response:', JSON.stringify(data, null, 2).substring(0, 1000));
      throw new Error('AI did not return structured profile');
    }

    const profile = JSON.parse(toolCall.function.arguments);
    
    console.log(`[Lovable AI] Profile parsed successfully with ${Object.keys(profile).length} fields`);
    console.log(`[Lovable AI] Key fields: name=${profile.name}, management=${profile.management?.length || 0}, products=${profile.products?.length || 0}`);

    return profile;

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

    // Synthesize profile with Tool Calling
    const profile = await synthesizeWithToolCalling(
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
    console.log(`[Stage 5] Profile has ${Object.keys(profile).length} fields`);

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
