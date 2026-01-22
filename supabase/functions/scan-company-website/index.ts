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

  for (const page of pages) {
    const lowerUrl = page.url.toLowerCase();
    const content = page.content;
    allContent += content + '\n';

    // Description (about us)
    if (/o-nas|about|o-firmie|kim-jestesmy/.test(lowerUrl) && content.length > 100) {
      description = content.slice(0, 2000);
    }

    // Services/Products
    if (/oferta|uslugi|services|produkty|products/.test(lowerUrl)) {
      const lines = content.split('\n').filter(l => l.trim().startsWith('- ') || l.trim().startsWith('* ') || l.trim().startsWith('## '));
      const items = lines.map(l => l.replace(/^[-*#\s]+/, '').trim()).filter(l => l.length > 3 && l.length < 100);
      if (lowerUrl.includes('produkt')) {
        products.push(...items);
      } else {
        services.push(...items);
      }
    }

    // Brands/Partners
    if (/marki|brands|producenci|dealers|partnerzy|partners/.test(lowerUrl)) {
      const headings = content.match(/(?:^|\n)#{1,3}\s*([^\n]+)/g) || [];
      brands.push(...headings.map(h => h.replace(/^[\n#\s]+/, '').trim()).filter(b => b.length > 2 && b.length < 50));
      
      const bullets = content.split('\n').filter(l => l.trim().startsWith('- ') || l.trim().startsWith('* '));
      brands.push(...bullets.map(l => l.replace(/^[-*\s]+/, '').trim()).filter(b => b.length > 2 && b.length < 50));
    }

    // References/Testimonials
    if (/referencje|opinie|testimonials|reviews|klienci|clients/.test(lowerUrl)) {
      // Look for quotes
      const quotes = content.match(/"([^"]{20,200})"/g) || [];
      references.push(...quotes.slice(0, 10).map(q => q.replace(/"/g, '').trim()));
      
      // Look for company names in references
      const companyPattern = /(?:dla|for)\s+(?:firmy\s+)?([A-ZŻŹĆĄŚĘŁÓŃ][A-Za-zżźćąśęłóń\s&]+(?:Sp\.\s*z\s*o\.o\.|S\.A\.|Ltd|GmbH)?)/gi;
      let match;
      while ((match = companyPattern.exec(content)) !== null) {
        references.push(match[1].trim());
      }
    }

    // Management/Team (with positions)
    if (/zespol|team|zarzad|management/.test(lowerUrl)) {
      // Pattern: Name - Position or Name\nPosition
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

    // Realizations/Portfolio
    if (/realizacje|portfolio|projekty|projects|case/.test(lowerUrl)) {
      const headings = content.match(/(?:^|\n)#{1,3}\s*([^\n]+)/g) || [];
      realizations.push(...headings.map(h => h.replace(/^[\n#\s]+/, '').trim()).filter(p => p.length > 3 && p.length < 100));
    }

    // Latest news (2023-2025)
    if (/aktualnosci|news|blog/.test(lowerUrl)) {
      const headings = content.match(/(?:^|\n)#{1,3}\s*([^\n]+)/g) || [];
      // Try to extract dates
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

  // Deduplicate
  services = [...new Set(services)].slice(0, 15);
  products = [...new Set(products)].slice(0, 15);
  brands = [...new Set(brands)].slice(0, 15);
  realizations = [...new Set(realizations)].slice(0, 15);
  references = [...new Set(references)].slice(0, 15);
  management_web = management_web.slice(0, 10);
  latest_news = latest_news.slice(0, 10);

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
