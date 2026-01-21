import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FinancialYear {
  year: number;
  revenue?: number;
  profit?: number;
  employees?: number;
  ebitda?: number;
  assets?: number;
  source?: string;
  confidence?: 'verified' | 'estimated' | 'unknown';
}

// Perplexity search for financial data
async function perplexityFinancialSearch(companyName: string, apiKey: string): Promise<{ content: string; citations: string[] }> {
  try {
    const currentYear = new Date().getFullYear();
    const query = `"${companyName}" Polska - dane finansowe:
- Przychody za lata ${currentYear-2}-${currentYear} (w PLN lub EUR)
- Zysk netto
- EBITDA
- Zatrudnienie
- Aktywa

Szukaj w: rankingach branżowych, raportach finansowych, BizRaport, Informator Handlowy, artykułach prasowych.
Podaj konkretne liczby i źródła.`;

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

// Parse Polish number format
function parsePolishNumber(str: string): number | null {
  if (!str) return null;
  
  // Remove spaces and normalize
  let cleaned = str.replace(/\s/g, '').replace(',', '.');
  
  // Handle "mln" / "tys" multipliers
  const mlnMatch = cleaned.match(/([\d.,]+)\s*mln/i);
  if (mlnMatch) {
    return Math.round(parseFloat(mlnMatch[1].replace(',', '.')) * 1000000);
  }
  
  const tysMatch = cleaned.match(/([\d.,]+)\s*tys/i);
  if (tysMatch) {
    return Math.round(parseFloat(tysMatch[1].replace(',', '.')) * 1000);
  }
  
  // Just a number
  const numMatch = cleaned.match(/[\d.,]+/);
  if (numMatch) {
    return Math.round(parseFloat(numMatch[0].replace(',', '.')));
  }
  
  return null;
}

// Extract financial data from text
function parseFinancialData(content: string): FinancialYear[] {
  const years: Map<number, FinancialYear> = new Map();
  const currentYear = new Date().getFullYear();
  
  // Initialize years
  for (let y = currentYear - 2; y <= currentYear; y++) {
    years.set(y, { year: y, confidence: 'unknown' });
  }
  
  // Look for revenue patterns
  // Pattern: "przychody 2023: 50 mln PLN" or "przychód: 50 mln zł (2023)"
  const revenuePatterns = [
    /przychod[yów]*[:\s]+(\d[\d\s.,]*)\s*(mln|tys)?\s*(PLN|zł|EUR)?[^\d]*(\d{4})/gi,
    /(\d{4})[:\s-]+przychod[yów]*[:\s]+(\d[\d\s.,]*)\s*(mln|tys)?/gi,
    /(\d[\d\s.,]*)\s*(mln|tys)\s*(PLN|zł|EUR)?.*przychod.*(\d{4})/gi,
    /revenue[:\s]+(\d[\d\s.,]*)\s*(mln|tys|M)?.*(\d{4})/gi,
  ];
  
  for (const pattern of revenuePatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      let year: number | null = null;
      let value: string | null = null;
      
      // Find year and value in match
      for (const part of match.slice(1)) {
        if (/^\d{4}$/.test(part)) {
          year = parseInt(part);
        } else if (/\d/.test(part) && !/^\d{4}$/.test(part)) {
          value = part;
        }
      }
      
      if (year && value && years.has(year)) {
        const parsed = parsePolishNumber(match[0]);
        if (parsed && parsed > 100000) { // At least 100k PLN
          const existing = years.get(year)!;
          existing.revenue = parsed;
          existing.confidence = 'estimated';
          existing.source = 'perplexity';
        }
      }
    }
  }
  
  // Look for profit patterns
  const profitPatterns = [
    /zysk\s*(?:netto)?[:\s]+(\d[\d\s.,]*)\s*(mln|tys)?[^\d]*(\d{4})/gi,
    /(\d{4})[:\s-]+zysk[:\s]+(\d[\d\s.,]*)\s*(mln|tys)?/gi,
  ];
  
  for (const pattern of profitPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      let year: number | null = null;
      let value: string | null = null;
      
      for (const part of match.slice(1)) {
        if (/^\d{4}$/.test(part)) {
          year = parseInt(part);
        } else if (/\d/.test(part) && !/^\d{4}$/.test(part)) {
          value = part;
        }
      }
      
      if (year && value && years.has(year)) {
        const parsed = parsePolishNumber(match[0]);
        if (parsed) {
          const existing = years.get(year)!;
          existing.profit = parsed;
        }
      }
    }
  }
  
  // Look for employee count
  const employeePatterns = [
    /zatrudnieni?e?[:\s]+(\d+)[^\d]*(\d{4})?/gi,
    /(\d+)\s*(?:pracownik|osób|etatów)/gi,
    /employees?[:\s]+(\d+)/gi,
  ];
  
  for (const pattern of employeePatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const count = parseInt(match[1]);
      if (count > 0 && count < 50000) {
        // Assign to most recent year if no year specified
        const yearMatch = match[0].match(/\b(202\d)\b/);
        const year = yearMatch ? parseInt(yearMatch[1]) : currentYear;
        if (years.has(year)) {
          years.get(year)!.employees = count;
        }
      }
    }
  }
  
  // Convert to array and filter out empty years
  const result = Array.from(years.values())
    .filter(y => y.revenue || y.profit || y.employees)
    .sort((a, b) => b.year - a.year);
  
  return result;
}

// Determine growth trend
function calculateTrend(years: FinancialYear[]): 'ascending' | 'descending' | 'stable' | 'unknown' {
  const revenues = years.filter(y => y.revenue).sort((a, b) => a.year - b.year);
  
  if (revenues.length < 2) return 'unknown';
  
  const first = revenues[0].revenue!;
  const last = revenues[revenues.length - 1].revenue!;
  
  const change = (last - first) / first;
  
  if (change > 0.1) return 'ascending';
  if (change < -0.1) return 'descending';
  return 'stable';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company_id, company_name, krs } = await req.json();

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

    console.log(`[Stage 4] Starting financial analysis for: ${company_name}`);

    // Update status to processing
    await supabase
      .from('companies')
      .update({ financial_data_status: 'processing' })
      .eq('id', company_id);

    // Perplexity financial search
    const { content, citations } = await perplexityFinancialSearch(company_name, perplexityKey);
    
    // Parse financial data
    const years = parseFinancialData(content);
    const trend = calculateTrend(years);

    // Build financial data object
    const financialData = {
      years,
      growth_trend: trend,
      raw_insights: content.slice(0, 1000),
      sources: citations.slice(0, 10),
      confidence: years.some(y => y.confidence === 'verified') ? 'medium' : 'low',
      fetch_date: new Date().toISOString(),
      krs_searched: !!krs,
    };

    // If we found revenue data, also update the main revenue fields
    const latestRevenue = years.find(y => y.revenue);
    
    // Save to database
    const updateData: any = {
      financial_data_3y: financialData,
      financial_data_status: 'completed',
      financial_data_date: new Date().toISOString(),
    };

    if (latestRevenue?.revenue) {
      updateData.revenue_amount = latestRevenue.revenue;
      updateData.revenue_year = latestRevenue.year;
      updateData.revenue_currency = 'PLN';
    }

    const { error: updateError } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', company_id);

    if (updateError) {
      console.error('[Stage 4] Database update error:', updateError);
      throw updateError;
    }

    console.log(`[Stage 4] Completed with ${years.length} years of data`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: financialData,
        years_found: years.length,
        trend,
        latest_revenue: latestRevenue?.revenue
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Stage 4] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
