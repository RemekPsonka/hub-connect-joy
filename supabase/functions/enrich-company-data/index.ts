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

// ============= CONFIDENCE SCORE CALCULATOR =============
// Calculates overall confidence score (0-1) based on data completeness
function calculateConfidenceScore(analysisData: Record<string, unknown>): number {
  const sectionScores: Record<string, number> = {
    basic_info: 0,
    history: 0,
    financial: 0,
    business_model: 0,
    products: 0,
    brands: 0,
    locations: 0,
    clients_projects: 0,
    competition: 0,
    offer: 0,
    seeking: 0,
    collaboration: 0,
    management: 0,
    news: 0,
    csr: 0,
    registry: 0
  };
  
  // Helper to safely get array length
  const arrLen = (val: unknown): number => Array.isArray(val) ? val.length : 0;
  const strLen = (val: unknown): number => typeof val === 'string' ? val.length : 0;
  
  // SEKCJA 1: Basic Info (max 10 points)
  if (analysisData.name) sectionScores.basic_info += 3;
  if (analysisData.industry) sectionScores.basic_info += 2;
  if (strLen(analysisData.description) > 100) sectionScores.basic_info += 3;
  if (analysisData.year_founded) sectionScores.basic_info += 2;
  
  // SEKCJA 2: History (max 8 points)
  if (arrLen(analysisData.timeline) >= 3) sectionScores.history += 4;
  if (arrLen(analysisData.timeline) >= 5) sectionScores.history += 2;
  if (arrLen(analysisData.major_transformations) > 0) sectionScores.history += 2;
  
  // SEKCJA 3: Financial (max 15 points) - NAJWAŻNIEJSZA
  const revenue = analysisData.revenue as Record<string, unknown> | undefined;
  if (revenue?.amount) sectionScores.financial += 5;
  if (arrLen(analysisData.revenue_history) >= 2) sectionScores.financial += 3;
  if (analysisData.employee_count) sectionScores.financial += 3;
  if (analysisData.market_position) sectionScores.financial += 2;
  if (arrLen(analysisData.ranking_positions) > 0) sectionScores.financial += 2;
  
  // SEKCJA 4: Business Model (max 8 points)
  if (strLen(analysisData.business_model) > 100) sectionScores.business_model += 4;
  if (arrLen(analysisData.competitive_advantages) >= 3) sectionScores.business_model += 4;
  
  // SEKCJA 5: Products (max 10 points)
  if (arrLen(analysisData.products) >= 3) sectionScores.products += 5;
  if (arrLen(analysisData.products) >= 5) sectionScores.products += 2;
  if (arrLen(analysisData.flagship_products) > 0) sectionScores.products += 3;
  
  // SEKCJA 6: Brands (max 5 points)
  if (arrLen(analysisData.own_brands) > 0) sectionScores.brands += 3;
  if (arrLen(analysisData.represented_brands) > 0) sectionScores.brands += 2;
  
  // SEKCJA 7: Locations (max 8 points)
  const headquarters = analysisData.headquarters as Record<string, unknown> | undefined;
  if (headquarters?.address) sectionScores.locations += 3;
  if (arrLen(analysisData.locations) >= 2) sectionScores.locations += 3;
  const geoCoverage = analysisData.geographic_coverage as Record<string, unknown> | undefined;
  if (arrLen(geoCoverage?.poland_cities) > 0) sectionScores.locations += 2;
  
  // SEKCJA 8: Clients & Projects (max 10 points)
  if (arrLen(analysisData.reference_projects) >= 3) sectionScores.clients_projects += 5;
  if (arrLen(analysisData.reference_projects) >= 5) sectionScores.clients_projects += 2;
  if (arrLen(analysisData.key_clients) > 0) sectionScores.clients_projects += 3;
  
  // SEKCJA 9: Competition (max 5 points)
  if (arrLen(analysisData.main_competitors) >= 3) sectionScores.competition += 3;
  if (analysisData.competitive_position) sectionScores.competition += 2;
  
  // SEKCJA 10: Offer (max 5 points)
  if (arrLen(analysisData.unique_selling_points) >= 3) sectionScores.offer += 3;
  if (arrLen(analysisData.certifications) > 0) sectionScores.offer += 2;
  
  // SEKCJA 11: Seeking (max 3 points)
  if (analysisData.seeking_clients || analysisData.seeking_partners) sectionScores.seeking += 3;
  
  // SEKCJA 12: Collaboration (max 3 points)
  if (arrLen(analysisData.collaboration_opportunities) > 0) sectionScores.collaboration += 3;
  
  // SEKCJA 13: Management (max 5 points)
  if (arrLen(analysisData.management) >= 2) sectionScores.management += 3;
  if (analysisData.company_culture) sectionScores.management += 2;
  
  // SEKCJA 14: News (max 8 points)
  if (arrLen(analysisData.recent_news) >= 3) sectionScores.news += 4;
  if (arrLen(analysisData.recent_news) >= 5) sectionScores.news += 2;
  if (arrLen(analysisData.market_signals) > 0) sectionScores.news += 2;
  
  // SEKCJA 15: CSR (max 3 points)
  if (arrLen(analysisData.csr_activities) > 0) sectionScores.csr += 3;
  
  // SEKCJA 16: Registry (max 4 points)
  if (analysisData.nip) sectionScores.registry += 2;
  if (analysisData.krs || analysisData.regon) sectionScores.registry += 2;
  
  // Suma (max 110 points) → normalize do 0-1
  const totalScore = Object.values(sectionScores).reduce((sum, score) => sum + score, 0);
  const confidence = Math.min(totalScore / 110, 1.0);
  
  return Math.round(confidence * 100) / 100; // Round to 2 decimals
}

// Identify missing sections based on analysis data
function identifyMissingSections(analysisData: Record<string, unknown>): string[] {
  const missing: string[] = [];
  const arrLen = (val: unknown): number => Array.isArray(val) ? val.length : 0;
  
  if (!analysisData.name || !analysisData.industry) missing.push('basic_info');
  if (arrLen(analysisData.timeline) === 0) missing.push('history');
  
  const revenue = analysisData.revenue as Record<string, unknown> | undefined;
  if (!revenue?.amount && !analysisData.employee_count) missing.push('financial');
  
  if (!analysisData.business_model) missing.push('business_model');
  if (arrLen(analysisData.products) === 0) missing.push('products');
  
  const headquarters = analysisData.headquarters as Record<string, unknown> | undefined;
  if (!headquarters?.address && arrLen(analysisData.locations) === 0) missing.push('locations');
  
  if (arrLen(analysisData.reference_projects) === 0 && arrLen(analysisData.key_clients) === 0) {
    missing.push('clients_projects');
  }
  if (arrLen(analysisData.main_competitors) === 0) missing.push('competition');
  if (arrLen(analysisData.management) === 0) missing.push('management');
  if (arrLen(analysisData.recent_news) === 0) missing.push('news');
  if (!analysisData.nip && !analysisData.krs) missing.push('registry');
  
  return missing;
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
  blocked?: boolean; // Flag for 408/429 blocked responses
}

interface ScrapingStats {
  total_urls_found: number;
  pages_scraped: number;
  successful_scrapes: number;
  total_words: number;
  categories_found: string[];
  error?: string; // Info about Firecrawl phase failure
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
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 2000,
        timeout: 12000
      }),
    });
    
    // Detect blocked/rate-limited responses (408 Timeout, 429 Rate Limit)
    if (response.status === 408 || response.status === 429) {
      console.warn(`Scraping blocked for ${url}: ${response.status}`);
      return { 
        url, 
        content: null, 
        html: null, 
        title: url, 
        category, 
        priority, 
        word_count: 0, 
        metadata: null,
        blocked: true
      };
    }
    
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
    
    // Wrap entire Firecrawl phase in try-catch to ensure we always proceed with Perplexity data
    try {
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
        
        // 2c. SEQUENTIAL SCRAPING with rate limiting and early exit on blocked sites
        scrapedPages = [];
        let blockedCount = 0;
        const BLOCKED_THRESHOLD = 3; // Exit early after 3 blocked requests
        
        for (let i = 0; i < urlsToScrape.length; i++) {
          // Early exit if site appears to block scraping
          if (blockedCount >= BLOCKED_THRESHOLD) {
            console.warn(`Early exit: ${blockedCount} URLs blocked by site, skipping remaining ${urlsToScrape.length - i} URLs`);
            console.log(`Website ${website} appears to block scraping. Proceeding with Perplexity data only.`);
            break;
          }
          
          const { url, category, priority } = urlsToScrape[i];
          
          const page = await scrapeWithFirecrawl(url, FIRECRAWL_API_KEY, category, priority);
          
          if (page.blocked) {
            blockedCount++;
            console.warn(`Blocked ${blockedCount}/${BLOCKED_THRESHOLD}: ${url}`);
          } else {
            scrapedPages.push(page);
          }
          
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
    } catch (firecrawlError) {
      // SAFETY NET: If entire Firecrawl phase fails, proceed with Perplexity data only
      console.warn('=== FIRECRAWL PHASE FAILED ===');
      console.warn('Error:', firecrawlError);
      console.log('Proceeding with Perplexity data only - this is expected for some websites');
      
      // Reset stats to indicate no scraping data available
      scrapingStats = {
        total_urls_found: 0,
        pages_scraped: 0,
        successful_scrapes: 0,
        total_words: 0,
        categories_found: [],
        error: `Firecrawl phase failed: ${firecrawlError instanceof Error ? firecrawlError.message : 'Unknown error'}. Using Perplexity data only.`
      };
      scrapedPages = [];
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

    // Build OPTIMIZED system prompt - shorter for faster response
    const systemPrompt = hasAnyData
      ? `Jesteś analitykiem biznesowym. Stwórz szczegółowy profil firmy w JSON.

📊 ŹRÓDŁA DANYCH:
- Perplexity: ${[hasProfileInsights, hasFinancialInsights, hasLocationInsights, hasProjectsInsights, hasNewsInsights, hasRegistryInsights].filter(Boolean).length}/6 zapytań
- Firecrawl: ${scrapingStats.successful_scrapes} stron, ${scrapingStats.total_words} słów

🎯 STRUKTURA JSON (16 sekcji):

1. PODSTAWOWE: name, short_name, legal_form, industry, sub_industries[], description (200 słów), tagline, year_founded, founder_info

2. HISTORIA: timeline[{year, event, impact, source}], major_transformations[], mergers_acquisitions[{target, year, value_pln, details}], expansion_history

3. FINANSE (TYLKO konkretne liczby ze źródeł!): revenue{amount, year, currency, source}, revenue_history[{year, amount, growth_pct}], growth_rate, profit_margin, employee_count, employee_growth, market_share, market_position, ranking_positions[{ranking_name, position, year, source}]

4. MODEL BIZNESOWY: business_model (200 słów), value_proposition, competitive_advantages[], pricing_strategy, target_markets[], go_to_market_strategy

5. PRODUKTY/USŁUGI: products[{name, category, description, target_customer, price_range, key_features[], availability}], services[], product_categories[], flagship_products[], new_products_2024[]

6. MARKI: own_brands[{brand_name, description, market_segment, product_categories[]}], represented_brands[{brand_name, manufacturer, distribution_scope, product_lines[]}], partnerships[]

7. LOKALIZACJE: headquarters{address, city, postal_code, country}, locations[{type, city, address, opening_year, size_sqm, employee_count}], geographic_coverage{poland_regions[], poland_cities[], international[]}, distribution_network

8. KLIENCI/PROJEKTY: key_clients[{client_name, industry, relationship_type, collaboration_start, notable_projects[]}], reference_projects[{project_name, client, value_pln, year, scope, outcome, source}], case_studies[], public_contracts[]

9. KONKURENCJA: main_competitors[{company_name, comparison, competitive_edge}], competitive_position, market_trends

10. OFERTA: offer_summary, unique_selling_points[], certifications[], awards[], quality_standards[]

11. CZEGO SZUKA: seeking_clients, seeking_partners, seeking_suppliers, seeking_investors, hiring_positions[], expansion_plans

12. POTENCJAŁ WSPÓŁPRACY: collaboration_opportunities[], ideal_partner_profile, synergy_potential[], partnership_benefits

13. ZARZĄD: management[{name, position, since_year, background}], company_size, organizational_structure, company_culture

14. NEWSY: recent_news[{date, title, summary, source, url, sentiment, importance}], market_signals[], recent_investments[{amount_pln, purpose, year}], overall_sentiment

15. CSR: csr_activities[{activity_name, description, beneficiaries, year_started}], environmental_policy, social_initiatives[], sustainability_goals[], charity_partnerships[]

16. REJESTROWE (TYLKO ze źródeł!): nip (10 cyfr), regon (9/14 cyfr), krs (10 cyfr), registration_address, registration_date

METADATA: analysis_confidence (high/medium/low), data_freshness, missing_sections[], primary_sources[]

⚠️ ZASADY:
- NIE wymyślaj danych finansowych/NIP/KRS - użyj null
- Podawaj źródła
- Zwróć TYLKO JSON, bez markdown

Odpowiedź TYLKO w JSON.`
      : `Jesteś ekspertem w analizie firm polskich.

⚠️ NIE MASZ dostępu do internetu ani baz danych.
Możesz TYLKO sugerować prawdopodobną branżę i profil na podstawie nazwy firmy.

ZASADY:
- Wszystko co podajesz to SUGESTIE, nie fakty
- NIE wymyślaj NIP, REGON, KRS, adresów, osób z zarządu
- Ustaw confidence: "low" i dodaj analizis_notes o braku danych

Zwróć JSON z podstawową strukturą - większość pól jako null.`;

    const jsonStructure = `{
  "name": "Pełna oficjalna nazwa firmy z formą prawną",
  "short_name": "Nazwa skrócona/handlowa",
  "legal_form": "Forma prawna lub null",
  "industry": "Branża główna (konkretna)",
  "sub_industries": ["Subbranże", "Specjalizacje niszowe"],
  "description": "Szczegółowy opis działalności (200-300 słów)",
  "tagline": "Slogan firmowy lub null",
  "year_founded": 2007,
  "founder_info": "Informacje o założycielach lub null",
  
  "timeline": [
    {"year": 2007, "event": "Założenie firmy", "impact": "Start działalności", "source": "strona WWW"}
  ],
  "major_transformations": ["Transformacje biznesowe"],
  "mergers_acquisitions": [
    {"target": "Nazwa przejętej firmy", "year": 2020, "value_pln": null, "details": "Szczegóły"}
  ],
  "expansion_history": "Historia ekspansji geograficznej",
  
  "revenue": {"amount": 2500000000, "year": 2024, "currency": "PLN", "source": "Forbes"},
  "revenue_history": [
    {"year": 2024, "amount": 2500000000, "growth_pct": 15},
    {"year": 2023, "amount": 2170000000, "growth_pct": 12}
  ],
  "growth_rate": 15,
  "profit_margin": null,
  "employee_count": 1200,
  "employee_growth": "+10% w 2024",
  "market_share": 12,
  "market_position": "Top 5 w Polsce w segmencie X",
  "ranking_positions": [
    {"ranking_name": "Forbes Diamenty", "position": 150, "year": 2024, "source": "Forbes"}
  ],
  
  "business_model": "Opis modelu biznesowego (200-300 słów)",
  "value_proposition": "Unikalna propozycja wartości",
  "competitive_advantages": ["Przewaga 1", "Przewaga 2", "Przewaga 3"],
  "pricing_strategy": "premium/średni/budget lub null",
  "target_markets": ["Segment 1", "Segment 2"],
  "go_to_market_strategy": "Strategia dotarcia do klientów",
  
  "products": [
    {
      "name": "Nazwa produktu",
      "category": "Kategoria",
      "description": "Szczegółowy opis (50-100 słów)",
      "target_customer": "Dla kogo",
      "price_range": "100-500 PLN lub null",
      "key_features": ["Cecha 1", "Cecha 2"],
      "availability": "Dostępność"
    }
  ],
  "services": [
    {
      "name": "Nazwa usługi",
      "category": "Kategoria",
      "description": "Szczegółowy opis",
      "target_customer": "Dla kogo",
      "price_range": null,
      "key_features": ["Cecha 1"],
      "availability": "Na zamówienie"
    }
  ],
  "product_categories": ["Kategoria 1", "Kategoria 2"],
  "flagship_products": ["Produkt 1", "Produkt 2"],
  "new_products_2024": ["Nowy produkt 2024"],
  
  "own_brands": [
    {"brand_name": "Marka własna", "description": "Opis", "market_segment": "Segment", "product_categories": ["Kategoria"]}
  ],
  "represented_brands": [
    {"brand_name": "Marka zewnętrzna", "manufacturer": "Producent", "distribution_scope": "Polska", "product_lines": ["Linia produktów"]}
  ],
  "partnerships": ["Partner strategiczny 1"],
  
  "headquarters": {
    "address": "ul. Przykładowa 1",
    "city": "Warszawa",
    "postal_code": "00-001",
    "country": "Polska",
    "coordinates": null
  },
  "locations": [
    {"type": "office", "city": "Kraków", "address": "ul. Inna 5", "opening_year": 2015, "size_sqm": null, "employee_count": 50}
  ],
  "geographic_coverage": {
    "poland_regions": ["mazowieckie", "małopolskie"],
    "poland_cities": ["Warszawa", "Kraków"],
    "international": ["Niemcy", "Czechy"]
  },
  "distribution_network": "Opis sieci dystrybucji lub null",
  
  "key_clients": [
    {"client_name": "Firma Klient", "industry": "Branża", "relationship_type": "Stały klient", "collaboration_start": 2018, "notable_projects": ["Projekt X"]}
  ],
  "reference_projects": [
    {"project_name": "Nazwa projektu", "client": "Klient", "value_pln": 10000000, "year": 2024, "scope": "Zakres", "outcome": "Rezultat", "source": "Źródło"}
  ],
  "case_studies": ["URL do case study"],
  "public_contracts": ["Przetarg 1"],
  
  "main_competitors": [
    {"company_name": "Konkurent", "comparison": "Porównanie wielkości, cen", "competitive_edge": "Ich przewaga"}
  ],
  "competitive_position": "Opis pozycji konkurencyjnej (100 słów)",
  "market_trends": "Trendy rynkowe",
  
  "offer_summary": "Podsumowanie oferty (100 słów)",
  "unique_selling_points": ["USP 1", "USP 2", "USP 3"],
  "certifications": ["ISO 9001", "ISO 14001"],
  "awards": ["Nagroda 1"],
  "quality_standards": ["Standard 1"],
  
  "seeking_clients": "Opis szukanych klientów",
  "seeking_partners": "Opis szukanych partnerów",
  "seeking_suppliers": "Opis szukanych dostawców lub null",
  "seeking_investors": null,
  "hiring_positions": ["Stanowisko 1", "Stanowisko 2"],
  "expansion_plans": "Plany ekspansji",
  
  "collaboration_opportunities": ["Możliwość 1", "Możliwość 2"],
  "ideal_partner_profile": "Profil idealnego partnera (100 słów)",
  "synergy_potential": ["Synergia 1"],
  "partnership_benefits": "Korzyści ze współpracy",
  
  "management": [
    {"name": "Jan Kowalski", "position": "Prezes Zarządu", "since_year": 2010, "background": "Kariera zawodowa"}
  ],
  "company_size": "średnia",
  "organizational_structure": "Opis struktury lub null",
  "company_culture": "Opis kultury organizacyjnej",
  
  "recent_news": [
    {"date": "2024-06-15", "title": "Tytuł newsa", "summary": "Streszczenie", "source": "Źródło", "url": null, "sentiment": "positive", "importance": "high"}
  ],
  "market_signals": ["Sygnał 1", "Sygnał 2"],
  "recent_investments": [
    {"amount_pln": 50000000, "purpose": "Cel inwestycji", "year": 2024}
  ],
  "overall_sentiment": "positive",
  
  "csr_activities": [
    {"activity_name": "Nazwa działania", "description": "Opis", "beneficiaries": "Beneficjenci", "year_started": 2020}
  ],
  "environmental_policy": "Polityka środowiskowa lub null",
  "social_initiatives": ["Inicjatywa 1"],
  "sustainability_goals": ["Cel 1"],
  "charity_partnerships": ["Fundacja 1"],
  
  "nip": "1234567890",
  "regon": "123456789",
  "krs": "0000123456",
  "registration_address": "Adres rejestrowy",
  "registration_date": "2007-05-15",
  
  "analysis_confidence": "high",
  "data_freshness": "Dane z 2024, częściowo z 2023",
  "missing_sections": ["sekcje bez danych"],
  "primary_sources": ["źródło 1", "źródło 2"],
  "sources": ["URL źródeł"],
  "analysis_notes": ["Uwagi o jakości danych"]
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

    // AI Synthesis with timeout protection (80s max to avoid 150s edge function limit)
    const AI_SYNTHESIS_TIMEOUT = 80000;
    
    const aiPromise = fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash', // Faster model for better timeout handling
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        max_tokens: 16000, // Full 16-section analysis needs more tokens
        temperature: 0.1,
      }),
    });
    
    const timeoutPromise = new Promise<Response>((_, reject) => 
      setTimeout(() => reject(new Error('AI_SYNTHESIS_TIMEOUT')), AI_SYNTHESIS_TIMEOUT)
    );
    
    let response: Response;
    try {
      response = await Promise.race([aiPromise, timeoutPromise]);
    } catch (timeoutError) {
      if (timeoutError instanceof Error && timeoutError.message === 'AI_SYNTHESIS_TIMEOUT') {
        console.warn('=== AI SYNTHESIS TIMEOUT - Creating fallback analysis from Perplexity ===');
        
        // Create basic analysis from available Perplexity data
        const fallbackAnalysis = {
          name: company_name,
          description: perplexityProfileInsights?.slice(0, 500) || 'Brak opisu - analiza przekroczyła limit czasu',
          industry: 'Do uzupełnienia',
          partial_analysis: true,
          analysis_timeout: true,
          perplexity_data_available: {
            profile: !!perplexityProfileInsights,
            financial: !!perplexityFinancialInsights,
            locations: !!perplexityLocationInsights,
            projects: !!perplexityProjectsInsights,
            news: !!perplexityNewsInsights,
            registry: !!perplexityRegistryInsights
          },
          // Include raw Perplexity data for client-side display
          raw_perplexity_data: {
            profile: perplexityProfileInsights,
            financial: perplexityFinancialInsights,
            locations: perplexityLocationInsights,
            projects: perplexityProjectsInsights,
            news: perplexityNewsInsights,
            registry: perplexityRegistryInsights
          },
          confidence: 'low',
          analysis_confidence_score: 0.3,
          missing_sections: ['Pełna analiza AI - przekroczono limit czasu'],
          metadata: {
            perplexity_queries: [hasProfileInsights, hasFinancialInsights, hasLocationInsights, hasProjectsInsights, hasNewsInsights, hasRegistryInsights].filter(Boolean).length,
            firecrawl_pages: scrapingStats.successful_scrapes,
            ai_synthesis_timeout: true,
            perplexity_citations: perplexityCitations
          }
        };
        
        console.log('Returning fallback analysis with Perplexity data');
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            partial: true,
            message: 'Analiza częściowa - przekroczono limit czasu AI. Dane z Perplexity zostały zapisane.',
            data: fallbackAnalysis
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw timeoutError;
    }

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
        
        let fixedContent = cleanedContent;
        
        // Remove trailing incomplete strings/values more aggressively
        // Find last complete key-value pair by looking for last complete string or number
        fixedContent = fixedContent
          .replace(/,\s*"[^"]*"?\s*:?\s*"?[^"{}[\],]*$/g, '') // incomplete key:value
          .replace(/,\s*\[[^\]]*$/g, '') // incomplete array
          .replace(/,\s*\{[^}]*$/g, '') // incomplete object
          .replace(/,\s*"[^"]*$/g, '') // incomplete string
          .replace(/,\s*$/g, ''); // trailing comma
        
        // Close all open brackets and braces
        const openBraces = (fixedContent.match(/\{/g) || []).length;
        const closeBraces = (fixedContent.match(/\}/g) || []).length;
        const openBrackets = (fixedContent.match(/\[/g) || []).length;
        const closeBrackets = (fixedContent.match(/\]/g) || []).length;
        
        // Close unclosed strings
        const quotes = (fixedContent.match(/"/g) || []).length;
        if (quotes % 2 !== 0) {
          fixedContent = fixedContent + '"';
        }
        
        // Close arrays first, then objects
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          fixedContent = fixedContent + ']';
        }
        
        for (let i = 0; i < openBraces - closeBraces; i++) {
          fixedContent = fixedContent + '}';
        }
        
        console.log('Attempting to parse fixed content, length:', fixedContent.length);
        
        try {
          enrichedData = JSON.parse(fixedContent);
          console.log('Fixed JSON parse successful');
        } catch (secondParseError) {
          // Last resort: try to extract as much valid data as possible
          console.warn('Second parse failed, trying aggressive cleanup');
          
          // Find the last valid closing brace that would make valid JSON
          let lastValidIndex = fixedContent.length;
          for (let i = fixedContent.length - 1; i > 0; i--) {
            if (fixedContent[i] === '}' || fixedContent[i] === ']') {
              const testContent = fixedContent.substring(0, i + 1);
              try {
                enrichedData = JSON.parse(testContent);
                console.log('Aggressive cleanup successful at index:', i);
                break;
              } catch {
                continue;
              }
            }
          }
          
          if (!enrichedData) {
            throw secondParseError;
          }
        }
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
      
      // Add metadata about the enrichment process (with extended scraping stats and 16-section analysis info)
      const perplexityQueriesCount = [
        hasProfileInsights, hasFinancialInsights, hasLocationInsights,
        hasProjectsInsights, hasNewsInsights, hasRegistryInsights
      ].filter(Boolean).length;
      
      // Use helper functions for missing sections and confidence
      const missingSections = identifyMissingSections(enrichedData);
      
      // Calculate numerical confidence score (0-1)
      const confidenceScore = calculateConfidenceScore(enrichedData);
      
      // Map to text confidence level
      let overallConfidence = 'low';
      if (confidenceScore >= 0.7) {
        overallConfidence = 'high';
      } else if (confidenceScore >= 0.5) {
        overallConfidence = 'medium';
      }
      
      enrichedData.confidence_score = confidenceScore;
      
      enrichedData.enrichment_metadata = {
        completed_at: new Date().toISOString(),
        perplexity_queries_used: perplexityQueriesCount,
        perplexity_queries_detail: {
          profile: hasProfileInsights,
          financial: hasFinancialInsights,
          location: hasLocationInsights,
          projects: hasProjectsInsights,
          news: hasNewsInsights,
          registry: hasRegistryInsights
        },
        firecrawl_stats: {
          total_urls_found: scrapingStats.total_urls_found,
          pages_scraped: scrapingStats.pages_scraped,
          successful_scrapes: scrapingStats.successful_scrapes,
          total_words: scrapingStats.total_words,
          categories_found: scrapingStats.categories_found,
          fallback_to_perplexity: !!scrapingStats.error,
          error: scrapingStats.error || null
        },
        pages_scraped_detail: scrapedPages.filter(p => p.content).map(p => ({
          url: p.url,
          category: p.category,
          priority: p.priority,
          word_count: p.word_count,
          title: p.title
        })),
        confidence_score: confidenceScore,
        overall_confidence: overallConfidence,
        data_freshness: new Date().getFullYear().toString(),
        missing_sections: missingSections,
        sections_with_data: 16 - missingSections.length,
        perplexity_citations: perplexityCitations,
        sources_count: perplexityCitations.length
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
