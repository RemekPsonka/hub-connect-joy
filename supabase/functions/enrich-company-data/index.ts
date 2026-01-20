import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= PUBLIC EMAIL DOMAINS TO SKIP =============
const PUBLIC_EMAIL_DOMAINS = [
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.pl', 'yahoo.co.uk',
  'outlook.com', 'hotmail.com', 'live.com', 'live.pl', 'msn.com',
  'wp.pl', 'onet.pl', 'o2.pl', 'interia.pl', 
  'op.pl', 'tlen.pl', 'gazeta.pl', 'poczta.fm', 'poczta.onet.pl',
  'icloud.com', 'me.com', 'mac.com',
  'protonmail.com', 'proton.me',
  'aol.com', 'mail.com', 'zoho.com',
  'yandex.ru', 'yandex.com', 'mail.ru',
  'gmx.com', 'gmx.de', 'gmx.net',
  'tutanota.com', 'pm.me',
  'seznam.cz', 'centrum.cz',
  'web.de', 't-online.de',
  'libero.it', 'virgilio.it',
  'orange.fr', 'wanadoo.fr', 'free.fr',
  'ya.ru', 'rambler.ru',
];

// ============= REGEX PATTERNS FOR REGISTRY IDS =============
const REGISTRY_PATTERNS = {
  nip: [
    /NIP[:\s]*(\d{3}[-\s]?\d{3}[-\s]?\d{2}[-\s]?\d{2})/gi,
    /NIP[:\s]*(\d{10})/gi,
    /(?:^|\s)(\d{3}-\d{3}-\d{2}-\d{2})(?:\s|$)/g,
  ],
  regon: [
    /REGON[:\s]*(\d{9,14})/gi,
    /(?:^|\s)(\d{9})(?:\s|$)/g,
  ],
  krs: [
    /KRS[:\s]*0*(\d{10})/gi,
    /KRS[:\s]*(\d{10})/gi,
    /(?:^|\s)0*(\d{10})(?:\s|$)/g,
  ],
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

// Extract company domain from email (skip public domains)
function extractCompanyDomainFromEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain || PUBLIC_EMAIL_DOMAINS.includes(domain)) return null;
  return domain;
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
  if (cleaned.length !== 10) return false;
  
  // NIP checksum validation
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * weights[i];
  }
  const checksum = sum % 11;
  return checksum === parseInt(cleaned[9]);
}

// REGON validation helper  
function isValidREGON(regon: string | null): boolean {
  if (!regon) return false;
  const cleaned = regon.replace(/[^0-9]/g, '');
  return cleaned.length === 9 || cleaned.length === 14;
}

// KRS validation helper
function isValidKRS(krs: string | null): boolean {
  if (!krs) return false;
  const cleaned = krs.replace(/[^0-9]/g, '');
  return cleaned.length === 10;
}

// Extract registry IDs from text content
function extractRegistryIds(content: string): { nip: string | null; regon: string | null; krs: string | null } {
  const result = { nip: null as string | null, regon: null as string | null, krs: null as string | null };
  
  // Extract NIP
  for (const pattern of REGISTRY_PATTERNS.nip) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const cleaned = match[1].replace(/[-\s]/g, '');
      if (isValidNIP(cleaned)) {
        result.nip = cleaned;
        break;
      }
    }
    if (result.nip) break;
  }
  
  // Extract REGON
  for (const pattern of REGISTRY_PATTERNS.regon) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const cleaned = match[1].replace(/[-\s]/g, '');
      if (isValidREGON(cleaned)) {
        result.regon = cleaned;
        break;
      }
    }
    if (result.regon) break;
  }
  
  // Extract KRS
  for (const pattern of REGISTRY_PATTERNS.krs) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const cleaned = match[1].replace(/[-\s]/g, '').padStart(10, '0');
      if (isValidKRS(cleaned)) {
        result.krs = cleaned;
        break;
      }
    }
    if (result.krs) break;
  }
  
  return result;
}

// ============= KRS API DATA INTERFACES =============
interface KRSPerson {
  imiona: string;
  nazwisko: string;
  funkcja?: string;
}

interface KRSApiData {
  name: string | null;
  legal_form: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  nip: string | null;
  regon: string | null;
  krs: string;
  management: Array<{ name: string; position: string }>;
  partners: Array<{ name: string; position: string }>;
  capital: number | null;
  registration_date: string | null;
  pkd_main: string | null;
  pkd_codes: string[];
}

// Fetch data from KRS API
async function fetchKRSData(krs: string): Promise<KRSApiData | null> {
  const krsNormalized = krs.padStart(10, '0');
  console.log(`[KRS API] Fetching data for KRS: ${krsNormalized}`);
  
  // Try OdpisPelny first for full data
  let krsUrl = `https://api-krs.ms.gov.pl/api/krs/OdpisPelny/${krsNormalized}?rejestr=P&format=json`;
  let response = await fetch(krsUrl);
  
  if (!response.ok) {
    // Try with rejestr=S (associations/foundations)
    krsUrl = `https://api-krs.ms.gov.pl/api/krs/OdpisPelny/${krsNormalized}?rejestr=S&format=json`;
    response = await fetch(krsUrl);
    
    if (!response.ok) {
      // Fallback to OdpisAktualny
      krsUrl = `https://api-krs.ms.gov.pl/api/krs/OdpisAktualny/${krsNormalized}?rejestr=P&format=json`;
      response = await fetch(krsUrl);
      
      if (!response.ok) {
        console.warn(`[KRS API] Not found for KRS: ${krsNormalized}`);
        return null;
      }
    }
  }
  
  const krsData = await response.json();
  console.log('[KRS API] Response received');
  
  // Extract data from KRS response
  const dzial1 = krsData.odpis?.dane?.dzial1;
  const dzial2 = krsData.odpis?.dane?.dzial2;
  const dzial3 = krsData.odpis?.dane?.dzial3;
  const napiData = krsData.odpis?.dane?.napiData;
  
  const companyName = dzial1?.danePodmiotu?.nazwa || null;
  const formaPrawna = dzial1?.danePodmiotu?.formaPrawna || null;
  const siedzibaAdres = dzial1?.siedzibaIAdres?.adres;
  const siedziba = dzial1?.siedzibaIAdres?.siedziba;
  
  // Build address
  let address = '';
  if (siedzibaAdres?.ulica) {
    address = siedzibaAdres.ulica;
    if (siedzibaAdres.nrDomu) address += ` ${siedzibaAdres.nrDomu}`;
    if (siedzibaAdres.nrLokalu) address += `/${siedzibaAdres.nrLokalu}`;
  }
  
  const city = siedzibaAdres?.miejscowosc || siedziba?.miejscowosc || null;
  const postalCode = siedzibaAdres?.kodPocztowy || null;
  const nip = napiData?.nip || null;
  const regon = napiData?.regon || null;
  
  // Map legal form - handle object or string
  const formaPrawnaStr = typeof formaPrawna === 'string' 
    ? formaPrawna 
    : (formaPrawna?.nazwa || formaPrawna?.wartość || String(formaPrawna || ''));
  
  const legalFormMap: Record<string, string> = {
    'SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ': 'sp_z_oo',
    'SPÓŁKA AKCYJNA': 'sa',
    'SPÓŁKA JAWNA': 'spolka_jawna',
    'SPÓŁKA PARTNERSKA': 'spolka_partnerska',
    'SPÓŁKA KOMANDYTOWA': 'spolka_komandytowa',
    'SPÓŁKA KOMANDYTOWO-AKCYJNA': 'spolka_komandytowa',
    'PROSTA SPÓŁKA AKCYJNA': 'psa',
  };
  const legalForm = formaPrawnaStr ? (legalFormMap[formaPrawnaStr.toUpperCase()] || formaPrawnaStr) : null;
  
  // Extract management persons
  const management: Array<{ name: string; position: string }> = [];
  const reprezentacja = dzial2?.reprezentacja?.sklad;
  if (Array.isArray(reprezentacja)) {
    for (const group of reprezentacja) {
      if (Array.isArray(group.sklad)) {
        for (const person of group.sklad as KRSPerson[]) {
          if (person.imiona && person.nazwisko) {
            management.push({
              name: `${person.imiona} ${person.nazwisko}`,
              position: person.funkcja || 'Członek Zarządu',
            });
          }
        }
      }
    }
  }
  
  // Extract partners
  const partners: Array<{ name: string; position: string }> = [];
  const wspolnicy = dzial2?.wspolnicy?.wspolnikSpZoo;
  if (Array.isArray(wspolnicy)) {
    for (const w of wspolnicy) {
      const osoba = w.wspólnik?.osoba;
      if (osoba?.imiona && osoba?.nazwisko) {
        partners.push({
          name: `${osoba.imiona} ${osoba.nazwisko}`,
          position: 'Wspólnik',
        });
      }
    }
  }
  
  // Extract capital
  let capital: number | null = null;
  const kapital = dzial1?.kapital?.wysokoscKapitaluZakladowego?.wartosc;
  if (kapital) {
    capital = parseFloat(kapital);
  }
  
  // Extract PKD codes
  const pkdCodes: string[] = [];
  let pkdMain: string | null = null;
  const przedmiot = dzial3?.przedmiotDzialalnosci?.przedmiotPrzewazajacejDzialalnosci;
  if (Array.isArray(przedmiot)) {
    for (const p of przedmiot) {
      if (p.kodDzial && p.kodKlasa && p.kodPodklasa) {
        const code = `${p.kodDzial}.${p.kodKlasa}.${p.kodPodklasa}`;
        if (!pkdMain) pkdMain = code;
        pkdCodes.push(code);
      }
    }
  }
  
  return {
    name: companyName,
    legal_form: legalForm,
    address,
    city,
    postal_code: postalCode,
    nip,
    regon,
    krs: krsNormalized,
    management,
    partners,
    capital,
    registration_date: null,
    pkd_main: pkdMain,
    pkd_codes: pkdCodes,
  };
}

// ============= CONFIDENCE SCORE CALCULATOR =============
function calculateConfidenceScore(analysisData: Record<string, unknown>, hasKrsData: boolean): number {
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
  
  const arrLen = (val: unknown): number => Array.isArray(val) ? val.length : 0;
  const strLen = (val: unknown): number => typeof val === 'string' ? val.length : 0;
  
  // KRS data gives automatic boost to registry section
  if (hasKrsData) {
    sectionScores.registry += 4; // Max for verified data
  }
  
  // SEKCJA 1: Basic Info (max 10 points)
  if (analysisData.name) sectionScores.basic_info += 3;
  if (analysisData.industry) sectionScores.basic_info += 2;
  if (strLen(analysisData.description) > 100) sectionScores.basic_info += 3;
  if (analysisData.year_founded) sectionScores.basic_info += 2;
  
  // SEKCJA 2: History (max 8 points)
  if (arrLen(analysisData.timeline) >= 3) sectionScores.history += 4;
  if (arrLen(analysisData.timeline) >= 5) sectionScores.history += 2;
  if (arrLen(analysisData.major_transformations) > 0) sectionScores.history += 2;
  
  // SEKCJA 3: Financial (max 15 points)
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
  
  // SEKCJA 16: Registry (max 4 points) - only if not from KRS
  if (!hasKrsData) {
    if (analysisData.nip) sectionScores.registry += 2;
    if (analysisData.krs || analysisData.regon) sectionScores.registry += 2;
  }
  
  const totalScore = Object.values(sectionScores).reduce((sum, score) => sum + score, 0);
  const confidence = Math.min(totalScore / 110, 1.0);
  
  return Math.round(confidence * 100) / 100;
}

// Identify missing sections
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

// ============= SCRAPING INTERFACES =============
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
  blocked?: boolean;
}

interface ScrapingStats {
  total_urls_found: number;
  pages_scraped: number;
  successful_scrapes: number;
  total_words: number;
  categories_found: string[];
  registry_ids_found?: { nip: string | null; regon: string | null; krs: string | null };
  error?: string;
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

// Priority pages configuration
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
    
    // Fallback category detection
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
    
    if (response.status === 408 || response.status === 429) {
      console.warn(`Scraping blocked for ${url}: ${response.status}`);
      return { url, content: null, html: null, title: url, category, priority, word_count: 0, metadata: null, blocked: true };
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

    const authResult = await verifyAuth(req, supabase);
    if (isAuthError(authResult)) {
      return unauthorizedResponse(authResult, corsHeaders);
    }

    console.log(`[enrich-company-data] Authorized user: ${authResult.user.id}, tenant: ${authResult.tenantId}`);

    const { company_name, website, industry_hint, contact_email } = await req.json();
    
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

    console.log('=== ENRICHING COMPANY DATA (NEW FLOW) ===');
    console.log('Company:', company_name);
    console.log('Website:', website);
    console.log('Contact Email:', contact_email);
    console.log('Perplexity available:', !!PERPLEXITY_API_KEY);
    console.log('Firecrawl available:', !!FIRECRAWL_API_KEY);

    // ==========================================
    // PHASE 0: EXTRACT DOMAIN FROM EMAIL OR WEBSITE
    // ==========================================
    console.log('=== PHASE 0: DOMAIN EXTRACTION ===');
    
    let targetDomain: string | null = null;
    let targetWebsite: string | null = website || null;
    
    // Priority: email domain > provided website
    if (contact_email) {
      const emailDomain = extractCompanyDomainFromEmail(contact_email);
      if (emailDomain) {
        targetDomain = emailDomain;
        targetWebsite = `https://${emailDomain}`;
        console.log(`Extracted domain from email: ${emailDomain}`);
      } else {
        console.log('Email domain is public, skipping');
      }
    }
    
    if (!targetDomain && website) {
      targetDomain = extractDomain(website);
      console.log(`Using provided website domain: ${targetDomain}`);
    }
    
    // Try to get logo from domain
    let logo_url: string | null = null;
    if (targetDomain) {
      const clearbitUrl = getClearbitLogoUrl(targetDomain);
      if (clearbitUrl) {
        const isValid = await isLogoValid(clearbitUrl);
        if (isValid) {
          logo_url = clearbitUrl;
          console.log('Found logo via Clearbit:', logo_url);
        }
      }
    }

    // ==========================================
    // PHASE 1: FIRECRAWL - SCAN FOR REGISTRY IDS
    // ==========================================
    console.log('=== PHASE 1: FIRECRAWL REGISTRY SCAN ===');
    
    let scrapedPages: ScrapedPage[] = [];
    let scrapingStats: ScrapingStats = {
      total_urls_found: 0,
      pages_scraped: 0,
      successful_scrapes: 0,
      total_words: 0,
      categories_found: [],
      registry_ids_found: { nip: null, regon: null, krs: null }
    };
    let categorizedContent: CategorizedContent = {
      home: [], about: [], products: [], portfolio: [], brands: [],
      locations: [], team: [], csr: [], news: [], contact: [], careers: [], other: []
    };
    
    let extractedRegistryIds = { nip: null as string | null, regon: null as string | null, krs: null as string | null };
    
    try {
      if (FIRECRAWL_API_KEY && targetWebsite) {
        const baseUrl = targetWebsite.startsWith('http') ? targetWebsite : `https://${targetWebsite}`;
        
        // First, scrape homepage and contact page to find registry IDs
        console.log('Scanning for registry IDs on homepage and contact...');
        
        const priorityUrls = [
          { url: baseUrl, category: 'home', priority: 'critical' as const },
          { url: `${baseUrl}/kontakt`, category: 'contact', priority: 'critical' as const },
          { url: `${baseUrl}/o-nas`, category: 'about', priority: 'critical' as const },
        ];
        
        for (const { url, category, priority } of priorityUrls) {
          const page = await scrapeWithFirecrawl(url, FIRECRAWL_API_KEY, category, priority);
          if (page.content) {
            scrapedPages.push(page);
            
            // Extract registry IDs from content
            const ids = extractRegistryIds(page.content);
            if (ids.nip && !extractedRegistryIds.nip) extractedRegistryIds.nip = ids.nip;
            if (ids.regon && !extractedRegistryIds.regon) extractedRegistryIds.regon = ids.regon;
            if (ids.krs && !extractedRegistryIds.krs) extractedRegistryIds.krs = ids.krs;
            
            // If we found KRS, we can stop early for registry scan
            if (extractedRegistryIds.krs) {
              console.log(`Found KRS on ${url}: ${extractedRegistryIds.krs}`);
              break;
            }
          }
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        console.log('Registry IDs from website:', extractedRegistryIds);
        scrapingStats.registry_ids_found = extractedRegistryIds;
        
        // Continue with full website mapping for later phases
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
              search: 'o nas, oferta, produkty, usługi, realizacje, portfolio, zespół, kontakt, historia, marki, lokalizacje, oddziały, csr, kariera'
            }),
          });
          
          if (mapResponse.ok) {
            const mapData = await mapResponse.json();
            discoveredUrls = mapData.links || [];
            scrapingStats.total_urls_found = discoveredUrls.length;
            console.log(`Discovered ${discoveredUrls.length} URLs`);
          }
        } catch (e) {
          console.warn('Map error:', e);
        }
        
        // Continue scraping more pages
        const excludePatterns = [
          /promocj|promo|rabat|okazj|wyprzedaz|sale|przecena|gratisy/i,
          /regulamin|polityka|privacy|cookies|rodo|gdpr|terms/i,
          /blog\/\d|news\/\d|artykul\/\d|post\/\d/i,
          /login|logowanie|rejestracja|register|koszyk|cart|checkout/i,
          /\.(pdf|jpg|jpeg|png|gif|doc|docx|xls|xlsx)$/i,
          /page=|sort=|filter=|utm_|#/i,
          /\?/i,
        ];
        
        const shouldExclude = (url: string) => excludePatterns.some(p => p.test(url));
        
        interface PrioritizedUrl {
          url: string;
          category: string;
          priority: 'critical' | 'high' | 'medium' | 'low' | 'none';
        }
        
        const prioritizedUrls2: PrioritizedUrl[] = [];
        const usedUrls = new Set<string>(scrapedPages.map(p => p.url.toLowerCase()));
        
        for (const url of discoveredUrls) {
          const urlLower = url.toLowerCase();
          if (usedUrls.has(urlLower)) continue;
          if (shouldExclude(url)) continue;
          
          const { category, priority } = matchUrlToCategory(url);
          prioritizedUrls2.push({ url, category, priority });
          usedUrls.add(urlLower);
        }
        
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
        prioritizedUrls2.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        
        const urlsToScrape = prioritizedUrls2.slice(0, 15); // Reduced to 15 for faster processing
        
        let blockedCount = 0;
        for (let i = 0; i < urlsToScrape.length; i++) {
          if (blockedCount >= 3) break;
          
          const { url, category, priority } = urlsToScrape[i];
          const page = await scrapeWithFirecrawl(url, FIRECRAWL_API_KEY, category, priority);
          
          if (page.blocked) {
            blockedCount++;
          } else if (page.content) {
            scrapedPages.push(page);
            
            // Also check for registry IDs in other pages
            if (!extractedRegistryIds.krs) {
              const ids = extractRegistryIds(page.content);
              if (ids.krs) extractedRegistryIds.krs = ids.krs;
              if (ids.nip && !extractedRegistryIds.nip) extractedRegistryIds.nip = ids.nip;
              if (ids.regon && !extractedRegistryIds.regon) extractedRegistryIds.regon = ids.regon;
            }
          }
          
          if (i < urlsToScrape.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 400));
          }
        }
        
        // Update stats
        const totalWords = scrapedPages.reduce((sum, p) => sum + p.word_count, 0);
        for (const page of scrapedPages) {
          const cat = page.category as keyof CategorizedContent;
          if (categorizedContent[cat]) {
            categorizedContent[cat].push(page);
          } else {
            categorizedContent.other.push(page);
          }
        }
        
        scrapingStats = {
          ...scrapingStats,
          pages_scraped: scrapedPages.length,
          successful_scrapes: scrapedPages.filter(p => p.content).length,
          total_words: totalWords,
          categories_found: Object.keys(categorizedContent).filter(k => categorizedContent[k as keyof CategorizedContent].length > 0),
          registry_ids_found: extractedRegistryIds
        };
        
        console.log('=== FIRECRAWL SUMMARY ===');
        console.log(`Pages scraped: ${scrapingStats.successful_scrapes}, Total words: ${totalWords}`);
        console.log('Registry IDs found:', extractedRegistryIds);
      }
    } catch (firecrawlError) {
      console.warn('Firecrawl phase failed:', firecrawlError);
      scrapingStats.error = `Firecrawl failed: ${firecrawlError instanceof Error ? firecrawlError.message : 'Unknown'}`;
    }

    // ==========================================
    // PHASE 2: KRS API (if KRS found)
    // ==========================================
    console.log('=== PHASE 2: KRS API ===');
    
    let krsData: KRSApiData | null = null;
    let hasVerifiedRegistryData = false;
    
    if (extractedRegistryIds.krs) {
      console.log(`Fetching KRS data for: ${extractedRegistryIds.krs}`);
      krsData = await fetchKRSData(extractedRegistryIds.krs);
      
      if (krsData) {
        hasVerifiedRegistryData = true;
        console.log('KRS data retrieved successfully');
        console.log('Company from KRS:', krsData.name);
        console.log('Management:', krsData.management.length, 'persons');
        
        // Update extracted IDs with verified data
        if (krsData.nip) extractedRegistryIds.nip = krsData.nip;
        if (krsData.regon) extractedRegistryIds.regon = krsData.regon;
      }
    } else {
      console.log('No KRS found, skipping KRS API');
    }

    // ==========================================
    // PHASE 3: PERPLEXITY (5 queries - skip registry search)
    // ==========================================
    console.log('=== PHASE 3: PERPLEXITY SEARCH ===');
    
    let perplexityProfileInsights: string | null = null;
    let perplexityFinancialInsights: string | null = null;
    let perplexityLocationInsights: string | null = null;
    let perplexityProjectsInsights: string | null = null;
    let perplexityNewsInsights: string | null = null;
    let perplexityCitations: string[] = [];
    
    if (PERPLEXITY_API_KEY) {
      const perplexityHeaders = {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      };
      
      // Query 1: Profile and History
      const profileQuery = `"${company_name}" Polska firma:
- rok założenia, założyciele, historia firmy
- timeline kamieni milowych (fuzje, przejęcia, ekspansje) z DATAMI
- profil działalności - dokładny opis czym się zajmuje
- produkty i usługi - KONKRETNA lista z opisami
- marki własne, dealerstwa
- model biznesowy - B2B/B2C, główne źródła przychodów
- co wyróżnia firmę od konkurencji`;

      // Query 2: Financial data
      const financialQuery = `"${company_name}" Polska przychody obroty zysk ranking zatrudnienie:
- przychody roczne w PLN (ostatnie 3 lata)
- dynamika wzrostu % rok do roku
- zysk netto (jeśli publiczny)
- liczba pracowników
- pozycja w rankingach branżowych
- udział w rynku %`;

      // Query 3: Locations
      const locationQuery = `"${company_name}" Polska siedziba oddziały fabryki salony lokalizacje:
- siedziba główna (pełny adres)
- oddziały regionalne (miasta, adresy)
- fabryki, zakłady produkcyjne
- salony, punkty sprzedaży
- zasięg działania (województwa, kraje)`;

      // Query 4: Projects and Competition
      const projectsQuery = `"${company_name}" Polska klienci projekty realizacje konkurencja:
- kluczowi klienci (nazwy firm)
- flagowe projekty/realizacje (wartość, rok, klient)
- główni konkurenci (nazwy firm)
- przewaga konkurencyjna`;

      // Query 5: News and CSR
      const newsQuery = `"${company_name}" Polska aktualności newsy 2024 2025 CSR ESG:
- artykuły prasowe (z datami!)
- inwestycje, plany rozwoju
- zmiany w zarządzie
- nagrody, certyfikaty
- działania CSR/ESG`;

      const [profileResp, financialResp, locationResp, projectsResp, newsResp] = await Promise.all([
        fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: perplexityHeaders,
          body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
              { role: 'system', content: 'Jesteś ekspertem w analizie polskich firm. Podawaj DATY i źródła.' },
              { role: 'user', content: profileQuery }
            ],
          }),
        }).catch(() => null),
        
        fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: perplexityHeaders,
          body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
              { role: 'system', content: 'Jesteś analitykiem finansowym. Podawaj konkretne liczby z rokiem i źródłem.' },
              { role: 'user', content: financialQuery }
            ],
          }),
        }).catch(() => null),
        
        fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: perplexityHeaders,
          body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
              { role: 'system', content: 'Szukaj lokalizacji firmy. Podawaj dokładne adresy jeśli dostępne.' },
              { role: 'user', content: locationQuery }
            ],
          }),
        }).catch(() => null),
        
        fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: perplexityHeaders,
          body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
              { role: 'system', content: 'Szukaj projektów i konkurencji. Priorytetyzuj duże projekty z kwotami.' },
              { role: 'user', content: projectsQuery }
            ],
          }),
        }).catch(() => null),
        
        fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: perplexityHeaders,
          body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
              { role: 'system', content: 'Szukaj newsów i CSR. Każdy news z datą i źródłem.' },
              { role: 'user', content: newsQuery }
            ],
            search_recency_filter: 'year',
          }),
        }).catch(() => null),
      ]);

      // Process responses
      if (profileResp?.ok) {
        const data = await profileResp.json();
        perplexityProfileInsights = data.choices?.[0]?.message?.content || null;
        perplexityCitations = [...perplexityCitations, ...(data.citations || [])];
      }
      if (financialResp?.ok) {
        const data = await financialResp.json();
        perplexityFinancialInsights = data.choices?.[0]?.message?.content || null;
        perplexityCitations = [...perplexityCitations, ...(data.citations || [])];
      }
      if (locationResp?.ok) {
        const data = await locationResp.json();
        perplexityLocationInsights = data.choices?.[0]?.message?.content || null;
        perplexityCitations = [...perplexityCitations, ...(data.citations || [])];
      }
      if (projectsResp?.ok) {
        const data = await projectsResp.json();
        perplexityProjectsInsights = data.choices?.[0]?.message?.content || null;
        perplexityCitations = [...perplexityCitations, ...(data.citations || [])];
      }
      if (newsResp?.ok) {
        const data = await newsResp.json();
        perplexityNewsInsights = data.choices?.[0]?.message?.content || null;
        perplexityCitations = [...perplexityCitations, ...(data.citations || [])];
      }
      
      perplexityCitations = [...new Set(perplexityCitations)];
      console.log('Perplexity queries completed. Citations:', perplexityCitations.length);
    }

    // ==========================================
    // PHASE 4: AI SYNTHESIS WITH PRIORITY MERGE
    // ==========================================
    console.log('=== PHASE 4: AI SYNTHESIS ===');
    
    const hasProfileInsights = !!perplexityProfileInsights;
    const hasFinancialInsights = !!perplexityFinancialInsights;
    const hasLocationInsights = !!perplexityLocationInsights;
    const hasProjectsInsights = !!perplexityProjectsInsights;
    const hasNewsInsights = !!perplexityNewsInsights;
    const hasPerplexity = hasProfileInsights || hasFinancialInsights || hasLocationInsights || hasProjectsInsights || hasNewsInsights;
    const hasScrapedContent = scrapedPages.some(p => p.content);
    const hasAnyData = hasPerplexity || hasScrapedContent || hasVerifiedRegistryData;

    // Build KRS data section for AI context
    let krsDataSection = '';
    if (krsData) {
      krsDataSection = `
═══════════════════════════════════════════════════════════════════
🔐 DANE ZWERYFIKOWANE Z KRS API (100% PEWNOŚĆ - UŻYJ DOKŁADNIE):
═══════════════════════════════════════════════════════════════════
Nazwa oficjalna: ${krsData.name || 'brak'}
Forma prawna: ${krsData.legal_form || 'brak'}
NIP: ${krsData.nip || 'brak'}
REGON: ${krsData.regon || 'brak'}
KRS: ${krsData.krs}
Adres: ${krsData.address || 'brak'}
Miasto: ${krsData.city || 'brak'}
Kod pocztowy: ${krsData.postal_code || 'brak'}
${krsData.capital ? `Kapitał zakładowy: ${krsData.capital} PLN` : ''}
${krsData.pkd_main ? `PKD główne: ${krsData.pkd_main}` : ''}
${krsData.pkd_codes.length > 0 ? `PKD wszystkie: ${krsData.pkd_codes.join(', ')}` : ''}

ZARZĄD (z KRS):
${krsData.management.map(m => `- ${m.name}: ${m.position}`).join('\n') || 'brak danych'}

WSPÓLNICY (z KRS):
${krsData.partners.map(p => `- ${p.name}: ${p.position}`).join('\n') || 'brak danych'}

⚠️ UWAGA: Powyższe dane są ZWERYFIKOWANE i muszą być użyte DOKŁADNIE w odpowiedzi.
`;
    }

    const systemPrompt = hasAnyData
      ? `Jesteś analitykiem biznesowym. Stwórz szczegółowy profil firmy w JSON.

📊 ŹRÓDŁA DANYCH (PRIORYTET):
1. KRS API: ${hasVerifiedRegistryData ? 'TAK (100% pewność - użyj dokładnie!)' : 'NIE'}
2. Strona firmowa (Firecrawl): ${scrapingStats.successful_scrapes} stron, ${scrapingStats.total_words} słów (90% pewność)
3. Perplexity: ${[hasProfileInsights, hasFinancialInsights, hasLocationInsights, hasProjectsInsights, hasNewsInsights].filter(Boolean).length}/5 zapytań (70% pewność)

🎯 ZASADY PRIORYTETÓW:
- Dane z KRS API → nadpisują WSZYSTKO (NIP, REGON, KRS, adres, zarząd, wspólnicy)
- Dane ze strony firmowej → wysokie zaufanie
- Dane z Perplexity → średnie zaufanie
- NIE wymyślaj danych jeśli ich nie masz → użyj null

🎯 STRUKTURA JSON:
1. PODSTAWOWE: name, short_name, legal_form, industry, sub_industries[], description (200 słów), tagline, year_founded
2. HISTORIA: timeline[{year, event, impact, source}], major_transformations[]
3. FINANSE: revenue{amount, year, currency, source}, revenue_history[], growth_rate, employee_count, market_position, ranking_positions[]
4. MODEL BIZNESOWY: business_model, value_proposition, competitive_advantages[], target_markets[]
5. PRODUKTY: products[{name, category, description}], services[], flagship_products[]
6. MARKI: own_brands[], represented_brands[], partnerships[]
7. LOKALIZACJE: headquarters{address, city, postal_code}, locations[], geographic_coverage
8. KLIENCI/PROJEKTY: key_clients[], reference_projects[{project_name, client, value_pln, year, scope}]
9. KONKURENCJA: main_competitors[], competitive_position
10. OFERTA: offer_summary, unique_selling_points[], certifications[], awards[]
11. CZEGO SZUKA: seeking_clients, seeking_partners, hiring_positions[], expansion_plans
12. POTENCJAŁ WSPÓŁPRACY: collaboration_opportunities[], ideal_partner_profile
13. ZARZĄD: management[{name, position, since_year, background}], company_size
14. NEWSY: recent_news[{date, title, summary, source, sentiment}], market_signals[]
15. CSR: csr_activities[], environmental_policy, social_initiatives[]
16. REJESTROWE: nip, regon, krs, registration_address

METADATA: analysis_confidence, data_freshness, missing_sections[], primary_sources[], data_sources_confidence{}

Odpowiedź TYLKO w JSON.`
      : `Stwórz minimalny profil firmy na podstawie nazwy. Ustaw confidence: "low". NIE wymyślaj danych. Zwróć JSON.`;

    let userContent = `Przeprowadź analizę strategiczną firmy:

Nazwa firmy: ${company_name}
${targetWebsite ? `Strona www: ${targetWebsite}` : ''}
${industry_hint ? `Wskazówka branżowa: ${industry_hint}` : ''}

`;

    // Add KRS data first (highest priority)
    if (krsDataSection) {
      userContent += krsDataSection;
    }

    // Add Perplexity insights
    if (hasProfileInsights) {
      userContent += `
═══════════════════════════════════════════════════════════════════
📊 PROFIL FIRMY (Perplexity - 70% pewność):
═══════════════════════════════════════════════════════════════════
${perplexityProfileInsights}

`;
    }

    if (hasFinancialInsights) {
      userContent += `
═══════════════════════════════════════════════════════════════════
💰 DANE FINANSOWE (Perplexity - 70% pewność):
═══════════════════════════════════════════════════════════════════
${perplexityFinancialInsights}

`;
    }

    if (hasLocationInsights) {
      userContent += `
═══════════════════════════════════════════════════════════════════
📍 LOKALIZACJE (Perplexity - 70% pewność):
═══════════════════════════════════════════════════════════════════
${perplexityLocationInsights}

`;
    }

    if (hasProjectsInsights) {
      userContent += `
═══════════════════════════════════════════════════════════════════
🏗️ PROJEKTY I KONKURENCJA (Perplexity - 70% pewność):
═══════════════════════════════════════════════════════════════════
${perplexityProjectsInsights}

`;
    }

    if (hasNewsInsights) {
      userContent += `
═══════════════════════════════════════════════════════════════════
📰 AKTUALNOŚCI I CSR (Perplexity - 70% pewność):
═══════════════════════════════════════════════════════════════════
${perplexityNewsInsights}

`;
    }

    // Add scraped content
    if (hasScrapedContent) {
      userContent += `
═══════════════════════════════════════════════════════════════════
🌐 TREŚCI ZE STRONY FIRMOWEJ (Firecrawl - 90% pewność):
═══════════════════════════════════════════════════════════════════
`;
      for (const page of scrapedPages.filter(p => p.content)) {
        const truncatedContent = page.content!.length > 3000 ? page.content!.substring(0, 3000) + '...' : page.content;
        userContent += `
--- ${page.category.toUpperCase()}: ${page.title} ---
${truncatedContent}

`;
      }
    }

    if (perplexityCitations.length > 0) {
      userContent += `
═══════════════════════════════════════════════════════════════════
🔗 ŹRÓDŁA PERPLEXITY:
═══════════════════════════════════════════════════════════════════
${perplexityCitations.slice(0, 15).join('\n')}
`;
    }

    userContent += `

WAŻNE: Zwróć TYLKO poprawny JSON bez markdown. Użyj danych z KRS jako PRIORYTETOWE dla: nip, regon, krs, headquarters, management.`;

    // Call AI for synthesis
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    
    let response;
    try {
      response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
        }),
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timeout);
      if (e instanceof Error && e.name === 'AbortError') {
        console.warn('AI synthesis timed out, returning partial data');
        
        const fallbackAnalysis = {
          name: krsData?.name || company_name,
          nip: extractedRegistryIds.nip,
          regon: extractedRegistryIds.regon,
          krs: extractedRegistryIds.krs,
          legal_form: krsData?.legal_form || null,
          headquarters: krsData ? {
            address: krsData.address,
            city: krsData.city,
            postal_code: krsData.postal_code,
            country: 'Polska'
          } : null,
          management: krsData?.management || [],
          perplexity_raw: {
            profile: perplexityProfileInsights,
            financial: perplexityFinancialInsights,
            locations: perplexityLocationInsights,
            projects: perplexityProjectsInsights,
            news: perplexityNewsInsights
          },
          confidence: hasVerifiedRegistryData ? 'medium' : 'low',
          analysis_confidence_score: hasVerifiedRegistryData ? 0.5 : 0.3,
          missing_sections: ['Pełna analiza AI - przekroczono limit czasu'],
          data_sources_confidence: {
            registry: hasVerifiedRegistryData ? { source: 'krs_api', confidence: 100 } : null,
          }
        };
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            partial: true,
            message: 'Analiza częściowa - przekroczono limit czasu AI.',
            data: fallbackAnalysis
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw e;
    }
    
    clearTimeout(timeout);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Przekroczono limit zapytań, spróbuj ponownie za chwilę' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Brak środków na koncie AI' }),
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

    // Safely parse AI response
    let data;
    try {
      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        console.error('Empty AI response body');
        return new Response(
          JSON.stringify({ error: 'Pusta odpowiedź od AI - spróbuj ponownie' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.error('Failed to parse AI response as JSON:', jsonError);
      return new Response(
        JSON.stringify({ error: 'Nieprawidłowa odpowiedź od AI - spróbuj ponownie' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('No content in AI response. Data:', JSON.stringify(data).substring(0, 500));
      return new Response(
        JSON.stringify({ error: 'Brak odpowiedzi od AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON response
    let enrichedData;
    try {
      let cleanedContent = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleanedContent = jsonMatch[0];
      
      try {
        enrichedData = JSON.parse(cleanedContent);
      } catch {
        // Try to fix truncated JSON
        let fixedContent = cleanedContent
          .replace(/,\s*"[^"]*"?\s*:?\s*"?[^"{}[\],]*$/g, '')
          .replace(/,\s*\[[^\]]*$/g, '')
          .replace(/,\s*\{[^}]*$/g, '')
          .replace(/,\s*$/g, '');
        
        const openBraces = (fixedContent.match(/\{/g) || []).length;
        const closeBraces = (fixedContent.match(/\}/g) || []).length;
        const openBrackets = (fixedContent.match(/\[/g) || []).length;
        const closeBrackets = (fixedContent.match(/\]/g) || []).length;
        const quotes = (fixedContent.match(/"/g) || []).length;
        
        if (quotes % 2 !== 0) fixedContent += '"';
        for (let i = 0; i < openBrackets - closeBrackets; i++) fixedContent += ']';
        for (let i = 0; i < openBraces - closeBraces; i++) fixedContent += '}';
        
        enrichedData = JSON.parse(fixedContent);
      }
      
      // ==========================================
      // OVERRIDE WITH KRS DATA (100% priority)
      // ==========================================
      if (krsData) {
        console.log('Overriding AI data with verified KRS data');
        
        if (krsData.nip) enrichedData.nip = krsData.nip;
        if (krsData.regon) enrichedData.regon = krsData.regon;
        enrichedData.krs = krsData.krs;
        if (krsData.legal_form) enrichedData.legal_form = krsData.legal_form;
        
        enrichedData.headquarters = {
          address: krsData.address || enrichedData.headquarters?.address,
          city: krsData.city || enrichedData.headquarters?.city,
          postal_code: krsData.postal_code || enrichedData.headquarters?.postal_code,
          country: 'Polska'
        };
        
        if (krsData.management.length > 0) {
          enrichedData.management = krsData.management.map(m => ({
            name: m.name,
            position: m.position,
            source: 'krs_api',
            verified: true
          }));
        }
        
        if (krsData.capital) {
          enrichedData.share_capital = krsData.capital;
        }
        
        if (krsData.pkd_main) {
          enrichedData.pkd_main = krsData.pkd_main;
          enrichedData.pkd_codes = krsData.pkd_codes;
        }
      } else {
        // Use extracted IDs from website if no KRS API data
        if (extractedRegistryIds.nip && isValidNIP(extractedRegistryIds.nip)) {
          enrichedData.nip = extractedRegistryIds.nip;
        }
        if (extractedRegistryIds.regon && isValidREGON(extractedRegistryIds.regon)) {
          enrichedData.regon = extractedRegistryIds.regon;
        }
        if (extractedRegistryIds.krs && isValidKRS(extractedRegistryIds.krs)) {
          enrichedData.krs = extractedRegistryIds.krs;
        }
      }
      
      // Validate remaining NIP/REGON/KRS
      if (enrichedData.nip) {
        const cleanedNip = enrichedData.nip.replace(/[^0-9]/g, '');
        enrichedData.nip = isValidNIP(cleanedNip) ? cleanedNip : null;
      }
      if (enrichedData.regon) {
        const cleanedRegon = enrichedData.regon.replace(/[^0-9]/g, '');
        enrichedData.regon = isValidREGON(cleanedRegon) ? cleanedRegon : null;
      }
      if (enrichedData.krs) {
        const cleanedKrs = enrichedData.krs.replace(/[^0-9]/g, '').padStart(10, '0');
        enrichedData.krs = isValidKRS(cleanedKrs) ? cleanedKrs : null;
      }
      
      // Calculate confidence score
      const confidenceScore = calculateConfidenceScore(enrichedData, hasVerifiedRegistryData);
      const missingSections = identifyMissingSections(enrichedData);
      
      let overallConfidence = 'low';
      if (confidenceScore >= 0.7) overallConfidence = 'high';
      else if (confidenceScore >= 0.5) overallConfidence = 'medium';
      
      enrichedData.confidence_score = confidenceScore;
      
      // Add metadata
      enrichedData.enrichment_metadata = {
        completed_at: new Date().toISOString(),
        perplexity_queries_used: [hasProfileInsights, hasFinancialInsights, hasLocationInsights, hasProjectsInsights, hasNewsInsights].filter(Boolean).length,
        perplexity_queries_detail: {
          profile: hasProfileInsights,
          financial: hasFinancialInsights,
          location: hasLocationInsights,
          projects: hasProjectsInsights,
          news: hasNewsInsights,
        },
        firecrawl_stats: scrapingStats,
        krs_api_used: hasVerifiedRegistryData,
        confidence_score: confidenceScore,
        overall_confidence: overallConfidence,
        data_freshness: new Date().getFullYear().toString(),
        missing_sections: missingSections,
        sections_with_data: 16 - missingSections.length,
        perplexity_citations: perplexityCitations,
        sources_count: perplexityCitations.length,
        data_sources_confidence: {
          registry: hasVerifiedRegistryData 
            ? { source: 'krs_api', confidence: 100, nip_verified: !!krsData?.nip, krs_verified: true }
            : extractedRegistryIds.nip || extractedRegistryIds.krs
              ? { source: 'website', confidence: 90, nip_verified: !!extractedRegistryIds.nip, krs_verified: !!extractedRegistryIds.krs }
              : null,
          financial: hasFinancialInsights ? { source: 'perplexity', confidence: 70 } : null,
          management: hasVerifiedRegistryData ? { source: 'krs_api', confidence: 100 } : null,
          locations: hasLocationInsights || hasScrapedContent ? { source: hasScrapedContent ? 'firecrawl' : 'perplexity', confidence: hasScrapedContent ? 90 : 70 } : null,
        }
      };
      
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return new Response(
        JSON.stringify({ error: 'Nie udało się przetworzyć danych firmy' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add logo
    if (!logo_url) {
      const suggestedWebsite = enrichedData.suggested_website || targetWebsite;
      if (suggestedWebsite) {
        const suggestedDomain = extractDomain(suggestedWebsite);
        if (suggestedDomain) {
          const clearbitUrl = getClearbitLogoUrl(suggestedDomain);
          if (clearbitUrl) {
            const isValid = await isLogoValid(clearbitUrl);
            if (isValid) logo_url = clearbitUrl;
          }
        }
      }
    }
    enrichedData.logo_url = logo_url;

    console.log('=== ENRICHMENT COMPLETE ===');
    console.log('Company:', enrichedData.name);
    console.log('KRS Verified:', hasVerifiedRegistryData);
    console.log('Confidence:', enrichedData.confidence_score);

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
