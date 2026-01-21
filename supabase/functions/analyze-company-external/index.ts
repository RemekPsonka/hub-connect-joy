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

// Parse news from Perplexity response
function parseNews(content: string): Array<{ title: string; date?: string; source?: string; sentiment?: string }> {
  const news: Array<{ title: string; date?: string; source?: string; sentiment?: string }> = [];
  
  // Split by lines and look for news items
  const lines = content.split('\n');
  let currentItem: any = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Look for bullet points or numbered items
    if (/^[-•*\d]+\.?\s/.test(trimmed)) {
      if (currentItem?.title) {
        news.push(currentItem);
      }
      currentItem = { title: trimmed.replace(/^[-•*\d]+\.?\s/, '').slice(0, 200) };
      
      // Try to extract date
      const dateMatch = trimmed.match(/\b(styczeń|luty|marzec|kwiecień|maj|czerwiec|lipiec|sierpień|wrzesień|październik|listopad|grudzień|january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|20\d{2}/i);
      if (dateMatch) {
        currentItem.date = dateMatch[0];
      }
    }
  }
  
  if (currentItem?.title) {
    news.push(currentItem);
  }
  
  return news.slice(0, 10);
}

// Parse contracts/partnerships
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
      
      contracts.push(contract);
    }
  }
  
  return contracts.slice(0, 10);
}

// Parse awards/certifications
function parseAwards(content: string): string[] {
  const awards: string[] = [];
  
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-•*\d]+\.?\s/.test(trimmed) && trimmed.length > 10) {
      awards.push(trimmed.replace(/^[-•*\d]+\.?\s/, '').slice(0, 150));
    }
  }
  
  return awards.slice(0, 15);
}

// Detect red flags or issues
function detectRedFlags(content: string): string[] {
  const redFlags: string[] = [];
  const lowerContent = content.toLowerCase();
  
  const patterns = [
    { pattern: /upadłoś|bankru|likwidacj/i, flag: 'Potencjalne problemy finansowe' },
    { pattern: /zwolnien|redukcj\s+etató|masowe\s+zwolnienia/i, flag: 'Redukcja zatrudnienia' },
    { pattern: /skandal|afer|oszust/i, flag: 'Kontrowersje medialne' },
    { pattern: /kara\s+(?:finansowa|administracyjna)|grzywn/i, flag: 'Kary lub grzywny' },
    { pattern: /pozew|proces\s+sądow/i, flag: 'Sprawy sądowe' },
  ];
  
  for (const { pattern, flag } of patterns) {
    if (pattern.test(lowerContent)) {
      redFlags.push(flag);
    }
  }
  
  return redFlags;
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

    // Query 1: News and recent activity
    const newsQuery = `"${company_name}" Polska - najnowsze wiadomości, aktualności, informacje prasowe z lat 2023-2025. Podaj konkretne wydarzenia, daty, kontrakty. Skup się na faktach.`;
    const newsResult = await perplexitySearch(newsQuery, perplexityKey);
    const newsItems = parseNews(newsResult.content);
    allCitations.push(...newsResult.citations);

    // Query 2: Contracts and partnerships
    const contractsQuery = `"${company_name}" - kontrakty, przetargi, partnerstwa biznesowe, współprace, klienci. Podaj konkretne umowy, wartości, daty z lat 2020-2025.`;
    const contractsResult = await perplexitySearch(contractsQuery, perplexityKey);
    const contracts = parseContracts(contractsResult.content);
    allCitations.push(...contractsResult.citations);

    // Query 3: Awards and certifications
    const awardsQuery = `"${company_name}" - nagrody, wyróżnienia, certyfikaty, rankingi, osiągnięcia firmy. Podaj konkretne nazwy nagród i daty.`;
    const awardsResult = await perplexitySearch(awardsQuery, perplexityKey);
    const awards = parseAwards(awardsResult.content);
    allCitations.push(...awardsResult.citations);

    // Query 4: Market position and opinions
    const opinionQuery = `"${company_name}" - opinie klientów, pozycja rynkowa, reputacja firmy, recenzje. Co mówią o tej firmie?`;
    const opinionResult = await perplexitySearch(opinionQuery, perplexityKey);
    const redFlags = detectRedFlags(opinionResult.content + newsResult.content);
    allCitations.push(...opinionResult.citations);

    // Deduplicate citations
    const uniqueCitations = [...new Set(allCitations)].slice(0, 20);

    const externalData = {
      news_articles: newsItems,
      public_contracts: contracts,
      partnerships: contracts.filter(c => c.description.toLowerCase().includes('partner')).map(c => c.description),
      awards: awards.filter(a => /nagrod|wyróżn|certyfik/i.test(a)),
      certifications: awards.filter(a => /iso|certyfik|atest/i.test(a)),
      reviews_summary: opinionResult.content.slice(0, 500),
      red_flags: redFlags,
      citations: uniqueCitations,
      analysis_date: new Date().toISOString(),
      queries_executed: 4,
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

    console.log(`[Stage 3] Completed successfully with ${uniqueCitations.length} citations`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: externalData,
        news_count: newsItems.length,
        contracts_count: contracts.length,
        citations_count: uniqueCitations.length
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
