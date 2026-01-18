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

// Check if logo URL is valid
async function isLogoValid(logoUrl: string): Promise<boolean> {
  try {
    const response = await fetch(logoUrl, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

// NIP validation helper
function isValidNIP(nip: string | null): boolean {
  if (!nip) return false;
  const cleaned = nip.replace(/[^0-9]/g, '');
  return cleaned.length === 10;
}

// Helper to scrape a single page with Firecrawl
async function scrapeWithFirecrawl(url: string, apiKey: string): Promise<{ url: string; content: string | null; title: string }> {
  try {
    console.log(`Scraping page: ${url}`);
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 2000
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        url,
        content: data.data?.markdown || null,
        title: data.data?.metadata?.title || url
      };
    }
    console.warn(`Scrape failed for ${url}: ${response.status}`);
    return { url, content: null, title: url };
  } catch (e) {
    console.warn(`Scrape error for ${url}:`, e);
    return { url, content: null, title: url };
  }
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
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Klucz API nie jest skonfigurowany' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('=== ENRICHING COMPANY DATA ===');
    console.log('Company:', company_name);
    console.log('Website:', website);
    console.log('Perplexity available:', !!PERPLEXITY_API_KEY);
    console.log('Firecrawl available:', !!FIRECRAWL_API_KEY);

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

    // ==========================================
    // PHASE 1: PERPLEXITY DEEP RESEARCH
    // ==========================================
    let perplexityInsights: string | null = null;
    let perplexityCitations: string[] = [];
    
    if (PERPLEXITY_API_KEY) {
      console.log('=== PHASE 1: PERPLEXITY DEEP RESEARCH ===');
      
      const perplexityQuery = `"${company_name}" firma Polska:
- profil działalności firmy i historia
- właściciele, zarząd, kluczowe osoby decyzyjne
- ostatnie inwestycje, projekty, realizacje
- opinie klientów i partnerów biznesowych
- pozycja rynkowa, główni konkurenci
- rekrutacja, otwarte stanowiska, kultura organizacyjna
- dane rejestrowe: NIP, REGON, KRS, adres
- branża, produkty, usługi, specjalizacja
- plany rozwoju, ekspansji, strategia`;

      try {
        const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
              { 
                role: 'system', 
                content: 'Jesteś ekspertem w analizie polskich firm. Dostarczaj szczegółowe, dokładne informacje z podaniem źródeł. Skup się na: działalności operacyjnej, zarządzie, produktach/usługach, pozycji rynkowej, aktualnych news.'
              },
              { role: 'user', content: perplexityQuery }
            ],
            search_recency_filter: 'year',
          }),
        });

        if (perplexityResponse.ok) {
          const perplexityData = await perplexityResponse.json();
          perplexityInsights = perplexityData.choices?.[0]?.message?.content || null;
          perplexityCitations = perplexityData.citations || [];
          console.log('Perplexity insights received, length:', perplexityInsights?.length || 0);
          console.log('Perplexity citations:', perplexityCitations.length);
        } else {
          console.warn('Perplexity request failed:', perplexityResponse.status);
          const errorText = await perplexityResponse.text();
          console.warn('Perplexity error:', errorText);
        }
      } catch (e) {
        console.warn('Perplexity error:', e);
      }
    } else {
      console.log('Perplexity not configured, skipping deep research');
    }

    // ==========================================
    // PHASE 2: FIRECRAWL MULTI-PAGE SCRAPING
    // ==========================================
    interface ScrapedPage {
      url: string;
      content: string | null;
      title: string;
    }
    
    let scrapedPages: ScrapedPage[] = [];
    let firecrawlSearchResults: Array<{ url: string; title: string; markdown?: string }> = [];
    
    if (FIRECRAWL_API_KEY && (website || domain)) {
      console.log('=== PHASE 2: FIRECRAWL MULTI-PAGE SCRAPING ===');
      
      const baseUrl = website?.startsWith('http') ? website : `https://${website || domain}`;
      
      // 2a. Map the website to discover all URLs
      let discoveredUrls: string[] = [];
      try {
        console.log('Mapping website:', baseUrl);
        const mapResponse = await fetch('https://api.firecrawl.dev/v1/map', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: baseUrl,
            limit: 50,
            search: 'o nas kontakt usługi oferta produkty kariera zespół zarząd o firmie realizacje projekty'
          }),
        });
        
        if (mapResponse.ok) {
          const mapData = await mapResponse.json();
          discoveredUrls = mapData.links || [];
          console.log(`Discovered ${discoveredUrls.length} URLs`);
        } else {
          console.warn('Map failed:', mapResponse.status);
        }
      } catch (e) {
        console.warn('Map error:', e);
      }
      
      // 2b. Select key pages to scrape
      const keyPagePatterns = [
        /o-nas|about|o-firmie|kim-jestesmy|historia/i,
        /kontakt|contact/i,
        /uslugi|services|oferta|offer/i,
        /produkty|products/i,
        /kariera|career|praca|jobs|rekrutacja/i,
        /zespol|team|zarzad|management|ludzie|people/i,
        /realizacje|projekty|projects|portfolio|case-study/i,
        /klienci|clients|partnerzy|partners/i,
      ];
      
      // Always include homepage
      const pagesToScrape: string[] = [baseUrl];
      
      // Add discovered URLs matching key patterns
      for (const url of discoveredUrls) {
        if (pagesToScrape.length >= 10) break;
        if (url === baseUrl) continue;
        
        const matchesPattern = keyPagePatterns.some(pattern => pattern.test(url));
        if (matchesPattern && !pagesToScrape.includes(url)) {
          pagesToScrape.push(url);
        }
      }
      
      console.log(`Selected ${pagesToScrape.length} pages to scrape:`, pagesToScrape);
      
      // 2c. Scrape pages in parallel (max 8)
      const scrapePromises = pagesToScrape.slice(0, 8).map(url => 
        scrapeWithFirecrawl(url, FIRECRAWL_API_KEY)
      );
      
      scrapedPages = await Promise.all(scrapePromises);
      const successfulScrapes = scrapedPages.filter(p => p.content).length;
      console.log(`Successfully scraped ${successfulScrapes}/${scrapedPages.length} pages`);
      
      // 2d. Additional search for external sources about the company
      try {
        console.log('Searching for additional external sources...');
        const searchQuery = `"${company_name}" Polska firma profil działalność opinie`;
        
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
          firecrawlSearchResults = searchData.data || [];
          console.log(`Found ${firecrawlSearchResults.length} external sources`);
        }
      } catch (e) {
        console.warn('External search error:', e);
      }
    } else {
      console.log('Firecrawl not configured or no website, skipping scraping');
    }

    // ==========================================
    // PHASE 3: AI SYNTHESIS WITH EXPANDED PROMPT
    // ==========================================
    console.log('=== PHASE 3: AI SYNTHESIS ===');
    
    const hasPerplexity = !!perplexityInsights;
    const hasScrapedContent = scrapedPages.some(p => p.content);
    const hasExternalSources = firecrawlSearchResults.length > 0;
    const hasAnyData = hasPerplexity || hasScrapedContent || hasExternalSources;
    
    console.log('Data sources:', {
      perplexity: hasPerplexity,
      scrapedPages: scrapedPages.filter(p => p.content).length,
      externalSources: firecrawlSearchResults.length
    });

    // Build comprehensive system prompt
    const systemPrompt = hasAnyData
      ? `Jesteś strategicznym analitykiem biznesowym specjalizującym się w analizie polskich firm.

🎯 CEL: Stwórz KOMPLEKSOWY profil firmy dla wewnętrznych agentów AI do matchowania kontaktów i znajdowania synergii biznesowych.

📊 MASZ DANE Z WIELU ŹRÓDEŁ:
${hasPerplexity ? '✅ Wyniki deep research z internetu (Perplexity)' : ''}
${hasScrapedContent ? '✅ Zawartość strony internetowej firmy (multi-page scraping)' : ''}
${hasExternalSources ? '✅ Dodatkowe źródła zewnętrzne' : ''}

📋 STRUKTURA ANALIZY:

1. PODSTAWOWE INFORMACJE
   - Oficjalna nazwa, forma prawna
   - Branża główna i subbranże
   - Pełny opis działalności (3-5 zdań)

2. MODEL BIZNESOWY I POZYCJA RYNKOWA
   - Jak firma zarabia pieniądze
   - Unikalna propozycja wartości (USP)
   - Pozycja względem konkurencji
   - Udział w rynku (jeśli znany)

3. PRODUKTY I USŁUGI (SZCZEGÓŁOWO!)
   - Lista wszystkich produktów z opisami
   - Lista wszystkich usług z opisami
   - Dla kogo są przeznaczone (target)
   - Flagowe projekty i realizacje

4. CO FIRMA OFERUJE (dla agentów matchujących)
   - Pełna oferta dla klientów
   - Oferta dla partnerów biznesowych
   - Unikalne kompetencje i przewagi
   - Certyfikaty, nagrody, wyróżnienia

5. CZEGO FIRMA SZUKA (KLUCZOWE dla matchowania!)
   - Jakiego typu klientów poszukuje
   - Jakiego typu partnerów szuka
   - Jakich dostawców potrzebuje
   - Otwarte rekrutacje - jakie stanowiska
   - Plany ekspansji i rozwoju
   - Wyzwania i problemy do rozwiązania

6. POTENCJAŁ WSPÓŁPRACY
   - Konkretne obszary możliwej współpracy
   - Profil idealnego partnera biznesowego
   - Potencjalne synergie

7. ZARZĄD I ORGANIZACJA
   - Imiona, nazwiska, stanowiska osób z zarządu
   - Właściciele (jeśli znani)
   - Wielkość firmy, liczba pracowników
   - Kultura organizacyjna

8. AKTUALNOŚCI I SYGNAŁY RYNKOWE
   - Ostatnie newsy o firmie
   - Ostatnie inwestycje i projekty
   - Sygnały: wzrost, problemy, zmiany strategiczne

9. DANE REJESTROWE
   - NIP, REGON, KRS (TYLKO jeśli znalezione w źródłach!)
   - Adres siedziby
   - Rok założenia

ZASADY:
- Podawaj TYLKO informacje znalezione w dostarczonych źródłach
- NIE WYMYŚLAJ danych rejestrowych (NIP, REGON, KRS)
- Dla każdej kluczowej informacji wskaż źródło
- Oceń pewność danych (high/medium/low)
- Skup się na informacjach przydatnych dla agentów matchujących

Zwróć JSON z następującą strukturą:`
      : `Jesteś ekspertem w analizie firm polskich.

⚠️ NIE MASZ dostępu do internetu ani baz danych.
Możesz TYLKO sugerować prawdopodobną branżę i profil na podstawie nazwy firmy.

ZASADY:
- Wszystko co podajesz to SUGESTIE, nie fakty
- NIE wymyślaj NIP, REGON, KRS, adresów, osób z zarządu

Zwróć JSON z następującą strukturą:`;

    const jsonStructure = `{
  "name": "Oficjalna nazwa firmy",
  "industry": "Branża główna",
  "sub_industries": ["Subbranże", "Specjalizacje"],
  "description": "Pełny opis działalności firmy (3-5 zdań)",
  
  "business_model": "Jak firma zarabia pieniądze",
  "value_proposition": "Unikalna propozycja wartości (USP)",
  "competitive_position": "Pozycja rynkowa vs konkurencja",
  "market_share_info": "Udział w rynku jeśli znany lub null",
  
  "core_activities": ["Główne obszary działalności"],
  "products": [
    {"name": "Nazwa produktu", "description": "Opis", "target": "Dla kogo"}
  ],
  "services": [
    {"name": "Nazwa usługi", "description": "Opis", "target": "Dla kogo"}
  ],
  "key_projects": ["Flagowe projekty, realizacje, inwestycje"],
  
  "offer_summary": "Pełna oferta firmy w 2-3 zdaniach",
  "unique_selling_points": ["Co wyróżnia firmę na rynku"],
  "certifications": ["Certyfikaty, nagrody, wyróżnienia"],
  "partnerships": ["Kluczowi partnerzy biznesowi"],
  
  "seeking_clients": "Jakiego typu klientów szuka firma",
  "seeking_partners": "Jakiego typu partnerów biznesowych szuka",
  "seeking_suppliers": "Jakich dostawców/podwykonawców potrzebuje lub null",
  "hiring_positions": ["Otwarte rekrutacje - stanowiska"],
  "expansion_plans": "Plany rozwoju, ekspansji lub null",
  "pain_points": ["Wyzwania, problemy do rozwiązania"],
  
  "collaboration_opportunities": [
    {"area": "Obszar współpracy", "description": "Opis możliwości", "fit_for": "Kto pasuje"}
  ],
  "ideal_partner_profile": "Profil idealnego partnera biznesowego",
  "synergy_potential": ["Obszary potencjalnych synergii"],
  
  "management": [
    {"name": "Imię Nazwisko", "position": "Stanowisko", "source": "URL źródła lub nazwa źródła"}
  ],
  "company_size": "mikro/mała/średnia/duża",
  "employee_count": "Liczba lub przedział lub null",
  "company_culture": "Kultura organizacyjna lub null",
  "founding_year": "Rok założenia lub null",
  "founding_story": "Historia powstania firmy lub null",
  
  "recent_news": [
    {"date": "YYYY-MM lub rok", "title": "Tytuł newsa", "summary": "Krótkie streszczenie", "source": "URL lub nazwa źródła"}
  ],
  "market_signals": ["Sygnały rynkowe: wzrost, problemy, zmiany"],
  "sentiment": "positive/neutral/negative",
  
  "legal_form": "Forma prawna (sp. z o.o., S.A., itp.) lub null",
  "nip": "NIP (10 cyfr, tylko jeśli znaleziony!) lub null",
  "regon": "REGON lub null",
  "krs": "KRS lub null",
  "address": "Adres siedziby lub null",
  "city": "Miasto lub null",
  "postal_code": "Kod pocztowy lub null",
  
  "confidence": "high/medium/low",
  "data_freshness": "Ocena aktualności danych",
  "sources": ["Lista URL źródeł"],
  "analysis_notes": ["Uwagi o jakości danych, brakujących informacjach"]
}`;

    // Build user content with all gathered data
    let userContent = `Przeprowadź KOMPLEKSOWĄ analizę strategiczną firmy:

Nazwa firmy: ${company_name}
${website ? `Strona www: ${website}` : ''}
${industry_hint ? `Wskazówka branżowa: ${industry_hint}` : ''}

`;

    if (hasPerplexity) {
      userContent += `
═══════════════════════════════════════════════════════════════════
📡 WYNIKI DEEP RESEARCH Z INTERNETU (Perplexity):
═══════════════════════════════════════════════════════════════════
${perplexityInsights}

${perplexityCitations.length > 0 ? `Źródła Perplexity:\n${perplexityCitations.map((c, i) => `[${i + 1}] ${c}`).join('\n')}` : ''}

`;
    }

    if (hasScrapedContent) {
      userContent += `
═══════════════════════════════════════════════════════════════════
🌐 ZAWARTOŚĆ STRONY INTERNETOWEJ FIRMY (multi-page scraping):
═══════════════════════════════════════════════════════════════════
`;
      for (const page of scrapedPages.filter(p => p.content)) {
        userContent += `
--- [${page.title}] ${page.url} ---
${page.content!.substring(0, 4000)}
`;
      }
    }

    if (hasExternalSources) {
      userContent += `
═══════════════════════════════════════════════════════════════════
📰 DODATKOWE ŹRÓDŁA ZEWNĘTRZNE:
═══════════════════════════════════════════════════════════════════
`;
      for (const source of firecrawlSearchResults) {
        userContent += `
--- [${source.title}] ${source.url} ---
${source.markdown?.substring(0, 2000) || '(brak treści)'}
`;
      }
    }

    userContent += `

${jsonStructure}

🎯 ZADANIE:
1. Przeanalizuj WSZYSTKIE dostarczone źródła
2. Wyodrębnij SZCZEGÓŁOWE informacje o produktach, usługach, ofercie
3. Określ CZEGO FIRMA SZUKA - to kluczowe dla matchowania!
4. Zidentyfikuj osoby z zarządu z podaniem źródeł
5. Oceń potencjał współpracy i możliwe synergie
6. Podaj TYLKO dane rejestrowe znalezione w źródłach`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        max_tokens: 8000,
        temperature: 0.2,
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
    console.log('AI synthesis completed');

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
      
      // Add metadata about the enrichment process
      enrichedData.enrichment_metadata = {
        perplexity_used: hasPerplexity,
        pages_scraped: scrapedPages.filter(p => p.content).length,
        external_sources: firecrawlSearchResults.length,
        perplexity_citations: perplexityCitations,
        analyzed_at: new Date().toISOString()
      };
      
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ error: 'Nie udało się przetworzyć danych firmy', raw: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to get logo if not found yet
    if (!logo_url) {
      const suggestedWebsite = enrichedData.suggested_website || website;
      if (suggestedWebsite) {
        const suggestedDomain = extractDomain(suggestedWebsite);
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
    }

    // Add logo_url to response
    enrichedData.logo_url = logo_url;

    console.log('=== ENRICHMENT COMPLETE ===');
    console.log('Company:', enrichedData.name);
    console.log('Confidence:', enrichedData.confidence);
    console.log('Sources:', enrichedData.sources?.length || 0);
    console.log('Products:', enrichedData.products?.length || 0);
    console.log('Services:', enrichedData.services?.length || 0);
    console.log('Management:', enrichedData.management?.length || 0);

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
