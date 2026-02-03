import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface YearData {
  revenue?: number;
  revenue_formatted?: string;
  profit?: number;
  profit_formatted?: string;
  ebitda?: number;
  ebitda_formatted?: string;
  assets?: number;
  assets_formatted?: string;
  equity?: number;
  equity_formatted?: string;
  employees?: number;
  source?: 'krs' | 'perplexity' | 'manual';
  confidence?: 'verified' | 'estimated' | 'unknown';
}

interface Trends {
  revenue: 'ascending' | 'descending' | 'stable' | 'unknown';
  revenue_cagr?: string;
  profit: 'ascending' | 'descending' | 'stable' | 'unknown';
  employees: 'growing' | 'shrinking' | 'stable' | 'unknown';
  overall_health: 'strong' | 'stable' | 'declining' | 'unknown';
}

interface FinancialData3Y {
  year_2024: YearData | null;
  year_2023: YearData | null;
  year_2022: YearData | null;
  trends: Trends;
  data_sources: string[];
  confidence_level: 'high' | 'medium' | 'low' | 'none';
  fetched_at: string;
}

// Format currency value to readable string
function formatCurrency(value: number): string {
  if (value >= 1000000000) {
    return (value / 1000000000).toFixed(1) + ' mld PLN';
  } else if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + ' mln PLN';
  } else if (value >= 1000) {
    return (value / 1000).toFixed(0) + ' tys PLN';
  }
  return value.toString() + ' PLN';
}

// Perplexity search for financial data
async function perplexityFinancialSearch(companyName: string, apiKey: string): Promise<{ content: string; citations: string[] }> {
  try {
    const query = `"${companyName}" Polska - dane finansowe:
- Przychody za lata 2022-2024 (w PLN lub EUR)
- Zysk netto
- EBITDA
- Zatrudnienie
- Aktywa
- Kapitał własny

Szukaj w: rankingach branżowych, raportach finansowych, BizRaport, Informator Handlowy, KRS, artykułach prasowych.
Podaj konkretne liczby i źródła dla każdego roku osobno.`;

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
        max_tokens: 2000,
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
  
  // Handle "mld" multiplier
  const mldMatch = cleaned.match(/([\d.,]+)\s*mld/i);
  if (mldMatch) {
    return Math.round(parseFloat(mldMatch[1].replace(',', '.')) * 1000000000);
  }
  
  // Handle "mln" multiplier
  const mlnMatch = cleaned.match(/([\d.,]+)\s*mln/i);
  if (mlnMatch) {
    return Math.round(parseFloat(mlnMatch[1].replace(',', '.')) * 1000000);
  }
  
  // Handle "tys" multiplier
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

// Check if year data has any meaningful values
function hasData(yearData: YearData | undefined): boolean {
  if (!yearData) return false;
  return !!(yearData.revenue || yearData.profit || yearData.ebitda || yearData.employees || yearData.assets);
}

// Add formatted values to year data
function addFormatting(yearData: YearData): YearData {
  const result = { ...yearData };
  
  if (result.revenue) result.revenue_formatted = formatCurrency(result.revenue);
  if (result.profit) result.profit_formatted = formatCurrency(result.profit);
  if (result.ebitda) result.ebitda_formatted = formatCurrency(result.ebitda);
  if (result.assets) result.assets_formatted = formatCurrency(result.assets);
  if (result.equity) result.equity_formatted = formatCurrency(result.equity);
  
  return result;
}

// Extract financial data from text - returns per-year objects
function parseFinancialData(content: string): {
  year_2024: YearData | null;
  year_2023: YearData | null;
  year_2022: YearData | null;
} {
  const years: Map<number, YearData> = new Map();
  
  // Initialize years
  years.set(2024, { source: 'perplexity', confidence: 'unknown' });
  years.set(2023, { source: 'perplexity', confidence: 'unknown' });
  years.set(2022, { source: 'perplexity', confidence: 'unknown' });
  
  // Look for revenue patterns
  const revenuePatterns = [
    /przychod[yów]*[:\s]+(\d[\d\s.,]*)\s*(mld|mln|tys)?\s*(PLN|zł|EUR)?[^\d]*(\d{4})/gi,
    /(\d{4})[:\s-]+przychod[yów]*[:\s]+(\d[\d\s.,]*)\s*(mld|mln|tys)?/gi,
    /(\d[\d\s.,]*)\s*(mld|mln|tys)\s*(PLN|zł|EUR)?.*przychod.*(\d{4})/gi,
    /revenue[:\s]+(\d[\d\s.,]*)\s*(mld|mln|tys|M|B)?.*(\d{4})/gi,
    /(\d{4}).*?(\d+[.,]?\d*)\s*(mld|mln|tys).*?przychod/gi,
    /przychod.*?(\d{4}).*?(\d+[.,]?\d*)\s*(mld|mln|tys)/gi,
  ];
  
  for (const pattern of revenuePatterns) {
    let match;
    const contentCopy = content;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(contentCopy)) !== null) {
      let year: number | null = null;
      
      // Find year in match
      for (const part of match.slice(1)) {
        if (part && /^202[234]$/.test(part)) {
          year = parseInt(part);
          break;
        }
      }
      
      if (year && years.has(year)) {
        const parsed = parsePolishNumber(match[0]);
        if (parsed && parsed > 100000) { // At least 100k PLN
          const existing = years.get(year)!;
          if (!existing.revenue || parsed > existing.revenue) {
            existing.revenue = parsed;
            existing.confidence = 'estimated';
          }
        }
      }
    }
  }
  
  // Look for profit patterns
  const profitPatterns = [
    /zysk\s*(?:netto)?[:\s]+(\d[\d\s.,]*)\s*(mld|mln|tys)?[^\d]*(\d{4})/gi,
    /(\d{4})[:\s-]+zysk[:\s]+(\d[\d\s.,]*)\s*(mld|mln|tys)?/gi,
    /profit[:\s]+(\d[\d\s.,]*)\s*(mld|mln|tys|M)?.*(\d{4})/gi,
    /(\d{4}).*?zysk.*?(\d+[.,]?\d*)\s*(mld|mln|tys)/gi,
  ];
  
  for (const pattern of profitPatterns) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(content)) !== null) {
      let year: number | null = null;
      
      for (const part of match.slice(1)) {
        if (part && /^202[234]$/.test(part)) {
          year = parseInt(part);
          break;
        }
      }
      
      if (year && years.has(year)) {
        const parsed = parsePolishNumber(match[0]);
        if (parsed) {
          const existing = years.get(year)!;
          if (!existing.profit) {
            existing.profit = parsed;
          }
        }
      }
    }
  }
  
  // Look for EBITDA patterns
  const ebitdaPatterns = [
    /ebitda[:\s]+(\d[\d\s.,]*)\s*(mld|mln|tys)?[^\d]*(\d{4})/gi,
    /(\d{4})[:\s-]+ebitda[:\s]+(\d[\d\s.,]*)\s*(mld|mln|tys)?/gi,
  ];
  
  for (const pattern of ebitdaPatterns) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(content)) !== null) {
      let year: number | null = null;
      
      for (const part of match.slice(1)) {
        if (part && /^202[234]$/.test(part)) {
          year = parseInt(part);
          break;
        }
      }
      
      if (year && years.has(year)) {
        const parsed = parsePolishNumber(match[0]);
        if (parsed) {
          const existing = years.get(year)!;
          if (!existing.ebitda) {
            existing.ebitda = parsed;
          }
        }
      }
    }
  }
  
  // Look for employee count
  const employeePatterns = [
    /zatrudnieni?e?[:\s]+(\d+)[^\d]*(\d{4})?/gi,
    /(\d+)\s*(?:pracownik|osób|etatów).*?(\d{4})?/gi,
    /employees?[:\s]+(\d+).*?(\d{4})?/gi,
    /(\d{4}).*?(\d+)\s*(?:pracownik|osób|zatrudn)/gi,
  ];
  
  for (const pattern of employeePatterns) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(content)) !== null) {
      let year: number | null = null;
      let count: number | null = null;
      
      for (const part of match.slice(1)) {
        if (part && /^202[234]$/.test(part)) {
          year = parseInt(part);
        } else if (part && /^\d+$/.test(part)) {
          const num = parseInt(part);
          if (num > 0 && num < 100000) {
            count = num;
          }
        }
      }
      
      // Default to 2024 if no year found
      if (!year) year = 2024;
      
      if (count && years.has(year)) {
        const existing = years.get(year)!;
        if (!existing.employees) {
          existing.employees = count;
        }
      }
    }
  }
  
  // Look for assets
  const assetsPatterns = [
    /aktyw[aów]*[:\s]+(\d[\d\s.,]*)\s*(mld|mln|tys)?[^\d]*(\d{4})/gi,
    /assets?[:\s]+(\d[\d\s.,]*)\s*(mld|mln|tys|M|B)?.*(\d{4})/gi,
  ];
  
  for (const pattern of assetsPatterns) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(content)) !== null) {
      let year: number | null = null;
      
      for (const part of match.slice(1)) {
        if (part && /^202[234]$/.test(part)) {
          year = parseInt(part);
          break;
        }
      }
      
      if (year && years.has(year)) {
        const parsed = parsePolishNumber(match[0]);
        if (parsed && parsed > 100000) {
          const existing = years.get(year)!;
          if (!existing.assets) {
            existing.assets = parsed;
          }
        }
      }
    }
  }
  
  // Get year data and add formatting
  const year_2024 = years.get(2024);
  const year_2023 = years.get(2023);
  const year_2022 = years.get(2022);
  
  return {
    year_2024: hasData(year_2024) ? addFormatting(year_2024!) : null,
    year_2023: hasData(year_2023) ? addFormatting(year_2023!) : null,
    year_2022: hasData(year_2022) ? addFormatting(year_2022!) : null,
  };
}

// Calculate trends from year data
function calculateTrends(
  year_2022: YearData | null,
  year_2023: YearData | null,
  year_2024: YearData | null
): Trends {
  const trends: Trends = {
    revenue: 'unknown',
    profit: 'unknown',
    employees: 'unknown',
    overall_health: 'unknown'
  };
  
  // Revenue trend
  const rev2022 = year_2022?.revenue;
  const rev2024 = year_2024?.revenue;
  const rev2023 = year_2023?.revenue;
  
  if (rev2022 && rev2024) {
    const change = (rev2024 - rev2022) / rev2022;
    if (change > 0.1) trends.revenue = 'ascending';
    else if (change < -0.1) trends.revenue = 'descending';
    else trends.revenue = 'stable';
    
    // CAGR (2 years)
    const cagr = Math.pow(rev2024 / rev2022, 0.5) - 1;
    trends.revenue_cagr = (cagr * 100).toFixed(1) + '%';
  } else if (rev2023 && rev2024) {
    const change = (rev2024 - rev2023) / rev2023;
    if (change > 0.05) trends.revenue = 'ascending';
    else if (change < -0.05) trends.revenue = 'descending';
    else trends.revenue = 'stable';
    
    trends.revenue_cagr = (change * 100).toFixed(1) + '%';
  }
  
  // Profit trend
  const profit2022 = year_2022?.profit;
  const profit2024 = year_2024?.profit;
  const profit2023 = year_2023?.profit;
  
  if (profit2022 && profit2024) {
    const change = (profit2024 - profit2022) / Math.abs(profit2022);
    if (change > 0.1) trends.profit = 'ascending';
    else if (change < -0.1) trends.profit = 'descending';
    else trends.profit = 'stable';
  } else if (profit2023 && profit2024) {
    const change = (profit2024 - profit2023) / Math.abs(profit2023);
    if (change > 0.05) trends.profit = 'ascending';
    else if (change < -0.05) trends.profit = 'descending';
    else trends.profit = 'stable';
  }
  
  // Employee trend
  const emp2022 = year_2022?.employees;
  const emp2024 = year_2024?.employees;
  const emp2023 = year_2023?.employees;
  
  if (emp2022 && emp2024) {
    const change = (emp2024 - emp2022) / emp2022;
    if (change > 0.05) trends.employees = 'growing';
    else if (change < -0.05) trends.employees = 'shrinking';
    else trends.employees = 'stable';
  } else if (emp2023 && emp2024) {
    const change = (emp2024 - emp2023) / emp2023;
    if (change > 0.03) trends.employees = 'growing';
    else if (change < -0.03) trends.employees = 'shrinking';
    else trends.employees = 'stable';
  }
  
  // Overall health (combination of trends)
  const positives = [
    trends.revenue === 'ascending',
    trends.profit === 'ascending',
    trends.employees === 'growing'
  ].filter(Boolean).length;
  
  const negatives = [
    trends.revenue === 'descending',
    trends.profit === 'descending',
    trends.employees === 'shrinking'
  ].filter(Boolean).length;
  
  if (positives >= 2) trends.overall_health = 'strong';
  else if (negatives >= 2) trends.overall_health = 'declining';
  else if (positives >= 1 || trends.revenue === 'stable') trends.overall_health = 'stable';
  
  return trends;
}

// Calculate confidence level based on data quality
function calculateConfidenceLevel(
  year_2024: YearData | null,
  year_2023: YearData | null,
  year_2022: YearData | null
): 'high' | 'medium' | 'low' | 'none' {
  const years = [year_2024, year_2023, year_2022].filter(Boolean) as YearData[];
  
  if (years.length === 0) return 'none';
  
  const verifiedCount = years.filter(y => y.confidence === 'verified' || y.source === 'krs').length;
  const estimatedCount = years.filter(y => y.confidence === 'estimated').length;
  const hasRevenueData = years.filter(y => y.revenue).length;
  
  if (verifiedCount >= 2) return 'high';
  if (verifiedCount >= 1 || (estimatedCount >= 2 && hasRevenueData >= 2)) return 'medium';
  if (estimatedCount >= 1 || hasRevenueData >= 1) return 'low';
  return 'none';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authorization
    const authResult = await verifyAuth(req, supabase);
    if (isAuthError(authResult)) {
      return unauthorizedResponse(authResult, corsHeaders);
    }

    console.log(`[fetch-company-financials] Authorized user: ${authResult.user.id}, tenant: ${authResult.tenantId}`);

    const { company_id, company_name, krs } = await req.json();

    if (!company_id || !company_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_id and company_name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY');

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
    
    // Parse financial data into per-year objects
    const { year_2024, year_2023, year_2022 } = parseFinancialData(content);
    
    // Calculate trends
    const trends = calculateTrends(year_2022, year_2023, year_2024);
    
    // Calculate confidence level
    const confidence_level = calculateConfidenceLevel(year_2024, year_2023, year_2022);

    // Build financial data object according to spec
    const financialData: FinancialData3Y = {
      year_2024,
      year_2023,
      year_2022,
      trends,
      data_sources: citations.slice(0, 10),
      confidence_level,
      fetched_at: new Date().toISOString(),
    };

    // If we found revenue data, also update the main revenue fields
    const latestRevenue = year_2024?.revenue || year_2023?.revenue || year_2022?.revenue;
    const latestYear = year_2024?.revenue ? 2024 : (year_2023?.revenue ? 2023 : 2022);
    
    // Save to database
    const updateData: Record<string, unknown> = {
      financial_data_3y: financialData,
      financial_data_status: 'completed',
      financial_data_date: new Date().toISOString(),
    };

    if (latestRevenue) {
      updateData.revenue_amount = latestRevenue;
      updateData.revenue_year = latestYear;
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

    const yearsFound = [year_2024, year_2023, year_2022].filter(Boolean).length;
    console.log(`[Stage 4] Completed with ${yearsFound} years of data, confidence: ${confidence_level}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: financialData,
        years_found: yearsFound,
        trends,
        confidence_level,
        latest_revenue: latestRevenue
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[Stage 4] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
