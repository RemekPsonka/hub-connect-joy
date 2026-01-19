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

// Extended ScrapedPage interface with categorization
interface ScrapedPage {
  url: string;
  content: string | null;
  html: string | null;
  title: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low' | 'none';
  word_count: number;
  metadata: {
    description?: string;
    sourceURL?: string;
    statusCode?: number;
  } | null;
}

interface ScrapingStats {
  total_urls_found: number;
  pages_scraped: number;
  successful_scrapes: number;
  total_words: number;
  categories_found: string[];
}

interface CategorizedContent {
  home: ScrapedPage[];
  about: ScrapedPage[];
  products: ScrapedPage[];
  portfolio: ScrapedPage[];
  brands: ScrapedPage[];
  locations: ScrapedPage[];
  team: ScrapedPage[];
  csr: ScrapedPage[];
  news: ScrapedPage[];
  contact: ScrapedPage[];
  careers: ScrapedPage[];
  other: ScrapedPage[];
}

// Priority pages with categories for intelligent URL matching
const priorityPagesConfig = {
  critical: {
    about: ['/o-nas', '/about-us', '/about', '/o-firmie', '/kim-jestesmy', '/poznaj-nas'],
    contact: ['/kontakt', '/contact', '/kontakt-do-nas'],
    brands: ['/marki', '/brands', '/dealerstwa', '/przedstawicielstwa']
  },
  high: {
    products: ['/oferta', '/produkty', '/products', '/services', '/uslugi', '/dla-firm', '/asortyment', '/katalog'],
    portfolio: ['/realizacje', '/projekty', '/projects', '/portfolio', '/case-studies', '/referencje', '/klienci-realizacje'],
    locations: ['/lokalizacje', '/oddzialy', '/locations', '/where-to-buy', '/salony', '/punkty-sprzedazy', '/gdzie-kupic']
  },
  medium: {
    about: ['/historia', '/history', '/o-nas/historia', '/misja', '/wizja', '/wartosci'],
    team: ['/zespol', '/team', '/zarzad', '/management', '/ludzie', '/kierownictwo', '/wlasciciele'],
    csr: ['/csr', '/odpowiedzialnosc-spoleczna', '/sustainability', '/ekologia', '/esg', '/spoleczna-odpowiedzialnosc']
  },
  low: {
    news: ['/aktualnosci', '/news', '/blog', '/wydarzenia', '/media', '/press'],
    careers: ['/kariera', '/praca', '/careers', '/rekrutacja', '/dolacz-do-nas', '/oferty-pracy'],
    contact: ['/kontakt/formularz', '/napisz-do-nas']
  }
};

// Function to match URL to category and priority
function matchUrlToCategory(url: string): { category: string; priority: 'critical' | 'high' | 'medium' | 'low' | 'none' } {
  try {
    const path = new URL(url).pathname.toLowerCase();
    
    for (const [priority, categories] of Object.entries(priorityPagesConfig)) {
      for (const [category, patterns] of Object.entries(categories as Record<string, string[]>)) {
        for (const pattern of patterns) {
          if (path.includes(pattern)) {
            return { category, priority: priority as 'critical' | 'high' | 'medium' | 'low' };
          }
        }
      }
    }
    
    // Fallback category detection from path
    if (path.includes('produkt') || path.includes('product') || path.includes('ofert')) return { category: 'products', priority: 'none' };
    if (path.includes('uslug') || path.includes('service')) return { category: 'products', priority: 'none' };
    if (path.includes('portfolio') || path.includes('realiz') || path.includes('projekt')) return { category: 'portfolio', priority: 'none' };
    if (path.includes('zespol') || path.includes('team') || path.includes('zarzad')) return { category: 'team', priority: 'none' };
    if (path.includes('lokal') || path.includes('oddzia') || path.includes('salon')) return { category: 'locations', priority: 'none' };
    if (path.includes('o-nas') || path.includes('about') || path.includes('histor')) return { category: 'about', priority: 'none' };
    if (path.includes('kontakt') || path.includes('contact')) return { category: 'contact', priority: 'none' };
    if (path.includes('news') || path.includes('aktual') || path.includes('blog')) return { category: 'news', priority: 'none' };
    if (path.includes('karier') || path.includes('prac') || path.includes('career')) return { category: 'careers', priority: 'none' };
    if (path.includes('marka') || path.includes('brand') || path.includes('dealer')) return { category: 'brands', priority: 'none' };
    if (path.includes('csr') || path.includes('ekolog') || path.includes('sustain')) return { category: 'csr', priority: 'none' };
    
    return { category: 'other', priority: 'none' };
  } catch {
    return { category: 'other', priority: 'none' };
  }
}

// Helper to scrape a single page with Firecrawl (with category and priority)
async function scrapeWithFirecrawl(
  url: string, 
  apiKey: string,
  category: string,
  priority: 'critical' | 'high' | 'medium' | 'low' | 'none'
): Promise<ScrapedPage> {
  try {
    console.log(`Scraping [${priority}] ${category}: ${url}`);
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        waitFor: 3000,
        timeout: 20000
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      const markdown = data.data?.markdown || '';
      return {
        url,
        content: markdown || null,
        html: data.data?.html || null,
        title: data.data?.metadata?.title || url,
        category,
        priority,
        word_count: markdown ? markdown.split(/\s+/).length : 0,
        metadata: data.data?.metadata ? {
          description: data.data.metadata.description,
          sourceURL: data.data.metadata.sourceURL,
          statusCode: data.data.metadata.statusCode
        } : null
      };
    }
    console.warn(`Scrape failed for ${url}: ${response.status}`);
    return { url, content: null, html: null, title: url, category, priority, word_count: 0, metadata: null };
  } catch (e) {
    console.warn(`Scrape error for ${url}:`, e);
    return { url, content: null, html: null, title: url, category, priority, word_count: 0, metadata: null };
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
    // PHASE 1: PERPLEXITY INTERNET SEARCH (6 PARALLEL QUERIES)
    // ==========================================
    let perplexityProfileInsights: string | null = null;
    let perplexityFinancialInsights: string | null = null;
    let perplexityLocationInsights: string | null = null;
    let perplexityProjectsInsights: string | null = null;
    let perplexityNewsInsights: string | null = null;
    let perplexityRegistryInsights: string | null = null;
    let perplexityCitations: string[] = [];
    
    if (PERPLEXITY_API_KEY) {
      console.log('=== PHASE 1: PERPLEXITY INTERNET SEARCH (6 queries) ===');
      
      // QUERY 1: Profil firmy i historia (ROZBUDOWANE)
      const profileQuery = `"${company_name}" Polska firma:
- rok założenia, założyciele, historia firmy
- timeline kamieni milowych (fuzje, przejęcia, ekspansje) z DATAMI
- profil działalności - dokładny opis czym się zajmuje
- produkty i usługi - KONKRETNA lista z opisami
- marki własne, dealerstwa - jakie marki reprezentuje/posiada
- model biznesowy - B2B/B2C, główne źródła przychodów
- co wyróżnia firmę od konkurencji`;

      const profileSystemMessage = `Jesteś ekspertem w analizie polskich firm z 20-letnim doświadczeniem.
Twoim zadaniem jest stworzenie SZCZEGÓŁOWEGO profilu historycznego i biznesowego firmy.

WYMAGANIA:
- Historia firmy - timeline od momentu założenia do dziś
- Kluczowe kamienie milowe z DATAMI
- Produkty i usługi - KONKRETNA lista z opisami
- Marki własne i dealerstwa
- Model biznesowy - jak zarabia

ZASADY:
- Podawaj DATY dla wszystkich wydarzeń
- Cytuj źródła (gazeta.pl, forbes.pl, firmowa strona)
- NIE wymyślaj - jeśli brak danych, napisz "brak informacji"
- Priorytetyzuj informacje z ostatnich 2 lat`;

      // QUERY 2: Dane finansowe i rynkowe (NOWE)
      const financialQuery = `"${company_name}" Polska przychody obroty zysk ranking zatrudnienie:
- przychody roczne w PLN (ostatnie 3 lata)
- dynamika wzrostu % rok do roku
- zysk netto (jeśli publiczny)
- liczba pracowników i jak się zmieniała
- pozycja w rankingach branżowych
- udział w rynku %`;

      const financialSystemMessage = `Jesteś analitykiem finansowym specjalizującym się w ocenie kondycji polskich firm.

SZUKAJ W:
- Biznes.interia.pl, forbes.pl, pulshr.pl - ranking firm
- Emis.com, dun.pl - bazy danych firm
- GUS, KRS - dane rejestrowe z przychodami
- Strona firmowa - raporty roczne, IR
- LinkedIn - wielkość zespołu

WYMAGANIA:
- Przychody (wartości w PLN + dynamika YoY)
- Wielkość zatrudnienia
- Pozycja w rankingach branżowych

ZASADY:
- Podawaj KONKRETNE liczby z rokiem
- Cytuj źródło dla każdej liczby
- Jeśli brak danych - napisz "brak danych publicznych"`;

      // QUERY 3: Lokalizacje i zasięg geograficzny (NOWE)
      const locationQuery = `"${company_name}" Polska siedziba oddziały fabryki salony lokalizacje:
- siedziba główna (pełny adres)
- oddziały regionalne (miasta, adresy)
- fabryki, zakłady produkcyjne
- centra dystrybucyjne, magazyny
- salony, punkty sprzedaży
- zasięg działania (województwa, kraje)`;

      const locationSystemMessage = `Jesteś ekspertem w geografii biznesowej i analizie sieci dystrybucji.

SZUKAJ:
- Siedziby głównej (dokładny adres)
- Oddziałów regionalnych
- Fabryk / zakładów produkcyjnych
- Salonów / punktów sprzedaży

WYMAGANIA:
- Dla każdej lokalizacji: miasto, ulica (jeśli znana), typ
- Zasięg geograficzny - w ilu województwach działa
- Ekspansja zagraniczna - jakie kraje

ZASADY:
- Podawaj DOKŁADNE adresy jeśli dostępne
- Grupuj po typach lokalizacji
- Cytuj źródła`;

      // QUERY 4: Klienci, projekty, konkurencja (NOWE)
      const projectsQuery = `"${company_name}" Polska klienci projekty realizacje konkurencja case study:
- kluczowi klienci (nazwy firm)
- flagowe projekty/realizacje (wartość, rok, klient)
- referencje i case studies
- główni konkurenci (nazwy firm)
- przewaga konkurencyjna`;

      const projectsSystemMessage = `Jesteś analitykiem konkurencji i badaczem case studies.

SZUKAJ W:
- Strona firmowa (portfolio, realizacje)
- Newsy o kontraktach/przetargach
- LinkedIn (posty o projektach)
- Branżowe portale

WYMAGANIA DLA PROJEKTÓW:
- Nazwa projektu, klient, wartość (PLN), rok, zakres

WYMAGANIA DLA KONKURENTÓW:
- Nazwy firm konkurencyjnych (min 3-5)
- Krótkie porównanie

ZASADY:
- Priorytetyzuj DUŻE projekty (> 1M PLN)
- Podawaj konkretne kwoty jeśli znane`;

      // QUERY 5: Newsy, CSR, sygnały rynkowe (ZMODYFIKOWANE)
      const newsQuery = `"${company_name}" Polska aktualności newsy 2024 2025 CSR ESG:
- artykuły prasowe (z datami!)
- inwestycje, plany rozwoju
- zmiany w zarządzie
- nagrody, certyfikaty
- kontrowersje, problemy
- działania CSR/ESG, fundacje, ekologia
- rekrutacje`;

      const newsSystemMessage = `Jesteś dziennikarzem śledczym i analitykiem trendów rynkowych.

SZUKAJ W:
- Rzeczpospolita, Forbes, Puls Biznesu
- Lokalne media, komunikaty prasowe
- LinkedIn

WYMAGANIA:
- Każdy news z DATĄ i ŹRÓDŁEM
- Sentiment: pozytywny/neutralny/negatywny
- CSR: darowizny, fundacje, ekologia

ZASADY:
- Cytuj tytuł artykułu i źródło
- NIE pomijaj negatywnych newsów
- Priorytetyzuj wydarzenia z ostatnich 3 miesięcy`;

      // QUERY 6: Dane rejestrowe (BEZ ZMIAN)
      const registryQuery = `"${company_name}" Polska NIP REGON KRS dane rejestrowe:
- numer NIP firmy
- numer REGON
- numer KRS  
- adres siedziby, miasto, kod pocztowy
- forma prawna (sp. z o.o., S.A., itp.)
- data rejestracji, rok założenia
- kapitał zakładowy`;

      const registrySystemMessage = `Szukaj OFICJALNYCH danych rejestrowych firmy z polskich rejestrów: KRS, CEIDG, GUS. Podawaj TYLKO zweryfikowane dane z oficjalnych źródeł. NIE wymyślaj numerów.`;

      const perplexityHeaders = {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      };

      // Execute all 6 queries in parallel
      const [
        profileResponse,
        financialResponse,
        locationResponse,
        projectsResponse,
        newsResponse,
        registryResponse
      ] = await Promise.all([
        // Query 1: Profile and History
        fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: perplexityHeaders,
          body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
              { role: 'system', content: profileSystemMessage },
              { role: 'user', content: profileQuery }
            ],
          }),
        }).catch(e => { console.warn('Profile query error:', e); return null; }),
        
        // Query 2: Financial Data (NEW)
        fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: perplexityHeaders,
          body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
              { role: 'system', content: financialSystemMessage },
              { role: 'user', content: financialQuery }
            ],
          }),
        }).catch(e => { console.warn('Financial query error:', e); return null; }),
        
        // Query 3: Locations (NEW)
        fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: perplexityHeaders,
          body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
              { role: 'system', content: locationSystemMessage },
              { role: 'user', content: locationQuery }
            ],
          }),
        }).catch(e => { console.warn('Location query error:', e); return null; }),
        
        // Query 4: Clients, Projects, Competition (NEW)
        fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: perplexityHeaders,
          body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
              { role: 'system', content: projectsSystemMessage },
              { role: 'user', content: projectsQuery }
            ],
          }),
        }).catch(e => { console.warn('Projects query error:', e); return null; }),
        
        // Query 5: News and CSR
        fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: perplexityHeaders,
          body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
              { role: 'system', content: newsSystemMessage },
              { role: 'user', content: newsQuery }
            ],
            search_recency_filter: 'year',
          }),
        }).catch(e => { console.warn('News query error:', e); return null; }),
        
        // Query 6: Registry data
        fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: perplexityHeaders,
          body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
              { role: 'system', content: registrySystemMessage },
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

      // Process financial response (NEW)
      if (financialResponse?.ok) {
        try {
          const data = await financialResponse.json();
          perplexityFinancialInsights = data.choices?.[0]?.message?.content || null;
          perplexityCitations = [...perplexityCitations, ...(data.citations || [])];
          console.log('Financial insights received, length:', perplexityFinancialInsights?.length || 0);
        } catch (e) {
          console.warn('Error parsing financial response:', e);
        }
      } else if (financialResponse) {
        console.warn('Financial query failed:', financialResponse.status);
      }

      // Process location response (NEW)
      if (locationResponse?.ok) {
        try {
          const data = await locationResponse.json();
          perplexityLocationInsights = data.choices?.[0]?.message?.content || null;
          perplexityCitations = [...perplexityCitations, ...(data.citations || [])];
          console.log('Location insights received, length:', perplexityLocationInsights?.length || 0);
        } catch (e) {
          console.warn('Error parsing location response:', e);
        }
      } else if (locationResponse) {
        console.warn('Location query failed:', locationResponse.status);
      }

      // Process projects response (NEW)
      if (projectsResponse?.ok) {
        try {
          const data = await projectsResponse.json();
          perplexityProjectsInsights = data.choices?.[0]?.message?.content || null;
          perplexityCitations = [...perplexityCitations, ...(data.citations || [])];
          console.log('Projects insights received, length:', perplexityProjectsInsights?.length || 0);
        } catch (e) {
          console.warn('Error parsing projects response:', e);
        }
      } else if (projectsResponse) {
        console.warn('Projects query failed:', projectsResponse.status);
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
    // PHASE 2: FIRECRAWL COMPREHENSIVE WEBSITE SCRAPING WITH CATEGORIZATION
    // ==========================================
    
    let scrapedPages: ScrapedPage[] = [];
    let scrapingStats: ScrapingStats = {
      total_urls_found: 0,
      pages_scraped: 0,
      successful_scrapes: 0,
      total_words: 0,
      categories_found: []
    };
    let categorizedContent: CategorizedContent = {
      home: [],
      about: [],
      products: [],
      portfolio: [],
      brands: [],
      locations: [],
      team: [],
      csr: [],
      news: [],
      contact: [],
      careers: [],
      other: []
    };
    
    if (FIRECRAWL_API_KEY && (website || domain)) {
      console.log('=== PHASE 2: FIRECRAWL COMPREHENSIVE WEBSITE SCRAPING ===');
      
      const baseUrl = website?.startsWith('http') ? website : `https://${website || domain}`;
      
      // 2a. Map the website to discover all URLs (up to 100)
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
            limit: 100,
            search: 'o nas, oferta, produkty, usługi, realizacje, portfolio, zespół, kontakt, historia, marki, lokalizacje, oddziały, csr, kariera, cennik, partnerzy, klienci, zarzad, kierownictwo'
          }),
        });
        
        if (mapResponse.ok) {
          const mapData = await mapResponse.json();
          discoveredUrls = mapData.links || [];
          scrapingStats.total_urls_found = discoveredUrls.length;
          console.log(`Discovered ${discoveredUrls.length} URLs from website map`);
        } else {
          console.warn('Map failed:', mapResponse.status);
        }
      } catch (e) {
        console.warn('Map error:', e);
      }
      
      // 2b. INTELLIGENT URL PRIORITIZATION WITH CATEGORIES
      
      // EXCLUSIONS - do not scrape these
      const excludePatterns = [
        /promocj|promo|rabat|okazj|wyprzedaz|sale|przecena|gratisy/i,
        /regulamin|polityka|privacy|cookies|rodo|gdpr|terms/i,
        /blog\/\d|news\/\d|artykul\/\d|post\/\d/i,
        /login|logowanie|rejestracja|register|koszyk|cart|checkout/i,
        /\.(pdf|jpg|jpeg|png|gif|doc|docx|xls|xlsx)$/i,
        /page=|sort=|filter=|utm_|#/i,
        /\?/i, // Skip URLs with query params
      ];
      
      const shouldExclude = (url: string) => excludePatterns.some(p => p.test(url));
      
      // Build prioritized URL list with categories
      interface PrioritizedUrl {
        url: string;
        category: string;
        priority: 'critical' | 'high' | 'medium' | 'low' | 'none';
      }
      
      const prioritizedUrls: PrioritizedUrl[] = [];
      const usedUrls = new Set<string>();
      
      // Always add base URL as 'home' with critical priority
      prioritizedUrls.push({ url: baseUrl, category: 'home', priority: 'critical' });
      usedUrls.add(baseUrl.toLowerCase());
      
      // Process discovered URLs and assign categories
      for (const url of discoveredUrls) {
        const urlLower = url.toLowerCase();
        if (usedUrls.has(urlLower)) continue;
        if (shouldExclude(url)) continue;
        
        const { category, priority } = matchUrlToCategory(url);
        prioritizedUrls.push({ url, category, priority });
        usedUrls.add(urlLower);
      }
      
      // Sort by priority (critical > high > medium > low > none)
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
      prioritizedUrls.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      
      // Limit to 20 pages for scraping
      const urlsToScrape = prioritizedUrls.slice(0, 20);
      
      console.log('=== PAGES TO SCRAPE (by priority) ===');
      urlsToScrape.forEach(p => console.log(`  [${p.priority}] ${p.category}: ${p.url}`));
      
      // 2c. SEQUENTIAL SCRAPING with rate limiting (500ms delay)
      scrapedPages = [];
      for (let i = 0; i < urlsToScrape.length; i++) {
        const { url, category, priority } = urlsToScrape[i];
        
        const page = await scrapeWithFirecrawl(url, FIRECRAWL_API_KEY, category, priority);
        scrapedPages.push(page);
        
        // Rate limiting - wait 500ms between requests (except for last one)
        if (i < urlsToScrape.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // 2d. Calculate stats and categorize content
      const successfulScrapes = scrapedPages.filter(p => p.content).length;
      const totalWords = scrapedPages.reduce((sum, p) => sum + p.word_count, 0);
      
      console.log(`=== SCRAPING COMPLETE ===`);
      console.log(`Successfully scraped ${successfulScrapes}/${scrapedPages.length} pages`);
      console.log(`Total words collected: ${totalWords}`);
      
      // Group scraped pages by category
      for (const page of scrapedPages) {
        const cat = page.category as keyof CategorizedContent;
        if (categorizedContent[cat]) {
          categorizedContent[cat].push(page);
        } else {
          categorizedContent.other.push(page);
        }
      }
      
      // Update scraping stats
      scrapingStats = {
        total_urls_found: discoveredUrls.length,
        pages_scraped: scrapedPages.length,
        successful_scrapes: successfulScrapes,
        total_words: totalWords,
        categories_found: Object.keys(categorizedContent).filter(
          k => categorizedContent[k as keyof CategorizedContent].length > 0
        )
      };
      
      // Log category summary
      console.log('=== CATEGORY SUMMARY ===');
      for (const [category, pages] of Object.entries(categorizedContent)) {
        if (pages.length > 0) {
          const words = (pages as ScrapedPage[]).reduce((sum: number, p: ScrapedPage) => sum + p.word_count, 0);
          console.log(`  ${category}: ${pages.length} pages, ${words} words`);
        }
      }
      
      // Log individual pages
      for (const page of scrapedPages) {
        console.log(`  - [${page.priority}] ${page.category} | ${page.title}: ${page.content ? page.word_count + ' words' : 'FAILED'}`);
      }
    } else {
      console.log('Firecrawl not configured or no website, skipping scraping');
    }

    // ==========================================
    // PHASE 3: AI SYNTHESIS WITH EXPANDED DATA
    // ==========================================
    console.log('=== PHASE 3: AI SYNTHESIS ===');
    
    const hasProfileInsights = !!perplexityProfileInsights;
    const hasFinancialInsights = !!perplexityFinancialInsights;
    const hasLocationInsights = !!perplexityLocationInsights;
    const hasProjectsInsights = !!perplexityProjectsInsights;
    const hasNewsInsights = !!perplexityNewsInsights;
    const hasRegistryInsights = !!perplexityRegistryInsights;
    const hasPerplexity = hasProfileInsights || hasFinancialInsights || hasLocationInsights || hasProjectsInsights || hasNewsInsights || hasRegistryInsights;
    const hasScrapedContent = scrapedPages.some(p => p.content);
    const hasAnyData = hasPerplexity || hasScrapedContent;
    
    console.log('Data sources:', {
      perplexityProfile: hasProfileInsights,
      perplexityFinancial: hasFinancialInsights,
      perplexityLocation: hasLocationInsights,
      perplexityProjects: hasProjectsInsights,
      perplexityNews: hasNewsInsights,
      perplexityRegistry: hasRegistryInsights,
      scrapedPages: scrapedPages.filter(p => p.content).length,
    });

    // Build comprehensive system prompt
    const systemPrompt = hasAnyData
      ? `Jesteś strategicznym analitykiem biznesowym specjalizującym się w analizie polskich firm.

🎯 CEL: Stwórz KOMPLEKSOWY profil firmy dla wewnętrznych agentów AI do matchowania kontaktów i znajdowania synergii biznesowych.

📊 MASZ DANE Z WIELU ŹRÓDEŁ:
${hasProfileInsights ? '✅ Profil firmy, historia i działalność (z internetu)' : ''}
${hasFinancialInsights ? '✅ Dane finansowe i rynkowe (z internetu)' : ''}
${hasLocationInsights ? '✅ Lokalizacje i zasięg geograficzny (z internetu)' : ''}
${hasProjectsInsights ? '✅ Klienci, projekty i konkurencja (z internetu)' : ''}
${hasNewsInsights ? '✅ Aktualności, newsy i CSR (z internetu)' : ''}
${hasRegistryInsights ? '✅ Dane rejestrowe (z internetu)' : ''}
${hasScrapedContent ? `✅ Zawartość strony WWW (${scrapedPages.filter(p => p.content).length} stron)` : ''}

📋 STRUKTURA ANALIZY (14 SEKCJI):

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
   - Marki własne i dealerstwa

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

10. DANE FINANSOWE I RYNKOWE
    - Przychody (kwoty PLN + dynamika YoY)
    - Zatrudnienie (liczba + trend)
    - Pozycja w rankingach branżowych
    - Udział w rynku

11. LOKALIZACJE I ZASIĘG
    - Siedziba główna (pełny adres)
    - Oddziały, fabryki, salony (lista z miastami)
    - Zasięg geograficzny (województwa, kraje)

12. KLUCZOWI KLIENCI I PROJEKTY
    - Top 5 klientów (nazwy firm)
    - Flagowe projekty (nazwa, wartość, rok, klient)
    - Referencje i case studies

13. KONKURENCJA
    - Główni konkurenci (nazwy firm)
    - Pozycja vs konkurencja
    - Przewaga konkurencyjna

14. CSR/ESG
    - Działania społeczne, fundacje
    - Polityka środowiskowa
    - Certyfikaty ESG

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
  "brands_owned": ["Marki własne firmy"],
  "brands_represented": ["Marki reprezentowane/dealerstwa"],
  "key_projects": ["Flagowe projekty - krótki opis tekstowy"],
  
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
  
  "revenue_data": [
    {"year": 2024, "value_pln": 2500000000, "source": "Forbes/nazwa źródła"}
  ],
  "revenue_growth_yoy": "Dynamika wzrostu % YoY lub null",
  "profit_info": "Informacje o zysku lub null",
  "employee_count_history": [
    {"year": 2024, "count": 1200}
  ],
  "ranking_positions": [
    {"ranking": "Nazwa rankingu", "position": 150, "year": 2024, "source": "źródło"}
  ],
  "market_share_percent": "Udział w rynku % lub null",
  
  "headquarters_address": "Pełny adres siedziby głównej lub null",
  "locations": [
    {"type": "oddział/fabryka/salon/magazyn", "city": "Miasto", "address": "Adres jeśli znany", "region": "Województwo"}
  ],
  "geographic_reach": {
    "provinces": ["Lista województw"],
    "countries": ["Lista krajów"],
    "delivery_range": "Zasięg dostaw/obsługi"
  },
  
  "key_clients": [
    {"name": "Nazwa firmy klienta", "industry": "Branża klienta", "relationship": "Typ relacji"}
  ],
  "flagship_projects": [
    {
      "name": "Nazwa projektu",
      "client": "Nazwa klienta",
      "value_pln": 10000000,
      "year": 2024,
      "scope": "Zakres projektu",
      "source": "Źródło informacji"
    }
  ],
  "case_studies": ["Linki lub opisy case studies"],
  "references": ["Referencje od klientów"],
  
  "competitors": [
    {"name": "Nazwa konkurenta", "size": "mała/średnia/duża", "comparison": "Krótkie porównanie"}
  ],
  "competitive_advantage": "Główna przewaga konkurencyjna",
  "market_position_vs_competitors": "Pozycja vs główni konkurenci",
  
  "csr_activities": ["Lista działań CSR"],
  "esg_certifications": ["Certyfikaty ESG"],
  "sustainability_initiatives": ["Inicjatywy zrównoważonego rozwoju"],
  "foundations_supported": ["Wspierane fundacje"],
  "community_engagement": "Zaangażowanie w lokalną społeczność lub null",
  
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
📊 PROFIL FIRMY, HISTORIA I DZIAŁALNOŚĆ (Perplexity):
═══════════════════════════════════════════════════════════════════
${perplexityProfileInsights}

`;
    }

    // Add Perplexity Financial Insights (NEW)
    if (hasFinancialInsights) {
      userContent += `
═══════════════════════════════════════════════════════════════════
💰 DANE FINANSOWE I RYNKOWE (Perplexity):
═══════════════════════════════════════════════════════════════════
${perplexityFinancialInsights}

`;
    }

    // Add Perplexity Location Insights (NEW)
    if (hasLocationInsights) {
      userContent += `
═══════════════════════════════════════════════════════════════════
📍 LOKALIZACJE I ZASIĘG GEOGRAFICZNY (Perplexity):
═══════════════════════════════════════════════════════════════════
${perplexityLocationInsights}

`;
    }

    // Add Perplexity Projects Insights (NEW)
    if (hasProjectsInsights) {
      userContent += `
═══════════════════════════════════════════════════════════════════
🏗️ KLIENCI, PROJEKTY, KONKURENCJA (Perplexity):
═══════════════════════════════════════════════════════════════════
${perplexityProjectsInsights}

`;
    }

    // Add Perplexity News Insights
    if (hasNewsInsights) {
      userContent += `
═══════════════════════════════════════════════════════════════════
📰 AKTUALNOŚCI, NEWSY I CSR (Perplexity):
═══════════════════════════════════════════════════════════════════
${perplexityNewsInsights}

`;
    }

    // Add Perplexity Registry Insights
    if (hasRegistryInsights) {
      userContent += `
═══════════════════════════════════════════════════════════════════
📋 DANE REJESTROWE (Perplexity):
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

    // Add Scraped Website Content - CATEGORIZED
    if (hasScrapedContent) {
      userContent += `
═══════════════════════════════════════════════════════════════════
🌐 ZAWARTOŚĆ STRONY INTERNETOWEJ FIRMY (${scrapingStats.successful_scrapes} stron, ${scrapingStats.total_words} słów):
═══════════════════════════════════════════════════════════════════
`;
      
      // Helper to add category section
      const addCategorySection = (emoji: string, title: string, pages: ScrapedPage[]) => {
        const pagesWithContent = pages.filter(p => p.content);
        if (pagesWithContent.length === 0) return;
        
        const totalWords = pagesWithContent.reduce((sum, p) => sum + p.word_count, 0);
        userContent += `
--- ${emoji} ${title} (${pagesWithContent.length} stron, ${totalWords} słów) ---
`;
        for (const page of pagesWithContent) {
          userContent += `
📄 [${page.title}] ${page.url}
${page.content!.substring(0, 8000)}
`;
        }
      };
      
      // Add content by category (prioritized order)
      addCategorySection('🏠', 'STRONA GŁÓWNA', categorizedContent.home);
      addCategorySection('📋', 'O FIRMIE', categorizedContent.about);
      addCategorySection('🛒', 'PRODUKTY I USŁUGI', categorizedContent.products);
      addCategorySection('🏗️', 'REALIZACJE I PORTFOLIO', categorizedContent.portfolio);
      addCategorySection('🏷️', 'MARKI I DEALERSTWA', categorizedContent.brands);
      addCategorySection('📍', 'LOKALIZACJE', categorizedContent.locations);
      addCategorySection('👥', 'ZESPÓŁ I ZARZĄD', categorizedContent.team);
      addCategorySection('🌱', 'CSR I EKOLOGIA', categorizedContent.csr);
      addCategorySection('📰', 'AKTUALNOŚCI', categorizedContent.news);
      addCategorySection('💼', 'KARIERA', categorizedContent.careers);
      addCategorySection('📄', 'INNE', categorizedContent.other);
      addCategorySection('📞', 'KONTAKT', categorizedContent.contact);
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
7. Uzupełnij dane finansowe (przychody, zatrudnienie, rankingi)
8. Zmapuj lokalizacje (siedziby, oddziały, salony)
9. Zidentyfikuj kluczowych klientów i flagowe projekty
10. Zidentyfikuj konkurentów i przewagi konkurencyjne
11. Wyodrębnij działania CSR/ESG
12. Podaj TYLKO dane rejestrowe znalezione w źródłach - NIE WYMYŚLAJ`;

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
        max_tokens: 12000,
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
      
      cleanedContent = cleanedContent.replace(/^```(?:json)?\s*/i, '');
      cleanedContent = cleanedContent.replace(/\s*```\s*$/i, '');
      cleanedContent = cleanedContent.trim();
      
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedContent = jsonMatch[0];
      }
      
      try {
        enrichedData = JSON.parse(cleanedContent);
      } catch (initialParseError) {
        console.warn('Initial parse failed, attempting to fix truncated JSON');
        
        const openBraces = (cleanedContent.match(/\{/g) || []).length;
        const closeBraces = (cleanedContent.match(/\}/g) || []).length;
        const openBrackets = (cleanedContent.match(/\[/g) || []).length;
        const closeBrackets = (cleanedContent.match(/\]/g) || []).length;
        
        let fixedContent = cleanedContent;
        
        if (fixedContent.match(/"[^"]*$/)) {
          fixedContent = fixedContent + '"';
        }
        
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          fixedContent = fixedContent.replace(/,\s*$/, '') + ']';
        }
        
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
      
      // Add metadata about the enrichment process (with extended scraping stats)
      enrichedData.enrichment_metadata = {
        perplexity_profile_used: hasProfileInsights,
        perplexity_financial_used: hasFinancialInsights,
        perplexity_location_used: hasLocationInsights,
        perplexity_projects_used: hasProjectsInsights,
        perplexity_news_used: hasNewsInsights,
        perplexity_registry_used: hasRegistryInsights,
        scraping_stats: {
          total_urls_found: scrapingStats.total_urls_found,
          pages_scraped: scrapingStats.pages_scraped,
          successful_scrapes: scrapingStats.successful_scrapes,
          total_words: scrapingStats.total_words,
          categories_found: scrapingStats.categories_found
        },
        pages_scraped_urls: scrapedPages.filter(p => p.content).map(p => ({
          url: p.url,
          category: p.category,
          priority: p.priority,
          word_count: p.word_count
        })),
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
    console.log('Key Clients:', enrichedData.key_clients?.length || 0);
    console.log('Flagship Projects:', enrichedData.flagship_projects?.length || 0);
    console.log('Competitors:', enrichedData.competitors?.length || 0);
    console.log('Locations:', enrichedData.locations?.length || 0);

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
