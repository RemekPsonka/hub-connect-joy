import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to extract domain from URL
function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

// Generate logo URL using Clearbit
function getClearbitLogoUrl(domain: string | null): string | null {
  if (!domain) return null;
  return `https://logo.clearbit.com/${domain}`;
}

// Check if logo URL is valid (Clearbit returns 200 for existing logos)
async function isLogoValid(logoUrl: string): Promise<boolean> {
  try {
    const response = await fetch(logoUrl, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

interface FirecrawlSearchResult {
  url: string;
  title: string;
  description?: string;
  markdown?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authorization
    const authResult = await verifyAuth(req, supabase);
    if (isAuthError(authResult)) {
      return unauthorizedResponse(authResult, corsHeaders);
    }

    console.log(`[enrich-company-data] Authorized user: ${authResult.user.id}, tenant: ${authResult.tenantId}`);

    const { company_name, website, industry_hint } = await req.json();
    
    if (!company_name) {
      return new Response(
        JSON.stringify({ error: 'Nazwa firmy jest wymagana' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Klucz API nie jest skonfigurowany' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Enriching company data for:', company_name);

    // Step 1: Try to get logo from website domain
    let logo_url: string | null = null;
    const domain = extractDomain(website);
    
    if (domain) {
      const clearbitUrl = getClearbitLogoUrl(domain);
      if (clearbitUrl) {
        const isValid = await isLogoValid(clearbitUrl);
        if (isValid) {
          logo_url = clearbitUrl;
          console.log('Found logo via Clearbit:', logo_url);
        }
      }
    }

    // Step 2: Scrape company website directly (if available) + search for additional info
    let searchResults: FirecrawlSearchResult[] = [];
    let websiteContent: string | null = null;
    let searchPerformed = false;
    
    if (FIRECRAWL_API_KEY) {
      // 2a. First: Scrape the company website directly (most reliable source!)
      if (website || domain) {
        const urlToScrape = website?.startsWith('http') ? website : `https://${website || domain}`;
        console.log('Scraping company website directly:', urlToScrape);
        
        try {
          const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: urlToScrape,
              formats: ['markdown'],
              onlyMainContent: true,
              waitFor: 2000
            }),
          });
          
          if (scrapeResponse.ok) {
            const scrapeData = await scrapeResponse.json();
            websiteContent = scrapeData.data?.markdown || null;
            searchPerformed = true;
            console.log('Successfully scraped website, content length:', websiteContent?.length || 0);
            
            // Add website as first "search result" for AI analysis
            if (websiteContent) {
              searchResults.push({
                url: urlToScrape,
                title: `Strona główna ${company_name}`,
                markdown: websiteContent
              });
            }
          } else {
            console.warn('Website scrape failed:', scrapeResponse.status);
          }
        } catch (e) {
          console.warn('Website scrape error:', e);
        }
      }
      
      // 2b. Then: Search for additional info (using site: if we have domain)
      try {
        // Use site:domain to limit results to the company's website
        const searchQuery = domain 
          ? `site:${domain} ${company_name} "o nas" OR "o firmie" OR "usługi" OR "działalność"`
          : `"${company_name}" Polska firma profil działalność`;
        
        console.log('Firecrawl search query:', searchQuery);
        
        const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: searchQuery,
            limit: 5,
            scrapeOptions: { formats: ['markdown'] }
          }),
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const additionalResults = searchData.data || [];
          // Append to existing results (website scrape is first)
          searchResults = [...searchResults, ...additionalResults];
          searchPerformed = true;
          console.log(`Firecrawl search found ${additionalResults.length} additional results`);
        } else {
          console.warn('Firecrawl search failed:', searchResponse.status);
        }
      } catch (e) {
        console.warn('Firecrawl search error:', e);
      }
    } else {
      console.log('FIRECRAWL_API_KEY not configured, skipping web search');
    }
    
    console.log(`Total sources for AI analysis: ${searchResults.length}, website scraped: ${!!websiteContent}`);

    // Step 3: Analyze with AI (with or without Firecrawl results)
    const hasSearchResults = searchResults.length > 0;
    
    // NIP validation helper
    const isValidNIP = (nip: string | null): boolean => {
      if (!nip) return false;
      const cleaned = nip.replace(/[^0-9]/g, '');
      return cleaned.length === 10;
    };

    const systemPrompt = hasSearchResults
      ? `Jesteś ekspertem w dogłębnej analizie firm polskich.

🔍 MASZ wyniki wyszukiwania internetowego dla tej firmy.
Przeanalizuj je DOKŁADNIE i wyodrębnij WSZYSTKIE możliwe informacje.

📋 CO MUSISZ USTALIĆ:

1. CO DOKŁADNIE FIRMA ROBI?
   - Główna działalność i specjalizacja
   - Produkty i usługi - SZCZEGÓŁOWO
   - Realizowane projekty, inwestycje, klienci

2. CO FIRMA OFERUJE?
   - Pełna oferta dla klientów i partnerów
   - Unikalna propozycja wartości
   - Przewagi konkurencyjne

3. CZEGO FIRMA SZUKA?
   - Poszukiwani klienci, partnerzy, dostawcy
   - Rekrutacja - jakie stanowiska?
   - Kierunki rozwoju, ekspansji

4. KTO ZARZĄDZA FIRMĄ?
   - Zarząd: imiona, nazwiska, stanowiska
   - Właściciele
   - Kluczowe osoby decyzyjne

5. DANE REJESTROWE I KONTAKTOWE
   - NIP, REGON, KRS (jeśli znalezione)
   - Adres siedziby
   - Forma prawna, rok założenia

ZASADY:
- Podawaj TYLKO informacje znalezione w źródłach
- NIP/REGON/KRS podawaj TYLKO jeśli wyraźnie znalazłeś
- Dla zarządu podawaj źródło dla każdej osoby

Zwróć JSON:
{
  "name": "Oficjalna nazwa firmy ze źródeł",
  "industry": "Branża (ze źródeł)",
  "description": "Pełny opis działalności firmy (2-3 zdania)",
  
  "what_company_does": "SZCZEGÓŁOWY opis co firma robi: główna działalność, specjalizacja, realizowane projekty",
  "main_products_services": ["Lista głównych produktów/usług - każdy osobno"],
  "what_company_offers": "Co firma oferuje klientom i partnerom - pełna oferta",
  "what_company_seeks": "Czego firma szuka: klienci, partnerzy, dostawcy, pracownicy (jeśli rekrutuje)",
  "target_clients": "Kto jest docelowym klientem firmy",
  "competitive_advantage": "Co wyróżnia firmę na rynku",
  
  "management": [
    {"name": "Imię Nazwisko", "position": "Stanowisko", "source": "URL źródła"}
  ],
  "company_type": "Forma prawna (sp. z o.o., S.A., JDG, itp.)",
  "founding_year": "Rok założenia lub null",
  "employee_count_estimate": "Szacunek liczby pracowników lub null",
  
  "recent_news": "Ostatnie wiadomości, aktywności, projekty firmy",
  "company_culture": "Kultura firmy, wartości (jeśli znalezione)",
  
  "services": "Usługi/produkty - skrócona lista",
  "collaboration_areas": "Obszary możliwej współpracy",
  
  "nip": "NIP (10 cyfr) lub null",
  "regon": "REGON lub null",
  "krs": "KRS lub null",
  "address": "Adres siedziby lub null",
  "city": "Miasto lub null",
  "postal_code": "Kod pocztowy lub null",
  
  "confidence": "high/medium",
  "suggested_website": "URL strony firmy",
  "sources": ["lista URL źródeł"],
  "data_notes": ["Uwagi o jakości danych"]
}`
      : `Jesteś ekspertem w analizie firm polskich.

⚠️ NIE MASZ dostępu do internetu ani baz danych.
Możesz TYLKO sugerować prawdopodobną branżę i profil na podstawie nazwy firmy.

ZASADY:
- Wszystko co podajesz to SUGESTIE, nie fakty
- Oznacz wszystko jako "💡 SUGESTIA:"
- NIE wymyślaj NIP, REGON, KRS, adresów, osób z zarządu

Zwróć JSON:
{
  "name": "Nazwa firmy",
  "industry": "💡 SUGESTIA: Prawdopodobna branża",
  "description": "💡 SUGESTIA: Prawdopodobny opis działalności",
  
  "what_company_does": "💡 SUGESTIA: Co prawdopodobnie firma robi",
  "main_products_services": ["💡 SUGESTIA: Prawdopodobne usługi"],
  "what_company_offers": "💡 SUGESTIA: Prawdopodobna oferta",
  "what_company_seeks": null,
  "target_clients": "💡 SUGESTIA: Prawdopodobni klienci",
  "competitive_advantage": null,
  
  "management": [],
  "company_type": null,
  "founding_year": null,
  "employee_count_estimate": null,
  
  "recent_news": null,
  "company_culture": null,
  
  "services": "💡 SUGESTIA: Prawdopodobne usługi",
  "collaboration_areas": "💡 SUGESTIA: Potencjalne obszary współpracy",
  
  "nip": null,
  "regon": null,
  "krs": null,
  "address": null,
  "city": null,
  "postal_code": null,
  
  "confidence": "low",
  "suggested_website": null,
  "sources": [],
  "data_notes": ["Wszystkie dane to SUGESTIE - wymaga weryfikacji"]
}`;

    const userContent = hasSearchResults
      ? `Przeprowadź DOGŁĘBNĄ analizę firmy na podstawie wyników wyszukiwania:

Nazwa firmy: ${company_name}
${website ? `Strona www: ${website}` : ''}
${industry_hint ? `Wskazówka branżowa: ${industry_hint}` : ''}

📊 WYNIKI WYSZUKIWANIA DO ANALIZY:
${searchResults.map((r, i) => `
═══════════════════════════════════════
[ŹRÓDŁO ${i + 1}] ${r.url}
Tytuł: ${r.title}
${r.description ? `Opis: ${r.description}` : ''}
${r.markdown ? `TREŚĆ:\n${r.markdown.substring(0, 3000)}` : ''}
═══════════════════════════════════════`).join('\n')}

🎯 ZADANIE:
1. Ustal DOKŁADNIE co firma robi - jakie produkty/usługi
2. Zidentyfikuj co OFERUJE i czego SZUKA
3. Znajdź osoby z ZARZĄDU (z linkami źródłowymi)
4. Wyodrębnij dane rejestrowe (NIP, REGON, KRS, adres)
5. Oceń pozycję rynkową i przewagi konkurencyjne`
      : `Zasugeruj profil firmy (tylko sugestie!):

Nazwa firmy: ${company_name}
${website ? `Strona www: ${website}` : 'Strona www: Nie podano'}
${industry_hint ? `Wskazówka: ${industry_hint}` : ''}

UWAGA: NIE masz dostępu do internetu. Podaj tylko sugestie.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        max_tokens: 3000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Przekroczono limit zapytań, spróbuj ponownie za chwilę' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Brak środków na koncie AI, doładuj kredyty' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Błąd podczas analizy firmy' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI response received');

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'Brak odpowiedzi od AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON response
    let enrichedData;
    try {
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      enrichedData = JSON.parse(cleanedContent);
      
      // Validate and clean NIP format (should be 10 digits)
      if (enrichedData.nip) {
        const cleanedNip = enrichedData.nip.replace(/[^0-9]/g, '');
        enrichedData.nip = isValidNIP(cleanedNip) ? cleanedNip : null;
      }
      
      // Clean REGON (9 or 14 digits)
      if (enrichedData.regon) {
        const cleanedRegon = enrichedData.regon.replace(/[^0-9]/g, '');
        enrichedData.regon = (cleanedRegon.length === 9 || cleanedRegon.length === 14) ? cleanedRegon : null;
      }
      
      // Clean KRS (10 digits)
      if (enrichedData.krs) {
        const cleanedKrs = enrichedData.krs.replace(/[^0-9]/g, '');
        enrichedData.krs = cleanedKrs.length === 10 ? cleanedKrs : null;
      }
      
      // Add search info
      enrichedData.search_performed = searchPerformed;
      
      // Add search info
      enrichedData.search_performed = searchPerformed;
      
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ error: 'Nie udało się przetworzyć danych firmy', raw: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: If no logo yet and we found/AI suggested a website, try to get logo
    if (!logo_url && enrichedData.suggested_website) {
      const suggestedDomain = extractDomain(enrichedData.suggested_website);
      if (suggestedDomain) {
        const clearbitUrl = getClearbitLogoUrl(suggestedDomain);
        if (clearbitUrl) {
          const isValid = await isLogoValid(clearbitUrl);
          if (isValid) {
            logo_url = clearbitUrl;
            console.log('Found logo via suggested website:', logo_url);
          }
        }
      }
    }

    // Add logo_url to response
    enrichedData.logo_url = logo_url;

    console.log('Successfully enriched company data:', {
      name: enrichedData.name,
      confidence: enrichedData.confidence,
      search_performed: searchPerformed,
      sources_count: enrichedData.sources?.length || 0
    });

    return new Response(
      JSON.stringify({ success: true, data: enrichedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enrich-company-data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Nieznany błąd' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
