import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Perplexity search for external data
async function perplexitySearch(query: string, apiKey: string): Promise<{ content: string; citations: string[] }> {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{
          role: 'user',
          content: query
        }],
        max_tokens: 1500,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      console.error('[Perplexity] API error:', response.status);
      return { content: '', citations: [] };
    }

    const data = await response.json();
    return {
      content: data?.choices?.[0]?.message?.content || '',
      citations: data?.citations || []
    };
  } catch (error) {
    console.error('[Perplexity] Error:', error);
    return { content: '', citations: [] };
  }
}

// Parse press mentions from Perplexity response
function parsePressMentions(content: string): Array<{ title: string; date?: string; source?: string }> {
  const mentions: Array<{ title: string; date?: string; source?: string }> = [];
  
  const lines = content.split('\n');
  let currentItem: any = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Look for bullet points or numbered items
    if (/^[-•*\d]+\.?\s/.test(trimmed)) {
      if (currentItem?.title) {
        mentions.push(currentItem);
      }
      currentItem = { title: trimmed.replace(/^[-•*\d]+\.?\s/, '').slice(0, 200) };
      
      // Try to extract date
      const dateMatch = trimmed.match(/\b(styczeń|luty|marzec|kwiecień|maj|czerwiec|lipiec|sierpień|wrzesień|październik|listopad|grudzień|january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|20\d{2}/i);
      if (dateMatch) {
        currentItem.date = dateMatch[0];
      }
      
      // Try to extract source
      const sourceMatch = trimmed.match(/(?:źródło|source|według|via|w serwisie|na portalu)[\s:]+([A-Za-z0-9.-]+\.[a-z]{2,})/i);
      if (sourceMatch) {
        currentItem.source = sourceMatch[1];
      }
    }
  }
  
  if (currentItem?.title) {
    mentions.push(currentItem);
  }
  
  return mentions.slice(0, 10);
}

// Parse public contracts
function parseContracts(content: string): Array<{ client?: string; value?: string; year?: number; description: string }> {
  const contracts: Array<{ client?: string; value?: string; year?: number; description: string }> = [];
  
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-•*\d]+\.?\s/.test(trimmed) && trimmed.length > 20) {
      const contract: any = { description: trimmed.replace(/^[-•*\d]+\.?\s/, '').slice(0, 300) };
      
      // Try to extract value
      const valueMatch = trimmed.match(/(\d+(?:[.,]\d+)?)\s*(mln|tys|PLN|zł|EUR|USD)/i);
      if (valueMatch) {
        contract.value = valueMatch[0];
      }
      
      // Try to extract year
      const yearMatch = trimmed.match(/\b(202[0-5]|201\d)\b/);
      if (yearMatch) {
        contract.year = parseInt(yearMatch[1]);
      }
      
      // Try to extract client
      const clientMatch = trimmed.match(/(?:dla|for|z firmą|od|with)\s+([A-ZŻŹĆĄŚĘŁÓŃ][A-Za-zżźćąśęłóń\s&.-]+?)(?:\s+(?:sp\.|S\.A\.|Ltd|GmbH|Inc)|[,.]|\s+w\s+)/i);
      if (clientMatch) {
        contract.client = clientMatch[1].trim();
      }
      
      contracts.push(contract);
    }
  }
  
  return contracts.slice(0, 10);
}

// Parse partnerships
function parsePartnerships(content: string): Array<{ partner: string; type?: string; description?: string }> {
  const partnerships: Array<{ partner: string; type?: string; description?: string }> = [];
  
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-•*\d]+\.?\s/.test(trimmed) && trimmed.length > 15) {
      const text = trimmed.replace(/^[-•*\d]+\.?\s/, '');
      
      // Extract partner name (usually at the beginning or after keywords)
      const partnerMatch = text.match(/^([A-ZŻŹĆĄŚĘŁÓŃ][A-Za-zżźćąśęłóń\s&.-]+?)(?:\s*[-–:,]|\s+(?:jako|is|are|został|to))/i) ||
                          text.match(/(?:partner(?:stwo)?|współpraca|alliance|dystrybutor)\s+(?:z\s+)?([A-ZŻŹĆĄŚĘŁÓŃ][A-Za-zżźćąśęłóń\s&.-]+)/i);
      
      if (partnerMatch) {
        const partnership: any = { partner: partnerMatch[1].trim().slice(0, 100) };
        
        // Detect partnership type
        if (/technolog|software|IT|digital/i.test(text)) partnership.type = 'technology';
        else if (/dystrybu|distribut|dealer/i.test(text)) partnership.type = 'distribution';
        else if (/strateg/i.test(text)) partnership.type = 'strategic';
        else if (/integr/i.test(text)) partnership.type = 'integration';
        else if (/gold|silver|platinum|certified|partner/i.test(text)) partnership.type = 'certified';
        
        partnership.description = text.slice(0, 200);
        partnerships.push(partnership);
      }
    }
  }
  
  return partnerships.slice(0, 10);
}

// Parse awards and certifications
function parseAwardsCertificates(content: string): Array<{ name: string; type: 'award' | 'certification'; year?: number }> {
  const items: Array<{ name: string; type: 'award' | 'certification'; year?: number }> = [];
  
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-•*\d]+\.?\s/.test(trimmed) && trimmed.length > 10) {
      const text = trimmed.replace(/^[-•*\d]+\.?\s/, '').slice(0, 150);
      
      // Determine if it's a certification or award
      const isCertification = /iso|certyfik|atest|norma|standard|audit|accredit/i.test(text);
      
      const item: any = {
        name: text,
        type: isCertification ? 'certification' : 'award'
      };
      
      // Extract year
      const yearMatch = text.match(/\b(202[0-5]|201\d)\b/);
      if (yearMatch) {
        item.year = parseInt(yearMatch[1]);
      }
      
      items.push(item);
    }
  }
  
  return items.slice(0, 15);
}

// Parse customer reviews
function parseCustomerReviews(content: string): Array<{ text: string; source?: string; rating?: string }> {
  const reviews: Array<{ text: string; source?: string; rating?: string }> = [];
  
  // Look for quoted reviews
  const quotePattern = /"([^"]{20,300})"/g;
  let match;
  while ((match = quotePattern.exec(content)) !== null) {
    const review: any = { text: match[1].trim() };
    
    // Try to find source near the quote
    const contextStart = Math.max(0, match.index - 50);
    const contextEnd = Math.min(content.length, match.index + match[0].length + 50);
    const context = content.slice(contextStart, contextEnd);
    
    if (/google/i.test(context)) review.source = 'Google';
    else if (/clutch/i.test(context)) review.source = 'Clutch';
    else if (/linkedin/i.test(context)) review.source = 'LinkedIn';
    else if (/facebook/i.test(context)) review.source = 'Facebook';
    
    reviews.push(review);
  }
  
  // Also look for rating patterns
  const ratingMatch = content.match(/(\d+[.,]?\d*)\s*(?:\/\s*5|gwiazdek?|stars?|punktów)/gi);
  if (ratingMatch && reviews.length > 0) {
    reviews[0].rating = ratingMatch[0];
  }
  
  // If no quotes found, extract from bullet points
  if (reviews.length === 0) {
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^[-•*\d]+\.?\s/.test(trimmed) && trimmed.length > 30) {
        const text = trimmed.replace(/^[-•*\d]+\.?\s/, '').slice(0, 200);
        if (/opini|review|recenz|klient|customer/i.test(text)) {
          reviews.push({ text });
        }
      }
    }
  }
  
  return reviews.slice(0, 10);
}

// Parse LinkedIn insights
function parseLinkedInInsights(content: string): {
  employees_count?: string;
  growth?: string;
  activity_level?: string;
  key_posts?: string[];
} | null {
  const insights: any = {};
  
  // Extract employee count
  const employeesMatch = content.match(/(\d+(?:\s*[-–]\s*\d+)?(?:\s*(?:tys|k))?)\s*(?:pracownik|employee|osób|people)/i);
  if (employeesMatch) {
    insights.employees_count = employeesMatch[1].trim();
  }
  
  // Extract growth percentage
  const growthMatch = content.match(/(?:wzrost|growth|zwiększ)\s*(?:o\s*)?(\d+(?:[.,]\d+)?\s*%)/i);
  if (growthMatch) {
    insights.growth = growthMatch[1];
  }
  
  // Determine activity level
  if (/bardzo\s+aktywn|highly\s+active|regularn|frequent/i.test(content)) {
    insights.activity_level = 'wysoka';
  } else if (/średni|moderate|occasional/i.test(content)) {
    insights.activity_level = 'średnia';
  } else if (/nisk|low|rzadk|rare/i.test(content)) {
    insights.activity_level = 'niska';
  }
  
  // Extract key posts/updates
  const keyPosts: string[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-•*\d]+\.?\s/.test(trimmed) && /post|aktualizacj|update|artykuł|article/i.test(trimmed)) {
      keyPosts.push(trimmed.replace(/^[-•*\d]+\.?\s/, '').slice(0, 100));
    }
  }
  if (keyPosts.length > 0) {
    insights.key_posts = keyPosts.slice(0, 5);
  }
  
  return Object.keys(insights).length > 0 ? insights : null;
}

// Parse market position
function parseMarketPosition(content: string): {
  position?: string;
  market_share?: string;
  ranking?: string;
  competitors?: string[];
} | null {
  const position: any = {};
  
  // Determine market position
  if (/lider|leader|nr\s*1|pierwsz|dominuj|top\s+1/i.test(content)) {
    position.position = 'lider';
  } else if (/challenger|pretendent|drugie?\s+miejsc|top\s*[23]/i.test(content)) {
    position.position = 'challenger';
  } else if (/niszow|niche|specjalist/i.test(content)) {
    position.position = 'niszowy';
  } else if (/średni|mid-market|middle/i.test(content)) {
    position.position = 'średni gracz';
  }
  
  // Extract market share
  const shareMatch = content.match(/(\d+(?:[.,]\d+)?)\s*%\s*(?:udzia|rynk|market|share)/i);
  if (shareMatch) {
    position.market_share = shareMatch[1] + '%';
  }
  
  // Extract ranking
  const rankingMatch = content.match(/(?:top|miejsce|rank|pozycja)\s*(\d+|[\w]+)/i) ||
                       content.match(/(\d+)\s*(?:miejsce|pozycja|w\s+rankingu)/i);
  if (rankingMatch) {
    position.ranking = rankingMatch[0].slice(0, 50);
  }
  
  // Extract competitors
  const competitors: string[] = [];
  const competitorPatterns = [
    /konkurent[iya]?[:\s]+([A-ZŻŹĆĄŚĘŁÓŃ][A-Za-zżźćąśęłóń\s,&.-]+)/gi,
    /(?:vs|versus|rywalizuj[eą]?\s+z)\s+([A-ZŻŹĆĄŚĘŁÓŃ][A-Za-zżźćąśęłóń\s&.-]+)/gi,
  ];
  
  for (const pattern of competitorPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const names = match[1].split(/[,;i]/).map(n => n.trim()).filter(n => n.length > 2 && n.length < 50);
      competitors.push(...names);
    }
  }
  
  if (competitors.length > 0) {
    position.competitors = [...new Set(competitors)].slice(0, 5);
  }
  
  return Object.keys(position).length > 0 ? position : null;
}

// Detect red flags or issues
function detectRedFlags(content: string): string[] {
  const redFlags: string[] = [];
  
  const patterns = [
    { pattern: /upadłoś|bankru|likwidacj|niewypłacaln/i, flag: 'Potencjalne problemy finansowe' },
    { pattern: /zwolnien|redukcj\s+etató|masowe\s+zwolnienia|cięcia\s+zatrudnienia/i, flag: 'Redukcja zatrudnienia' },
    { pattern: /skandal|afer|oszust|nadużyci/i, flag: 'Kontrowersje medialne' },
    { pattern: /kara\s+(?:finansowa|administracyjna)|grzywn|mandat/i, flag: 'Kary lub grzywny' },
    { pattern: /pozew|proces\s+sądow|sprawa\s+sądowa|postępowanie/i, flag: 'Sprawy sądowe' },
    { pattern: /uok(?:ik)?|antymonopol/i, flag: 'Postępowanie UOKiK' },
    { pattern: /strajk|protest\s+pracownik/i, flag: 'Konflikty pracownicze' },
    { pattern: /opóźnien\s+płatności|nierzetelny|dłużnik/i, flag: 'Problemy z płatnościami' },
  ];
  
  for (const { pattern, flag } of patterns) {
    if (pattern.test(content)) {
      redFlags.push(flag);
    }
  }
  
  return [...new Set(redFlags)];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company_id, company_name } = await req.json();

    if (!company_id || !company_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_id and company_name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!perplexityKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Perplexity not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Stage 3] Starting external analysis for: ${company_name}`);

    // Update status to processing
    await supabase
      .from('companies')
      .update({ external_data_status: 'processing' })
      .eq('id', company_id);

    const allCitations: string[] = [];

    // Query 1: Press mentions and news
    const newsQuery = `"${company_name}" Polska - najnowsze wiadomości, artykuły prasowe, informacje medialne z lat 2023-2025. Podaj konkretne tytuły artykułów, źródła, daty. Skup się na faktach.`;
    const newsResult = await perplexitySearch(newsQuery, perplexityKey);
    const pressMentions = parsePressMentions(newsResult.content);
    allCitations.push(...newsResult.citations);

    // Query 2: Public contracts and tenders
    const contractsQuery = `"${company_name}" - zamówienia publiczne, przetargi, kontrakty rządowe, umowy z sektorem publicznym. Podaj wartości, daty, zamawiających z lat 2020-2025.`;
    const contractsResult = await perplexitySearch(contractsQuery, perplexityKey);
    const publicContracts = parseContracts(contractsResult.content);
    allCitations.push(...contractsResult.citations);

    // Query 3: Partnerships and alliances
    const partnershipsQuery = `"${company_name}" - partnerzy biznesowi, partnerstwa strategiczne, dystrybutorzy, dealerzy, alianse, współprace. Jakie firmy są partnerami tej firmy?`;
    const partnershipsResult = await perplexitySearch(partnershipsQuery, perplexityKey);
    const partnerships = parsePartnerships(partnershipsResult.content);
    allCitations.push(...partnershipsResult.citations);

    // Query 4: Awards and certifications
    const awardsQuery = `"${company_name}" - nagrody, wyróżnienia, certyfikaty ISO, akredytacje, rankingi branżowe, osiągnięcia. Podaj konkretne nazwy nagród i daty.`;
    const awardsResult = await perplexitySearch(awardsQuery, perplexityKey);
    const awardsCertificates = parseAwardsCertificates(awardsResult.content);
    allCitations.push(...awardsResult.citations);

    // Query 5: Customer reviews and opinions
    const reviewsQuery = `"${company_name}" - opinie klientów, recenzje, referencje, oceny, reputacja firmy. Co mówią klienci o tej firmie? Cytaty opinii.`;
    const reviewsResult = await perplexitySearch(reviewsQuery, perplexityKey);
    const customerReviews = parseCustomerReviews(reviewsResult.content);
    const redFlags = detectRedFlags(reviewsResult.content + newsResult.content);
    allCitations.push(...reviewsResult.citations);

    // Query 6: LinkedIn insights
    const linkedinQuery = `"${company_name}" LinkedIn - profil firmowy, liczba pracowników, wzrost zatrudnienia, aktywność, posty, kultura organizacyjna. Dane z LinkedIn.`;
    const linkedinResult = await perplexitySearch(linkedinQuery, perplexityKey);
    const linkedinInsights = parseLinkedInInsights(linkedinResult.content);
    allCitations.push(...linkedinResult.citations);

    // Query 7: Market position
    const marketQuery = `"${company_name}" - pozycja rynkowa, udział w rynku, ranking branżowy, konkurenci, lider czy challenger. Jaka jest pozycja tej firmy na rynku polskim?`;
    const marketResult = await perplexitySearch(marketQuery, perplexityKey);
    const marketPosition = parseMarketPosition(marketResult.content);
    allCitations.push(...marketResult.citations);

    // Deduplicate citations
    const uniqueSources = [...new Set(allCitations)].filter(c => c && c.length > 0).slice(0, 25);

    const externalData = {
      press_mentions: pressMentions.length > 0 ? pressMentions : null,
      public_contracts: publicContracts.length > 0 ? publicContracts : null,
      partnerships: partnerships.length > 0 ? partnerships : null,
      awards_certificates: awardsCertificates.length > 0 ? awardsCertificates : null,
      customer_reviews: customerReviews.length > 0 ? customerReviews : null,
      red_flags: redFlags.length > 0 ? redFlags : null,
      linkedin_insights: linkedinInsights,
      market_position: marketPosition,
      sources: uniqueSources.length > 0 ? uniqueSources : null,
      analyzed_at: new Date().toISOString(),
      queries_executed: 7,
    };

    // Save to database
    const { error: updateError } = await supabase
      .from('companies')
      .update({
        external_data: externalData,
        external_data_status: 'completed',
        external_data_date: new Date().toISOString(),
      })
      .eq('id', company_id);

    if (updateError) {
      console.error('[Stage 3] Database update error:', updateError);
      throw updateError;
    }

    console.log(`[Stage 3] Completed successfully with ${uniqueSources.length} sources`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: externalData,
        press_mentions_count: pressMentions.length,
        contracts_count: publicContracts.length,
        partnerships_count: partnerships.length,
        sources_count: uniqueSources.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Stage 3] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
