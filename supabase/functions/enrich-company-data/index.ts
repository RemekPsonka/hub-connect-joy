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
        waitFor: 3000
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
    // PHASE 1: PERPLEXITY INTERNET SEARCH (3 PARALLEL QUERIES)
    // ==========================================
    let perplexityProfileInsights: string | null = null;
    let perplexityNewsInsights: string | null = null;
    let perplexityRegistryInsights: string | null = null;
    let perplexityCitations: string[] = [];
    
    if (PERPLEXITY_API_KEY) {
      console.log('=== PHASE 1: PERPLEXITY INTERNET SEARCH (3 queries) ===');
      
      // QUERY 1: Profil firmy i działalność
      const profileQuery = `"${company_name}" Polska firma:
- profil działalności firmy, historia, rok założenia
- właściciele, zarząd, kluczowe osoby decyzyjne  
- główne produkty i usługi
- branża, specjalizacja, pozycja rynkowa
- wielkość firmy, liczba pracowników
- forma prawna, struktura właścicielska`;

      // QUERY 2: Newsy, aktualności, informacje prasowe
      const newsQuery = `"${company_name}" Polska aktualności newsy 2024 2025:
- artykuły prasowe, wywiady z zarządem
- inwestycje, przejęcia, fuzje, nowe projekty  
- otwarcia nowych lokalizacji, ekspansja
- nagrody, wyróżnienia, certyfikaty
- problemy, kontrowersje, zmiany
- rekrutacje, nowe stanowiska`;

      // QUERY 3: Dane rejestrowe i formalne
      const registryQuery = `"${company_name}" Polska NIP REGON KRS dane rejestrowe:
- numer NIP firmy
- numer REGON
- numer KRS  
- adres siedziby, miasto, kod pocztowy
- forma prawna (sp. z o.o., S.A., itp.)
- data rejestracji, rok założenia
- kapitał zakładowy`;

      const perplexityHeaders = {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      };

      // Execute all 3 queries in parallel
      const [profileResponse, newsResponse, registryResponse] = await Promise.all([
        // Profile query
        fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: perplexityHeaders,
          body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
              { 
                role: 'system', 
                content: 'Jesteś ekspertem w analizie polskich firm. Dostarczaj szczegółowe, dokładne informacje o profilu działalności firmy. Skup się na: czym firma się zajmuje, produkty, usługi, zarząd, historia.'
              },
              { role: 'user', content: profileQuery }
            ],
          }),
        }).catch(e => { console.warn('Profile query error:', e); return null; }),
        
        // News query
        fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: perplexityHeaders,
          body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
              { 
                role: 'system', 
                content: 'Jesteś dziennikarzem śledczym. Szukaj NAJNOWSZYCH artykułów prasowych, newsów i doniesień medialnych o firmie z ostatnich 2 lat. Podawaj źródła i daty.'
              },
              { role: 'user', content: newsQuery }
            ],
            search_recency_filter: 'year',
          }),
        }).catch(e => { console.warn('News query error:', e); return null; }),
        
        // Registry query
        fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: perplexityHeaders,
          body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
              { 
                role: 'system', 
                content: 'Szukaj OFICJALNYCH danych rejestrowych firmy z polskich rejestrów: KRS, CEIDG, GUS. Podawaj TYLKO zweryfikowane dane z oficjalnych źródeł. NIE wymyślaj numerów.'
              },
              { role: 'user', content: registryQuery }
            ],
          }),
        }).catch(e => { console.warn('Registry query error:', e); return null; }),
      ]);

      // Process profile response
      if (profileResponse?.ok) {
        try {
          const data = await profileResponse.json();
          perplexityProfileInsights = data.choices?.[0]?.message?.content || null;
          perplexityCitations = [...perplexityCitations, ...(data.citations || [])];
          console.log('Profile insights received, length:', perplexityProfileInsights?.length || 0);
        } catch (e) {
          console.warn('Error parsing profile response:', e);
        }
      } else if (profileResponse) {
        console.warn('Profile query failed:', profileResponse.status);
      }

      // Process news response
      if (newsResponse?.ok) {
        try {
          const data = await newsResponse.json();
          perplexityNewsInsights = data.choices?.[0]?.message?.content || null;
          perplexityCitations = [...perplexityCitations, ...(data.citations || [])];
          console.log('News insights received, length:', perplexityNewsInsights?.length || 0);
        } catch (e) {
          console.warn('Error parsing news response:', e);
        }
      } else if (newsResponse) {
        console.warn('News query failed:', newsResponse.status);
      }

      // Process registry response
      if (registryResponse?.ok) {
        try {
          const data = await registryResponse.json();
          perplexityRegistryInsights = data.choices?.[0]?.message?.content || null;
          perplexityCitations = [...perplexityCitations, ...(data.citations || [])];
          console.log('Registry insights received, length:', perplexityRegistryInsights?.length || 0);
        } catch (e) {
          console.warn('Error parsing registry response:', e);
        }
      } else if (registryResponse) {
        console.warn('Registry query failed:', registryResponse.status);
      }

      // Deduplicate citations
      perplexityCitations = [...new Set(perplexityCitations)];
      console.log('Total unique Perplexity citations:', perplexityCitations.length);
    } else {
      console.log('Perplexity not configured, skipping internet search');
    }

    // ==========================================
    // PHASE 2: FIRECRAWL COMPREHENSIVE WEBSITE SCRAPING
    // ==========================================
    interface ScrapedPage {
      url: string;
      content: string | null;
      title: string;
    }
    
    let scrapedPages: ScrapedPage[] = [];
    
    if (FIRECRAWL_API_KEY && (website || domain)) {
      console.log('=== PHASE 2: FIRECRAWL COMPREHENSIVE WEBSITE SCRAPING ===');
      
      const baseUrl = website?.startsWith('http') ? website : `https://${website || domain}`;
      
      // 2a. Map the website to discover all URLs (increased limit)
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
            limit: 100, // Increased from 50
            search: 'o nas kontakt usługi oferta produkty marki salony kariera zespół zarząd o firmie realizacje projekty historia poznaj-nas kierownictwo właściciele klienci referencje partnerzy cennik aktualności'
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
      
      // 2b. IMPROVED PAGE SELECTION - 3-level prioritization with exclusions
      
      // PRIORITY 1: Must-have pages (About, Contact, Brands)
      const priorityOnePatterns = [
        /o-nas|about|o-firmie|kim-jestesmy|historia|poznaj-nas|about-us/i,
        /kontakt|contact|lokalizacje|locations/i,
        /marki|brands|dealerstwa|salony|przedstawicielstwa/i,
      ];
      
      // PRIORITY 2: Offer and products
      const priorityTwoPatterns = [
        /oferta|offer|produkty|products|uslugi|services/i,
        /realizacje|projekty|projects|portfolio|case-study|referencje/i,
        /cennik|pricing|pakiety|packages/i,
        /dla-firm|dla-klientow|b2b|business/i,
      ];
      
      // PRIORITY 3: Team and careers
      const priorityThreePatterns = [
        /zespol|team|zarzad|management|ludzie|people|kierownictwo|zaloga/i,
        /kariera|career|praca|jobs|rekrutacja|dolacz|zatrudnienie/i,
        /klienci|clients|partnerzy|partners|wspolpraca/i,
        /aktualnosci|news|blog|wydarzenia|media/i,
      ];
      
      // EXCLUSIONS - do not scrape these
      const excludePatterns = [
        /promocj|promo|rabat|okazj|wyprzedaz|sale|przecena|gratisy/i,
        /regulamin|polityka|privacy|cookies|rodo|gdpr|terms/i,
        /blog\/\d|news\/\d|artykul\/\d|post\/\d/i, // Single blog posts
        /login|logowanie|rejestracja|register|koszyk|cart|checkout/i,
        /\.(pdf|jpg|jpeg|png|gif|doc|docx|xls|xlsx)$/i, // Files
        /page=|sort=|filter=|utm_/i, // Pagination and tracking params
      ];
      
      const pagesToScrape: string[] = [baseUrl]; // Always include homepage
      const usedUrls = new Set([baseUrl.toLowerCase()]);
      
      // Helper to check if URL should be excluded
      const shouldExclude = (url: string) => excludePatterns.some(p => p.test(url));
      const matchesPriority = (url: string, patterns: RegExp[]) => patterns.some(p => p.test(url));
      
      // Add Priority 1 pages
      for (const url of discoveredUrls) {
        if (usedUrls.has(url.toLowerCase())) continue;
        if (shouldExclude(url)) continue;
        if (matchesPriority(url, priorityOnePatterns)) {
          pagesToScrape.push(url);
          usedUrls.add(url.toLowerCase());
        }
      }
      console.log(`After Priority 1: ${pagesToScrape.length} pages`);
      
      // Add Priority 2 pages
      for (const url of discoveredUrls) {
        if (pagesToScrape.length >= 12) break;
        if (usedUrls.has(url.toLowerCase())) continue;
        if (shouldExclude(url)) continue;
        if (matchesPriority(url, priorityTwoPatterns)) {
          pagesToScrape.push(url);
          usedUrls.add(url.toLowerCase());
        }
      }
      console.log(`After Priority 2: ${pagesToScrape.length} pages`);
      
      // Add Priority 3 pages
      for (const url of discoveredUrls) {
        if (pagesToScrape.length >= 15) break;
        if (usedUrls.has(url.toLowerCase())) continue;
        if (shouldExclude(url)) continue;
        if (matchesPriority(url, priorityThreePatterns)) {
          pagesToScrape.push(url);
          usedUrls.add(url.toLowerCase());
        }
      }
      console.log(`After Priority 3: ${pagesToScrape.length} pages`);
      
      console.log('Pages selected for scraping:', pagesToScrape);
      
      // 2c. Scrape pages in parallel (max 15)
      const scrapePromises = pagesToScrape.slice(0, 15).map(url => 
        scrapeWithFirecrawl(url, FIRECRAWL_API_KEY)
      );
      
      scrapedPages = await Promise.all(scrapePromises);
      const successfulScrapes = scrapedPages.filter(p => p.content).length;
      console.log(`Successfully scraped ${successfulScrapes}/${scrapedPages.length} pages`);
      
      // Log which pages were scraped
      for (const page of scrapedPages) {
        console.log(`  - ${page.title}: ${page.content ? page.content.length + ' chars' : 'FAILED'}`);
      }
    } else {
      console.log('Firecrawl not configured or no website, skipping scraping');
    }

    // ==========================================
    // PHASE 3: AI SYNTHESIS WITH EXPANDED DATA
    // ==========================================
    console.log('=== PHASE 3: AI SYNTHESIS ===');
    
    const hasProfileInsights = !!perplexityProfileInsights;
    const hasNewsInsights = !!perplexityNewsInsights;
    const hasRegistryInsights = !!perplexityRegistryInsights;
    const hasPerplexity = hasProfileInsights || hasNewsInsights || hasRegistryInsights;
    const hasScrapedContent = scrapedPages.some(p => p.content);
    const hasAnyData = hasPerplexity || hasScrapedContent;
    
    console.log('Data sources:', {
      perplexityProfile: hasProfileInsights,
      perplexityNews: hasNewsInsights,
      perplexityRegistry: hasRegistryInsights,
      scrapedPages: scrapedPages.filter(p => p.content).length,
    });

    // Build comprehensive system prompt
    const systemPrompt = hasAnyData
      ? `Jesteś strategicznym analitykiem biznesowym specjalizującym się w analizie polskich firm.

🎯 CEL: Stwórz KOMPLEKSOWY profil firmy dla wewnętrznych agentów AI do matchowania kontaktów i znajdowania synergii biznesowych.

📊 MASZ DANE Z WIELU ŹRÓDEŁ:
${hasProfileInsights ? '✅ Profil firmy i działalność (z internetu)' : ''}
${hasNewsInsights ? '✅ Aktualności i newsy prasowe (z internetu)' : ''}
${hasRegistryInsights ? '✅ Dane rejestrowe (z internetu)' : ''}
${hasScrapedContent ? `✅ Zawartość strony WWW (${scrapedPages.filter(p => p.content).length} stron)` : ''}

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
   - Ostatnie newsy o firmie (z datami!)
   - Ostatnie inwestycje i projekty
   - Sygnały: wzrost, problemy, zmiany strategiczne

9. DANE REJESTROWE
   - NIP, REGON, KRS (TYLKO jeśli znalezione w źródłach!)
   - Adres siedziby
   - Rok założenia

ZASADY:
- Podawaj TYLKO informacje znalezione w dostarczonych źródłach
- NIE WYMYŚLAJ danych rejestrowych (NIP, REGON, KRS) - podawaj tylko jeśli są w źródłach
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

    // Add Perplexity Profile Insights
    if (hasProfileInsights) {
      userContent += `
═══════════════════════════════════════════════════════════════════
📊 PROFIL FIRMY I DZIAŁALNOŚĆ (z internetu - Perplexity):
═══════════════════════════════════════════════════════════════════
${perplexityProfileInsights}

`;
    }

    // Add Perplexity News Insights
    if (hasNewsInsights) {
      userContent += `
═══════════════════════════════════════════════════════════════════
📰 AKTUALNOŚCI I NEWSY PRASOWE (z internetu - Perplexity):
═══════════════════════════════════════════════════════════════════
${perplexityNewsInsights}

`;
    }

    // Add Perplexity Registry Insights
    if (hasRegistryInsights) {
      userContent += `
═══════════════════════════════════════════════════════════════════
📋 DANE REJESTROWE (z internetu - Perplexity):
═══════════════════════════════════════════════════════════════════
${perplexityRegistryInsights}

`;
    }

    // Add Perplexity Citations
    if (perplexityCitations.length > 0) {
      userContent += `
═══════════════════════════════════════════════════════════════════
🔗 ŹRÓDŁA PERPLEXITY:
═══════════════════════════════════════════════════════════════════
${perplexityCitations.map((c, i) => `[${i + 1}] ${c}`).join('\n')}

`;
    }

    // Add Scraped Website Content (with increased character limit)
    if (hasScrapedContent) {
      userContent += `
═══════════════════════════════════════════════════════════════════
🌐 ZAWARTOŚĆ STRONY INTERNETOWEJ FIRMY (multi-page scraping):
═══════════════════════════════════════════════════════════════════
`;
      for (const page of scrapedPages.filter(p => p.content)) {
        userContent += `
--- [${page.title}] ${page.url} ---
${page.content!.substring(0, 10000)}
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
5. Wyodrębnij WSZYSTKIE newsy i aktualności z datami
6. Oceń potencjał współpracy i możliwe synergie
7. Podaj TYLKO dane rejestrowe znalezione w źródłach - NIE WYMYŚLAJ`;

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
        max_tokens: 10000, // Increased from 8000
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
      // Remove markdown code blocks more aggressively
      let cleanedContent = content;
      
      // Handle various markdown formats: ```json, ```, with or without newlines
      cleanedContent = cleanedContent.replace(/^```(?:json)?\s*/i, '');
      cleanedContent = cleanedContent.replace(/\s*```\s*$/i, '');
      cleanedContent = cleanedContent.trim();
      
      // If content still has code blocks somewhere in middle, extract JSON
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedContent = jsonMatch[0];
      }
      
      // Try to parse - if JSON is truncated, try to fix it
      try {
        enrichedData = JSON.parse(cleanedContent);
      } catch (initialParseError) {
        console.warn('Initial parse failed, attempting to fix truncated JSON');
        
        // Count brackets to see if JSON is incomplete
        const openBraces = (cleanedContent.match(/\{/g) || []).length;
        const closeBraces = (cleanedContent.match(/\}/g) || []).length;
        const openBrackets = (cleanedContent.match(/\[/g) || []).length;
        const closeBrackets = (cleanedContent.match(/\]/g) || []).length;
        
        // Add missing closing brackets
        let fixedContent = cleanedContent;
        
        // Try to close incomplete strings
        if (fixedContent.match(/"[^"]*$/)) {
          fixedContent = fixedContent + '"';
        }
        
        // Close arrays
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          // Find last open array and close it
          fixedContent = fixedContent.replace(/,\s*$/, '') + ']';
        }
        
        // Close objects
        for (let i = 0; i < openBraces - closeBraces; i++) {
          fixedContent = fixedContent.replace(/,\s*$/, '') + '}';
        }
        
        console.log('Attempting to parse fixed content...');
        enrichedData = JSON.parse(fixedContent);
        console.log('Fixed JSON parse successful');
      }
      
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
        perplexity_profile_used: hasProfileInsights,
        perplexity_news_used: hasNewsInsights,
        perplexity_registry_used: hasRegistryInsights,
        pages_scraped: scrapedPages.filter(p => p.content).length,
        pages_scraped_urls: scrapedPages.filter(p => p.content).map(p => p.url),
        perplexity_citations: perplexityCitations,
        analyzed_at: new Date().toISOString()
      };
      
    } catch (parseError) {
      console.error('Failed to parse AI response after all attempts:', parseError);
      console.error('Content length:', content?.length);
      console.error('Content preview:', content?.substring(0, 500));
      return new Response(
        JSON.stringify({ error: 'Nie udało się przetworzyć danych firmy - odpowiedź AI jest niepełna lub uszkodzona' }),
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
    console.log('Recent News:', enrichedData.recent_news?.length || 0);

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
