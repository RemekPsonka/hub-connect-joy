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
    
    const systemPrompt = hasSearchResults
      ? `Jesteś ekspertem w analizie firm polskich.

🔍 MASZ wyniki wyszukiwania internetowego dla tej firmy.
Przeanalizuj je i wyodrębnij ZWERYFIKOWANE informacje.

ZASADY:
- Podawaj TYLKO informacje znalezione w źródłach
- Każda informacja musi być potwierdzona źródłem
- Jeśli coś NIE wynika ze źródeł - nie wymyślaj, wpisz null

Zwróć JSON:
{
  "name": "Oficjalna nazwa firmy",
  "industry": "✅ Branża (ze źródeł)",
  "description": "✅ Opis działalności (ze źródeł)",
  "services": "✅ Usługi/produkty (ze źródeł)",
  "collaboration_areas": "✅ Obszary współpracy (ze źródeł)",
  "employee_count_estimate": "Szacunek lub null",
  "confidence": "high" lub "medium",
  "suggested_website": "URL strony jeśli znaleziono",
  "sources": ["lista URL źródeł"],
  "data_notes": ["Dane zweryfikowane online"]
}`
      : `Jesteś ekspertem w analizie firm polskich.

⚠️ NIE MASZ dostępu do internetu ani baz danych.
Możesz TYLKO sugerować prawdopodobną branżę na podstawie nazwy firmy.

ZASADY:
- Wszystko co podajesz to SUGESTIE, nie fakty
- Oznacz wszystko jako "💡 SUGESTIA:"
- NIE wymyślaj NIP, REGON, KRS, adresów

Zwróć JSON:
{
  "name": "Nazwa firmy",
  "industry": "💡 SUGESTIA: Prawdopodobna branża",
  "description": "💡 SUGESTIA: Prawdopodobny opis",
  "services": "💡 SUGESTIA: Prawdopodobne usługi",
  "collaboration_areas": "💡 SUGESTIA: Potencjalne obszary współpracy",
  "employee_count_estimate": null,
  "confidence": "low",
  "suggested_website": null,
  "sources": [],
  "data_notes": ["Wszystkie dane to SUGESTIE - wymaga weryfikacji"]
}`;

    const userContent = hasSearchResults
      ? `Przeanalizuj firmę na podstawie wyników wyszukiwania:

Nazwa firmy: ${company_name}
${website ? `Strona www: ${website}` : ''}
${industry_hint ? `Wskazówka: ${industry_hint}` : ''}

WYNIKI WYSZUKIWANIA:
${searchResults.map((r, i) => `
[Źródło ${i + 1}] ${r.url}
Tytuł: ${r.title}
${r.description ? `Opis: ${r.description}` : ''}
${r.markdown ? `Treść: ${r.markdown.substring(0, 1500)}` : ''}
---`).join('\n')}`
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
        max_tokens: 1500,
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
      
      // Always null out registration data - only real verification should provide these
      enrichedData.nip = null;
      enrichedData.regon = null;
      enrichedData.krs = null;
      enrichedData.address = null;
      enrichedData.postal_code = null;
      enrichedData.city = null;
      
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
