import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Priority pages to scan
const PAGE_PRIORITIES: Record<string, number> = {
  'o-nas': 10, 'about': 10, 'o-firmie': 10, 'kim-jestesmy': 10, 'about-us': 10,
  'oferta': 9, 'uslugi': 9, 'services': 9, 'offer': 9, 'produkty': 9, 'products': 9,
  'realizacje': 8, 'portfolio': 8, 'projekty': 8, 'projects': 8, 'case-studies': 8,
  'referencje': 7, 'klienci': 7, 'clients': 7, 'references': 7, 'opinie': 7, 'testimonials': 7, 'reviews': 7,
  'marki': 7, 'brands': 7, 'producenci': 7, 'dealers': 7, 'partnerzy': 7, 'partners': 7,
  'zespol': 6, 'team': 6, 'zarzad': 6, 'management': 6, 'nasz-zespol': 6,
  'historia': 5, 'history': 5, 'o-nas/historia': 5,
  'aktualnosci': 4, 'news': 4, 'blog': 4, 'nowosci': 4,
  'kontakt': 3, 'contact': 3,
  'kariera': 2, 'careers': 2, 'praca': 2,
};

// Social media patterns
const SOCIAL_PATTERNS = {
  linkedin: /linkedin\.com\/company\/[^\/\s"']+/gi,
  facebook: /facebook\.com\/[^\/\s"']+/gi,
  instagram: /instagram\.com\/[^\/\s"']+/gi,
  twitter: /(?:twitter|x)\.com\/[^\/\s"']+/gi,
  youtube: /youtube\.com\/(?:channel|c|user)\/[^\/\s"']+/gi,
};

// Map URL to get Firecrawl
async function mapWebsite(url: string, apiKey: string): Promise<{ links: string[]; error?: string }> {
  try {
    console.log(`[Firecrawl] Mapping ${url}`);
    
    const response = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        limit: 100,
        includeSubdomains: false,
      }),
    });

    if (!response.ok) {
      console.error('[Firecrawl] Map failed:', response.status);
      if (response.status === 402) {
        return { links: [], error: 'firecrawl_quota_exceeded' };
      }
      return { links: [] };
    }

    const data = await response.json();
    return { links: data?.links || [] };
  } catch (error) {
    console.error('[Firecrawl] Map error:', error);
    return { links: [] };
  }
}

// Prioritize URLs
function prioritizeUrls(urls: string[], baseUrl: string): string[] {
  const scored = urls.map(url => {
    const path = url.replace(baseUrl, '').toLowerCase();
    let score = 0;
    
    for (const [pattern, priority] of Object.entries(PAGE_PRIORITIES)) {
      if (path.includes(pattern)) {
        score = Math.max(score, priority);
      }
    }
    
    // Penalize deep paths
    const depth = (path.match(/\//g) || []).length;
    score -= depth * 0.5;
    
    // Penalize pages with query params or anchors
    if (url.includes('?') || url.includes('#')) score -= 3;
    
    // Penalize specific file types
    if (/\.(pdf|jpg|png|gif|zip|doc)$/i.test(url)) score -= 10;
    
    return { url, score };
  });
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  // Return top 20 unique URLs
  const seen = new Set<string>();
  const result: string[] = [];
  
  for (const { url } of scored) {
    const normalized = url.replace(/\/$/, '');
    if (!seen.has(normalized) && result.length < 20) {
      seen.add(normalized);
      result.push(url);
    }
  }
  
  return result;
}

// Scrape a single page
async function scrapePage(url: string, apiKey: string): Promise<{ url: string; content: string; title?: string; error?: string } | null> {
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'links'],
        onlyMainContent: true,
      }),
    });

    if (!response.ok) {
      console.error(`[Firecrawl] Scrape failed for ${url}:`, response.status);
      if (response.status === 402) {
        return { url, content: '', error: 'firecrawl_quota_exceeded' };
      }
      return null;
    }

    const data = await response.json();
    return {
      url,
      content: data?.data?.markdown || '',
      title: data?.data?.metadata?.title || '',
    };
  } catch (error) {
    console.error(`[Firecrawl] Scrape error for ${url}:`, error);
    return null;
  }
}

// Extract social media links from content
function extractSocialMedia(content: string): Record<string, string | null> {
  const result: Record<string, string | null> = {
    linkedin: null,
    facebook: null,
    instagram: null,
    twitter: null,
    youtube: null,
  };

  for (const [platform, pattern] of Object.entries(SOCIAL_PATTERNS)) {
    const matches = content.match(pattern);
    if (matches && matches[0]) {
      result[platform] = 'https://' + matches[0].replace(/^https?:\/\//, '');
    }
  }

  return result;
}

// Extract address from content
function extractAddressFromContent(content: string): { 
  address?: string; 
  city?: string; 
  postal_code?: string 
} {
  const result: { address?: string; city?: string; postal_code?: string } = {};
  
  // Pattern 1: "ul./al. Nazwa 123" or "ulica Nazwa 123/4"
  const streetPattern = /(?:ul\.|ulica|al\.|aleja|os\.|osiedle|pl\.|plac)\s+([A-ZŻŹĆĄŚĘŁÓŃa-zżźćąśęłóń\s\-\.]+\s+\d+[a-zA-Z]?(?:\/\d+)?)/gi;
  const streetMatch = content.match(streetPattern);
  if (streetMatch && streetMatch[0]) {
    result.address = streetMatch[0].trim();
  }
  
  // Pattern 2: Postal code + city "00-000 Miasto" or "00-000, Miasto"
  const postalCityPattern = /(\d{2}[-\s]?\d{3})\s*[,\s]\s*([A-ZŁÓŚŻŹĆĄ][a-złóśżźćąę]+(?:[\s\-][A-ZŁÓŚŻŹĆĄ]?[a-złóśżźćąę]+)*)/g;
  const postalMatch = postalCityPattern.exec(content);
  if (postalMatch) {
    result.postal_code = postalMatch[1].replace(/\s/g, '-');
    result.city = postalMatch[2].trim();
  }
  
  // Pattern 3: Address in Contact section
  if (!result.address) {
    const contactSection = content.match(/(?:kontakt|adres|siedziba)[:\s]*([^\n]{10,150})/i);
    if (contactSection) {
      const sectionText = contactSection[1];
      const streetInSection = sectionText.match(/(?:ul\.|ulica|al\.)\s+[A-ZŻŹĆĄŚĘŁÓŃa-zżźćąśęłóń\s\-\.]+\d+/i);
      if (streetInSection) {
        result.address = streetInSection[0].trim();
      }
    }
  }
  
  return result;
}

// Noise patterns to filter out generic/navigation text
const NOISE_PATTERNS = [
  /^realizacje$/i,
  /^referencje$/i,
  /^partnerzy$/i,
  /^klienci$/i,
  /^usługi$/i,
  /^produkty$/i,
  /^oferta$/i,
  /^galeria/i,
  /^zobacz/i,
  /^czytaj dalej/i,
  /^dowiedz się/i,
  /^więcej$/i,
  /wśród naszych/i,
  /znajdują się/i,
  /poniżej przedstawiamy/i,
  /przykłady realizacji/i,
  /^nasze /i,
  /^nasi /i,
  /renomowanego/i,
  /dostawcy.*usług$/i,
  /dostawcy.*komponentów$/i,
  /m\.in\.:?$/i,
  /^strona główna$/i,
  /^home$/i,
  /^kontakt$/i,
  /^o nas$/i,
  /^about$/i,
  /^menu$/i,
  /^nawigacja$/i,
  /^footer$/i,
  /^copyright/i,
  /wszelkie prawa/i,
  /^previous$/i,
  /^next$/i,
  /^poprzedni/i,
  /^następny/i,
  /^wróć$/i,
  /^back$/i,
  /^loading/i,
  /^ładowanie/i,
  /^\d+$/,
  /^page \d+/i,
  /^strona \d+/i,
];

function isNoise(text: string): boolean {
  const trimmed = text.trim();
  // Too short or too long
  if (trimmed.length < 5 || trimmed.length > 150) return true;
  // All caps (likely navigation)
  if (trimmed === trimmed.toUpperCase() && trimmed.length < 20) return true;
  // Check patterns
  return NOISE_PATTERNS.some(pattern => pattern.test(trimmed));
}

function cleanList(items: string[]): string[] {
  return [...new Set(items)]
    .map(item => item.replace(/^[-–•*#\s]+/, '').trim())
    .filter(item => !isNoise(item))
    .filter(item => item.length > 3);
}

// Section header patterns for content-based extraction
const SECTION_HEADERS = {
  services: ['usługi', 'oferta', 'zakres usług', 'co oferujemy', 'nasze usługi', 'services', 'what we offer', 'nasza oferta', 'zakres działalności'],
  products: ['produkty', 'asortyment', 'w ofercie', 'products', 'modele', 'nasza oferta produktowa', 'nasze produkty'],
  brands: ['marki', 'producenci', 'partnerzy', 'brands', 'partners', 'współpracujemy z', 'nasze marki', 'reprezentowane marki', 'autoryzowany dealer', 'autoryzowany serwis'],
  realizations: ['realizacje', 'portfolio', 'projekty', 'case studies', 'nasze projekty', 'wykonane prace', 'nasze realizacje', 'references', 'referencje projektów'],
  references: ['referencje', 'opinie', 'testimonials', 'reviews', 'klienci', 'clients', 'nasi klienci', 'zaufali nam', 'współpracowaliśmy z'],
};

// Helper function to capitalize words
function capitalizeWords(str: string): string {
  return str.split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('-');
}

// Extract content under section headers in markdown
function extractSectionContent(content: string, sectionNames: string[]): string[] {
  const results: string[] = [];
  
  // Pattern to find headers with section names
  for (const sectionName of sectionNames) {
    // Match markdown headers (##, ###) containing the section name
    const headerPattern = new RegExp(
      `(?:^|\\n)#{1,4}\\s*[^\\n]*${sectionName}[^\\n]*\\n([\\s\\S]*?)(?=\\n#{1,4}\\s|$)`,
      'gi'
    );
    
    let match;
    while ((match = headerPattern.exec(content)) !== null) {
      const sectionContent = match[1];
      
      // Extract bullet points
      const bullets = sectionContent.match(/^[-*•]\s+(.+)$/gm);
      if (bullets) {
        results.push(...bullets.map(b => b.replace(/^[-*•]\s+/, '').trim()));
      }
      
      // Extract numbered items
      const numbered = sectionContent.match(/^\d+\.\s+(.+)$/gm);
      if (numbered) {
        results.push(...numbered.map(n => n.replace(/^\d+\.\s+/, '').trim()));
      }
      
      // Extract sub-headers (could be items themselves)
      const subHeaders = sectionContent.match(/^#{2,5}\s+([^\n]+)$/gm);
      if (subHeaders && subHeaders.length > 0 && subHeaders.length < 20) {
        results.push(...subHeaders.map(h => h.replace(/^#{2,5}\s+/, '').trim()));
      }
    }
  }
  
  return results;
}

// Extract brands from URL patterns (for car dealers, distributors etc.)
function extractBrandsFromUrls(urls: string[]): string[] {
  const brands: string[] = [];
  const brandPatterns = [
    /\/marka[s]?[-\/]([a-z-]+)/i,
    /\/brand[s]?[-\/]([a-z-]+)/i,
    /\/dealer[-\/]([a-z-]+)/i,
    /\/([a-z-]+)[-\/]dealer/i,
    /\/autoryzowany[-\/]([a-z-]+)/i,
    /\/a\/([a-z-]+)\//i,
  ];
  
  for (const url of urls) {
    for (const pattern of brandPatterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        const brand = match[1].replace(/-/g, ' ').trim();
        // Filter out common non-brand words
        if (brand.length > 1 && !['numer', 'oferta', 'kontakt', 'about', 'news'].includes(brand.toLowerCase())) {
          brands.push(capitalizeWords(brand));
        }
      }
    }
  }
  
  return [...new Set(brands)];
}

// Parse scraped content into structured data
function parseScrapedContent(pages: Array<{ url: string; content: string; title?: string }>): any {
  let description = '';
  let services: string[] = [];
  let products: string[] = [];
  let brands: string[] = [];
  let realizations: string[] = [];
  let references: string[] = [];
  let management_web: Array<{ name: string; position?: string }> = [];
  let company_history = '';
  let latest_news: Array<{ title: string; date?: string }> = [];
  let extracted_address: { address?: string; city?: string; postal_code?: string } = {};
  let allContent = '';
  const allUrls: string[] = [];

  for (const page of pages) {
    const lowerUrl = page.url.toLowerCase();
    const content = page.content;
    allContent += content + '\n';
    allUrls.push(page.url);

    // Description (about us)
    if (/o-nas|about|o-firmie|kim-jestesmy/.test(lowerUrl) && content.length > 100) {
      description = content.slice(0, 2000);
    }

    // ===== URL-BASED EXTRACTION (existing logic) =====
    
    // Services/Products from URL patterns
    if (/oferta|uslugi|services|produkty|products/.test(lowerUrl)) {
      const lines = content.split('\n').filter(l => l.trim().startsWith('- ') || l.trim().startsWith('* ') || l.trim().startsWith('## '));
      const items = lines.map(l => l.replace(/^[-*#\s]+/, '').trim()).filter(l => l.length > 3 && l.length < 100);
      if (lowerUrl.includes('produkt')) {
        products.push(...items);
      } else {
        services.push(...items);
      }
    }

    // Brands/Partners from URL patterns
    if (/marki|brands|producenci|dealers|partnerzy|partners/.test(lowerUrl)) {
      const headings = content.match(/(?:^|\n)#{1,3}\s*([^\n]+)/g) || [];
      brands.push(...headings.map(h => h.replace(/^[\n#\s]+/, '').trim()).filter(b => b.length > 2 && b.length < 50));
      
      const bullets = content.split('\n').filter(l => l.trim().startsWith('- ') || l.trim().startsWith('* '));
      brands.push(...bullets.map(l => l.replace(/^[-*\s]+/, '').trim()).filter(b => b.length > 2 && b.length < 50));
    }

    // References/Testimonials from URL patterns
    if (/referencje|opinie|testimonials|reviews|klienci|clients/.test(lowerUrl)) {
      const quotes = content.match(/"([^"]{20,200})"/g) || [];
      references.push(...quotes.slice(0, 10).map(q => q.replace(/"/g, '').trim()));
      
      const companyPattern = /(?:dla|for)\s+(?:firmy\s+)?([A-ZŻŹĆĄŚĘŁÓŃ][A-Za-zżźćąśęłóń\s&]+(?:Sp\.\s*z\s*o\.o\.|S\.A\.|Ltd|GmbH)?)/gi;
      let match;
      while ((match = companyPattern.exec(content)) !== null) {
        references.push(match[1].trim());
      }
    }

    // Management/Team
    if (/zespol|team|zarzad|management/.test(lowerUrl)) {
      const personPattern = /(?:^|\n)(?:#+\s*)?([A-ZŻŹĆĄŚĘŁÓŃ][a-zżźćąśęłóń]+\s+[A-ZŻŹĆĄŚĘŁÓŃ][a-zżźćąśęłóń]+)(?:\s*[-–—]\s*|\n\s*)([A-ZŻŹĆĄŚĘŁÓŃa-zżźćąśęłóń\s]+)?/g;
      let match;
      const seenNames = new Set<string>();
      while ((match = personPattern.exec(content)) !== null) {
        const name = match[1].trim();
        if (!seenNames.has(name)) {
          seenNames.add(name);
          const position = match[2]?.trim();
          management_web.push({
            name,
            position: position && position.length > 2 && position.length < 60 ? position : undefined
          });
        }
      }
    }

    // Company history
    if (/historia|history/.test(lowerUrl) && content.length > 100) {
      company_history = content.slice(0, 1500);
    }

    // Realizations/Portfolio from URL patterns
    if (/realizacje|portfolio|projekty|projects|case/.test(lowerUrl)) {
      const headings = content.match(/(?:^|\n)#{1,3}\s*([^\n]+)/g) || [];
      realizations.push(...headings.map(h => h.replace(/^[\n#\s]+/, '').trim()).filter(p => p.length > 3 && p.length < 100));
    }

    // Latest news
    if (/aktualnosci|news|blog/.test(lowerUrl)) {
      const headings = content.match(/(?:^|\n)#{1,3}\s*([^\n]+)/g) || [];
      headings.slice(0, 10).forEach(h => {
        const title = h.replace(/^[\n#\s]+/, '').trim();
        const dateMatch = title.match(/(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}|\d{4}[.\/-]\d{1,2}[.\/-]\d{1,2})/);
        latest_news.push({
          title: title.replace(/\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}/, '').trim(),
          date: dateMatch ? dateMatch[1] : undefined
        });
      });
    }
    
    // Extract address from contact/location pages
    if (/kontakt|contact|lokalizacja|location|o-nas|about/.test(lowerUrl)) {
      const addr = extractAddressFromContent(content);
      if (addr.address || addr.city || addr.postal_code) {
        extracted_address = { ...extracted_address, ...addr };
      }
    }
  }

  // ===== CONTENT-BASED EXTRACTION (NEW - fallback for any page) =====
  
  // If services are empty, try content-based extraction from all pages
  if (services.length === 0) {
    const contentServices = extractSectionContent(allContent, SECTION_HEADERS.services);
    services.push(...contentServices);
    console.log(`[parseScrapedContent] Content-based services found: ${contentServices.length}`);
  }
  
  // If products are empty, try content-based extraction
  if (products.length === 0) {
    const contentProducts = extractSectionContent(allContent, SECTION_HEADERS.products);
    products.push(...contentProducts);
    console.log(`[parseScrapedContent] Content-based products found: ${contentProducts.length}`);
  }
  
  // If brands are empty, try content-based extraction
  if (brands.length === 0) {
    const contentBrands = extractSectionContent(allContent, SECTION_HEADERS.brands);
    brands.push(...contentBrands);
    console.log(`[parseScrapedContent] Content-based brands found: ${contentBrands.length}`);
  }
  
  // If brands are still empty, try URL pattern extraction (for car dealers etc.)
  if (brands.length === 0) {
    const urlBrands = extractBrandsFromUrls(allUrls);
    brands.push(...urlBrands);
    console.log(`[parseScrapedContent] URL-based brands found: ${urlBrands.length}`);
  }
  
  // If realizations are empty, try content-based extraction
  if (realizations.length === 0) {
    const contentRealizations = extractSectionContent(allContent, SECTION_HEADERS.realizations);
    realizations.push(...contentRealizations);
    console.log(`[parseScrapedContent] Content-based realizations found: ${contentRealizations.length}`);
  }
  
  // If references are empty, try content-based extraction
  if (references.length === 0) {
    const contentReferences = extractSectionContent(allContent, SECTION_HEADERS.references);
    references.push(...contentReferences);
    console.log(`[parseScrapedContent] Content-based references found: ${contentReferences.length}`);
  }

  // ===== FINAL DEDUPLICATION AND CLEANING =====
  
  services = cleanList(services).slice(0, 15);
  products = cleanList(products).slice(0, 15);
  brands = cleanList(brands).slice(0, 15);
  realizations = cleanList(realizations).slice(0, 15);
  references = cleanList(references).slice(0, 15);
  management_web = management_web.slice(0, 10);
  latest_news = latest_news.filter(n => n.title && !isNoise(n.title)).slice(0, 10);

  // Extract social media from all content
  const social_media_links = extractSocialMedia(allContent);

  return {
    description: description || null,
    services: services.length > 0 ? services : null,
    products: products.length > 0 ? products : null,
    brands: brands.length > 0 ? brands : null,
    realizations: realizations.length > 0 ? realizations : null,
    references: references.length > 0 ? references : null,
    management_web: management_web.length > 0 ? management_web : null,
    company_history: company_history || null,
    latest_news: latest_news.length > 0 ? latest_news : null,
    social_media_links,
    extracted_address: (extracted_address.address || extracted_address.city || extracted_address.postal_code) 
      ? extracted_address 
      : null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company_id, website } = await req.json();

    if (!company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!website) {
      return new Response(
        JSON.stringify({ success: false, error: 'website is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY') || Deno.env.get('FIRECRAWL_API_KEY_1');
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize URL
    let normalizedUrl = website.trim();
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    normalizedUrl = normalizedUrl.replace(/\/$/, '');

    console.log(`[Stage 2] Starting website scan for: ${normalizedUrl}`);

    // Update status to processing
    await supabase
      .from('companies')
      .update({ www_data_status: 'processing' })
      .eq('id', company_id);

    // Step 1: Map the website
    const mapResult = await mapWebsite(normalizedUrl, firecrawlKey);
    console.log(`[Stage 2] Found ${mapResult.links.length} URLs`);

    // Check for quota exceeded
    if (mapResult.error === 'firecrawl_quota_exceeded') {
      await supabase
        .from('companies')
        .update({ www_data_status: 'failed' })
        .eq('id', company_id);

      return new Response(
        JSON.stringify({ success: false, error: 'Limit kredytów Firecrawl wyczerpany. Sprawdź subskrypcję.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (mapResult.links.length === 0) {
      // Try to at least scrape the homepage
      const homepage = await scrapePage(normalizedUrl, firecrawlKey);
      
      // Check for quota exceeded on homepage scrape
      if (homepage?.error === 'firecrawl_quota_exceeded') {
        await supabase
          .from('companies')
          .update({ www_data_status: 'failed' })
          .eq('id', company_id);

        return new Response(
          JSON.stringify({ success: false, error: 'Limit kredytów Firecrawl wyczerpany. Sprawdź subskrypcję.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (homepage && homepage.content) {
        const wwwData = {
          pages_scanned: 1,
          crawled_at: new Date().toISOString(),
          description: homepage.content.slice(0, 2000),
          social_media_links: extractSocialMedia(homepage.content),
          urls_found: 0,
          crawled_urls: [normalizedUrl],
        };

        await supabase
          .from('companies')
          .update({
            www_data: wwwData,
            www_data_status: 'completed',
            www_data_date: new Date().toISOString(),
          })
          .eq('id', company_id);

        return new Response(
          JSON.stringify({ success: true, data: wwwData, pages_scanned: 1 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase
        .from('companies')
        .update({ www_data_status: 'failed' })
        .eq('id', company_id);

      return new Response(
        JSON.stringify({ success: false, error: 'Nie udało się uzyskać dostępu do strony WWW' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const allUrls = mapResult.links;

    // Step 2: Prioritize URLs
    const prioritizedUrls = prioritizeUrls(allUrls, normalizedUrl);
    console.log(`[Stage 2] Prioritized ${prioritizedUrls.length} URLs for scraping`);

    // Step 3: Scrape prioritized pages (limit to 15 to avoid timeout)
    const scrapedPages: Array<{ url: string; content: string; title?: string }> = [];
    
    for (const url of prioritizedUrls.slice(0, 15)) {
      const page = await scrapePage(url, firecrawlKey);
      if (page && page.content.length > 50) {
        scrapedPages.push(page);
      }
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 200));
    }

    console.log(`[Stage 2] Successfully scraped ${scrapedPages.length} pages`);

    // Step 4: Parse content into structured data
    const parsedData = parseScrapedContent(scrapedPages);

    const wwwData = {
      ...parsedData,
      pages_scanned: scrapedPages.length,
      urls_found: allUrls.length,
      crawled_at: new Date().toISOString(),
      crawled_urls: scrapedPages.map(p => p.url),
    };

    // Get current company data to avoid overwriting existing values
    const { data: currentCompany } = await supabase
      .from('companies')
      .select('address, city, postal_code, website')
      .eq('id', company_id)
      .single();

    // Prepare update data
    const updateData: Record<string, any> = {
      www_data: wwwData,
      www_data_status: 'completed',
      www_data_date: new Date().toISOString(),
    };

    // Auto-fill address fields only if currently empty
    if (!currentCompany?.address && parsedData.extracted_address?.address) {
      updateData.address = parsedData.extracted_address.address;
      console.log('[Stage 2] Auto-filling address:', parsedData.extracted_address.address);
    }
    if (!currentCompany?.city && parsedData.extracted_address?.city) {
      updateData.city = parsedData.extracted_address.city;
      console.log('[Stage 2] Auto-filling city:', parsedData.extracted_address.city);
    }
    if (!currentCompany?.postal_code && parsedData.extracted_address?.postal_code) {
      updateData.postal_code = parsedData.extracted_address.postal_code;
      console.log('[Stage 2] Auto-filling postal_code:', parsedData.extracted_address.postal_code);
    }

    // Save website URL to company if it was missing
    if (!currentCompany?.website) {
      updateData.website = normalizedUrl;
      console.log('[Stage 2] Auto-filling website:', normalizedUrl);
    }

    // Save to database
    const { error: updateError } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', company_id);

    if (updateError) {
      console.error('[Stage 2] Database update error:', updateError);
      throw updateError;
    }

    console.log(`[Stage 2] Completed successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: wwwData,
        pages_scanned: scrapedPages.length,
        urls_found: allUrls.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Stage 2] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
