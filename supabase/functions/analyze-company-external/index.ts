import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Perplexity search with increased tokens for full analyses
async function perplexitySearch(query: string, apiKey: string, maxTokens: number = 3000): Promise<{ content: string; citations: string[] }> {
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
        max_tokens: maxTokens,
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

// Parse key clients and projects
function parseKeyClients(content: string): Array<{ name: string; industry?: string; project?: string }> {
  const clients: Array<{ name: string; industry?: string; project?: string }> = [];
  
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-•*\d]+\.?\s/.test(trimmed) && trimmed.length > 10) {
      const text = trimmed.replace(/^[-•*\d]+\.?\s/, '');
      
      // Extract client name
      const clientMatch = text.match(/^([A-ZŻŹĆĄŚĘŁÓŃ][A-Za-zżźćąśęłóń\s&.-]+?)(?:\s*[-–:,]|\s+(?:–|-))/i);
      if (clientMatch) {
        const client: any = { name: clientMatch[1].trim().slice(0, 100) };
        
        // Detect industry
        if (/bank|finans|ubezpiecz/i.test(text)) client.industry = 'finanse';
        else if (/szpital|klinik|medyc|zdrow/i.test(text)) client.industry = 'medycyna';
        else if (/produkc|fabryk|przem/i.test(text)) client.industry = 'przemysł';
        else if (/retail|handel|sklep/i.test(text)) client.industry = 'handel';
        else if (/budow|dewelop|nieruch/i.test(text)) client.industry = 'budownictwo';
        
        client.project = text.slice(0, 200);
        clients.push(client);
      }
    }
  }
  
  return clients.slice(0, 15);
}

// Parse technology and innovation info
function parseTechnologyInfo(content: string): {
  technologies?: string[];
  innovations?: string[];
  patents?: string[];
  rnd_focus?: string;
} | null {
  const techInfo: any = {};
  
  const technologies: string[] = [];
  const innovations: string[] = [];
  const patents: string[] = [];
  
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-•*\d]+\.?\s/.test(trimmed) && trimmed.length > 10) {
      const text = trimmed.replace(/^[-•*\d]+\.?\s/, '').slice(0, 150);
      
      if (/patent|wynalaz|zgłoszeni/i.test(text)) {
        patents.push(text);
      } else if (/innowacj|nowa technologi|przełom|breakthrough/i.test(text)) {
        innovations.push(text);
      } else {
        technologies.push(text);
      }
    }
  }
  
  if (technologies.length > 0) techInfo.technologies = technologies.slice(0, 10);
  if (innovations.length > 0) techInfo.innovations = innovations.slice(0, 5);
  if (patents.length > 0) techInfo.patents = patents.slice(0, 5);
  
  // Extract R&D focus
  const rndMatch = content.match(/(?:R&D|badania\s+i\s+rozwój|innowacje)[:\s]+([^.!?]{20,200})/i);
  if (rndMatch) {
    techInfo.rnd_focus = rndMatch[1].trim();
  }
  
  return Object.keys(techInfo).length > 0 ? techInfo : null;
}

// Parse company history and milestones
function parseHistoryMilestones(content: string): Array<{ year?: number; event: string; significance?: string }> {
  const milestones: Array<{ year?: number; event: string; significance?: string }> = [];
  
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-•*\d]+\.?\s/.test(trimmed) && trimmed.length > 15) {
      const text = trimmed.replace(/^[-•*\d]+\.?\s/, '');
      
      const milestone: any = { event: text.slice(0, 300) };
      
      // Extract year
      const yearMatch = text.match(/\b(19\d{2}|20[0-2]\d)\b/);
      if (yearMatch) {
        milestone.year = parseInt(yearMatch[1]);
      }
      
      // Detect significance
      if (/założen|powstanie|start|początek/i.test(text)) milestone.significance = 'founding';
      else if (/przejęci|akwizycj|fuzj|merger/i.test(text)) milestone.significance = 'merger';
      else if (/ekspansj|nowy\s+rynek|zagraniczn/i.test(text)) milestone.significance = 'expansion';
      else if (/nagrad|wyróżnien|sukces/i.test(text)) milestone.significance = 'achievement';
      else if (/produkt|usług|wdrożeni/i.test(text)) milestone.significance = 'product_launch';
      
      milestones.push(milestone);
    }
  }
  
  // Sort by year if available
  return milestones
    .sort((a, b) => (a.year || 0) - (b.year || 0))
    .slice(0, 15);
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

    console.log(`[Stage 3] Starting comprehensive external analysis for: ${company_name}`);

    // Update status to processing
    await supabase
      .from('companies')
      .update({ external_data_status: 'processing' })
      .eq('id', company_id);

    const allCitations: string[] = [];
    const rawAnalyses: Record<string, string> = {};

    // Query 1: Press mentions and news (expanded prompt)
    const newsQuery = `Przeanalizuj dokładnie firmę "${company_name}" w kontekście obecności medialnej i prasowej w Polsce.

Poszukaj i opisz szczegółowo:
1. Najnowsze artykuły prasowe o firmie (2023-2025)
2. Wywiady z przedstawicielami firmy
3. Informacje prasowe i komunikaty
4. Wzmianki w mediach branżowych
5. Obecność w social media (LinkedIn, Facebook, Twitter)
6. Rankingi i zestawienia, w których firma się pojawiła

Dla każdej wzmianki podaj: tytuł, źródło, datę (jeśli dostępna), krótkie podsumowanie treści.
Napisz szczegółową analizę obecności medialnej tej firmy.`;
    const newsResult = await perplexitySearch(newsQuery, perplexityKey, 3000);
    rawAnalyses.news_analysis = newsResult.content;
    const pressMentions = parsePressMentions(newsResult.content);
    allCitations.push(...newsResult.citations);

    // Query 2: Public contracts and tenders (expanded)
    const contractsQuery = `Przeanalizuj dokładnie udział firmy "${company_name}" w zamówieniach publicznych i przetargach w Polsce.

Poszukaj i opisz szczegółowo:
1. Wygrane przetargi i zamówienia publiczne (2020-2025)
2. Wartości kontraktów (w PLN)
3. Nazwy zamawiających (urzędy, instytucje, szpitale, gminy)
4. Rodzaje dostarczanych produktów/usług
5. Umowy ramowe z sektorem publicznym
6. Realizowane projekty dla administracji publicznej

Podaj konkretne przykłady z wartościami i datami. Napisz pełną analizę aktywności firmy w sektorze publicznym.`;
    const contractsResult = await perplexitySearch(contractsQuery, perplexityKey, 3000);
    rawAnalyses.contracts_analysis = contractsResult.content;
    const publicContracts = parseContracts(contractsResult.content);
    allCitations.push(...contractsResult.citations);

    // Query 3: Partnerships and alliances (expanded)
    const partnershipsQuery = `Przeanalizuj dokładnie partnerstwa biznesowe i alianse strategiczne firmy "${company_name}".

Poszukaj i opisz szczegółowo:
1. Oficjalnych partnerów biznesowych
2. Dystrybutorów i dealerów (kogo reprezentują, czyje marki sprzedają)
3. Partnerstwa technologiczne (z jakimi producentami współpracują)
4. Alianse strategiczne i joint ventures
5. Członkostwo w organizacjach branżowych
6. Certyfikowane partnerstwa (Gold Partner, Authorized Dealer itp.)
7. Współprace z uczelniami i instytutami

Dla każdego partnerstwa opisz: nazwa partnera, rodzaj współpracy, od kiedy trwa, co obejmuje. Napisz pełną analizę ekosystemu partnerskiego firmy.`;
    const partnershipsResult = await perplexitySearch(partnershipsQuery, perplexityKey, 3000);
    rawAnalyses.partnerships_analysis = partnershipsResult.content;
    const partnerships = parsePartnerships(partnershipsResult.content);
    allCitations.push(...partnershipsResult.citations);

    // Query 4: Awards and certifications (expanded)
    const awardsQuery = `Przeanalizuj dokładnie nagrody, wyróżnienia i certyfikaty firmy "${company_name}".

Poszukaj i opisz szczegółowo:
1. Nagrody branżowe i wyróżnienia
2. Certyfikaty jakości (ISO 9001, ISO 14001, ISO 27001, itp.)
3. Akredytacje i atesty
4. Wyróżnienia "Gazele Biznesu", "Diamenty Forbesa", itp.
5. Nagrody dla produktów/usług
6. Certyfikaty partnerskie od producentów
7. Nagrody dla pracodawcy (Great Place to Work, itp.)

Dla każdej nagrody/certyfikatu podaj: nazwę, rok otrzymania, kategorię, znaczenie. Napisz pełną analizę osiągnięć i certyfikacji firmy.`;
    const awardsResult = await perplexitySearch(awardsQuery, perplexityKey, 3000);
    rawAnalyses.awards_analysis = awardsResult.content;
    const awardsCertificates = parseAwardsCertificates(awardsResult.content);
    allCitations.push(...awardsResult.citations);

    // Query 5: Customer reviews and reputation (expanded)
    const reviewsQuery = `Przeanalizuj dokładnie opinie klientów i reputację firmy "${company_name}".

Poszukaj i opisz szczegółowo:
1. Opinie na Google Maps i Google Business
2. Recenzje na portalach branżowych
3. Opinie na Clutch, Trustpilot, Facebook
4. Referencje klientów dostępne publicznie
5. Case studies i success stories
6. Komentarze i opinie w social media
7. Wszelkie kontrowersje lub skargi klientów

Cytuj konkretne opinie (jeśli dostępne). Opisz ogólną reputację firmy na rynku. Napisz pełną analizę wizerunku i opinii o firmie.`;
    const reviewsResult = await perplexitySearch(reviewsQuery, perplexityKey, 3000);
    rawAnalyses.reviews_analysis = reviewsResult.content;
    const customerReviews = parseCustomerReviews(reviewsResult.content);
    const redFlags = detectRedFlags(reviewsResult.content + newsResult.content);
    allCitations.push(...reviewsResult.citations);

    // Query 6: LinkedIn insights (expanded)
    const linkedinQuery = `Przeanalizuj dokładnie profil LinkedIn firmy "${company_name}" oraz jej pracowników.

Poszukaj i opisz szczegółowo:
1. Liczba pracowników według LinkedIn
2. Dynamika zatrudnienia (wzrost/spadek)
3. Kluczowi menedżerowie i ich profile
4. Aktywność firmy na LinkedIn (częstotliwość postów)
5. Najpopularniejsze posty i tematy
6. Kultura organizacyjna prezentowana na LinkedIn
7. Oferty pracy i rekrutacje
8. Życie firmowe (eventy, szkolenia, integracje)

Napisz pełną analizę obecności firmy na LinkedIn i co mówi ona o kulturze i rozwoju organizacji.`;
    const linkedinResult = await perplexitySearch(linkedinQuery, perplexityKey, 3000);
    rawAnalyses.linkedin_analysis = linkedinResult.content;
    const linkedinInsights = parseLinkedInInsights(linkedinResult.content);
    allCitations.push(...linkedinResult.citations);

    // Query 7: Market position (expanded)
    const marketQuery = `Przeanalizuj dokładnie pozycję rynkową firmy "${company_name}" na polskim rynku.

Poszukaj i opisz szczegółowo:
1. Pozycja firmy w branży (lider, challenger, niszowy gracz)
2. Szacowany udział w rynku
3. Pozycje w rankingach branżowych
4. Główni konkurenci i porównanie z nimi
5. Przewagi konkurencyjne firmy
6. Segmenty rynku, w których firma dominuje
7. Trendy rynkowe wpływające na firmę
8. Perspektywy rozwoju i zagrożenia

Napisz pełną analizę konkurencyjną i pozycji rynkowej firmy.`;
    const marketResult = await perplexitySearch(marketQuery, perplexityKey, 3000);
    rawAnalyses.market_analysis = marketResult.content;
    const marketPosition = parseMarketPosition(marketResult.content);
    allCitations.push(...marketResult.citations);

    // Query 8: Company history and milestones (NEW)
    const historyQuery = `Przeanalizuj dokładnie historię i rozwój firmy "${company_name}".

Poszukaj i opisz szczegółowo:
1. Rok założenia i okoliczności powstania
2. Założyciele i ich wizja
3. Kluczowe kamienie milowe w historii firmy
4. Przejęcia, fuzje, spin-offy
5. Ekspansja geograficzna (nowe rynki, oddziały)
6. Transformacje biznesowe i zmiany modelu
7. Ważne inwestycje i projekty rozwojowe
8. Ewolucja oferty produktowej/usługowej

Przedstaw chronologiczną historię rozwoju firmy od powstania do dziś. Napisz pełną analizę historii i ewolucji organizacji.`;
    const historyResult = await perplexitySearch(historyQuery, perplexityKey, 3000);
    rawAnalyses.history_analysis = historyResult.content;
    const historyMilestones = parseHistoryMilestones(historyResult.content);
    allCitations.push(...historyResult.citations);

    // Query 9: Key clients and projects (NEW)
    const clientsQuery = `Przeanalizuj dokładnie klientów i realizacje firmy "${company_name}".

Poszukaj i opisz szczegółowo:
1. Największych/najważniejszych klientów firmy
2. Kluczowe projekty referencyjne
3. Case studies dostępne publicznie
4. Branże, w których firma ma klientów
5. Długoterminowe relacje z klientami
6. Międzynarodowi klienci (jeśli są)
7. Projekty flagowe i prestiżowe realizacje
8. Sukcesy i wyniki osiągnięte dla klientów

Podaj konkretne nazwy firm-klientów i opisy projektów. Napisz pełną analizę portfolio klientów i realizacji firmy.`;
    const clientsResult = await perplexitySearch(clientsQuery, perplexityKey, 3000);
    rawAnalyses.clients_analysis = clientsResult.content;
    const keyClients = parseKeyClients(clientsResult.content);
    allCitations.push(...clientsResult.citations);

    // Query 10: Technology and innovation (NEW)
    const techQuery = `Przeanalizuj dokładnie technologie i innowacje firmy "${company_name}".

Poszukaj i opisz szczegółowo:
1. Stosowane technologie i rozwiązania
2. Własne produkty i innowacje
3. Patenty i zgłoszenia patentowe
4. Działalność R&D (badania i rozwój)
5. Transformacja cyfrowa i digitalizacja
6. Inwestycje w nowe technologie
7. Współpraca z startupami i innowatorami
8. Automatyzacja i robotyzacja procesów
9. Rozwiązania IT i systemy informatyczne

Napisz pełną analizę poziomu technologicznego i innowacyjności firmy.`;
    const techResult = await perplexitySearch(techQuery, perplexityKey, 3000);
    rawAnalyses.technology_analysis = techResult.content;
    const technologyInfo = parseTechnologyInfo(techResult.content);
    allCitations.push(...techResult.citations);

    // Deduplicate citations
    const uniqueSources = [...new Set(allCitations)].filter(c => c && c.length > 0).slice(0, 50);

    const externalData = {
      // Raw analyses - full AI responses for display
      raw_analyses: rawAnalyses,
      
      // Parsed structured data
      press_mentions: pressMentions.length > 0 ? pressMentions : null,
      public_contracts: publicContracts.length > 0 ? publicContracts : null,
      partnerships: partnerships.length > 0 ? partnerships : null,
      awards_certificates: awardsCertificates.length > 0 ? awardsCertificates : null,
      customer_reviews: customerReviews.length > 0 ? customerReviews : null,
      red_flags: redFlags.length > 0 ? redFlags : null,
      linkedin_insights: linkedinInsights,
      market_position: marketPosition,
      
      // New parsed data
      history_milestones: historyMilestones.length > 0 ? historyMilestones : null,
      key_clients: keyClients.length > 0 ? keyClients : null,
      technology_info: technologyInfo,
      
      // Metadata
      sources: uniqueSources.length > 0 ? uniqueSources : null,
      analyzed_at: new Date().toISOString(),
      queries_executed: 10,
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

    console.log(`[Stage 3] Completed successfully with ${uniqueSources.length} sources and ${Object.keys(rawAnalyses).length} full analyses`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: externalData,
        press_mentions_count: pressMentions.length,
        contracts_count: publicContracts.length,
        partnerships_count: partnerships.length,
        history_milestones_count: historyMilestones.length,
        key_clients_count: keyClients.length,
        sources_count: uniqueSources.length,
        raw_analyses_count: Object.keys(rawAnalyses).length
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
