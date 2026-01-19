import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    console.log(`[update-company-revenue] Authorized user: ${authResult.user.id}`);

    const { company_id, company_name, is_group } = await req.json();
    
    if (!company_id || !company_name) {
      return new Response(
        JSON.stringify({ error: 'company_id i company_name są wymagane' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Klucz API nie jest skonfigurowany' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('=== UPDATING COMPANY REVENUE ===');
    console.log('Company:', company_name);
    console.log('Is group:', is_group);

    let perplexityInsights: string | null = null;
    let citations: string[] = [];

    // Query Perplexity for financial data
    if (PERPLEXITY_API_KEY) {
      const query = is_group 
        ? `"${company_name}" Polska przychody obroty zysk ranking 2024 2023:
- przychody skonsolidowane grupy kapitałowej (PLN)
- przychody poszczególnych spółek z grupy (nazwy + kwoty + rok)
- lista spółek wchodzących w skład grupy kapitałowej
- przychody każdej spółki zależnej osobno
- dynamika wzrostu % rok do roku
- liczba pracowników w grupie`
        : `"${company_name}" Polska przychody obroty zysk ranking 2024 2023:
- przychody roczne w PLN (ostatnie 2 lata)
- czy jest częścią grupy kapitałowej? Jeśli tak, podaj nazwę grupy
- dynamika wzrostu % rok do roku
- pozycja w rankingach branżowych
- liczba pracowników`;

      const systemMessage = `Jesteś analitykiem finansowym specjalizującym się w polskich firmach.
Szukaj TYLKO konkretnych danych finansowych z wiarygodnych źródeł.

${is_group ? `WAŻNE - TO JEST GRUPA KAPITAŁOWA:
- Podaj przychody SKONSOLIDOWANE całej grupy
- Wylistuj KAŻDĄ spółkę z grupy z osobnymi przychodami
- Dla każdej spółki: nazwa, przychód, rok` : ''}

ZASADY:
- Podawaj KONKRETNE liczby z rokiem
- Cytuj źródło dla każdej liczby
- Jeśli brak danych - napisz "brak danych publicznych"
- NIE wymyślaj liczb`;

      try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
              { role: 'system', content: systemMessage },
              { role: 'user', content: query }
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          perplexityInsights = data.choices?.[0]?.message?.content || null;
          citations = data.citations || [];
          console.log('Perplexity insights received, length:', perplexityInsights?.length || 0);
        }
      } catch (e) {
        console.warn('Perplexity error:', e);
      }
    }

    // Use AI to extract structured data
    const aiPrompt = `Przeanalizuj poniższe dane i wyodrębnij informacje finansowe w formacie JSON.

DANE:
${perplexityInsights || 'Brak danych z Perplexity'}

WYMAGANY FORMAT JSON:
{
  "revenue_amount": <number | null>,
  "revenue_year": <number | null>,
  "growth_rate": <number | null>,
  "employee_count": <number | null>,
  "is_group": <boolean>,
  "consolidated_revenue": {
    "amount": <number | null>,
    "year": <number | null>,
    "source": <string | null>
  } | null,
  "group_companies": [
    {
      "name": <string>,
      "nip": <string | null>,
      "revenue_amount": <number | null>,
      "revenue_year": <number | null>,
      "role": "parent" | "subsidiary" | "affiliate",
      "ownership_percent": <number | null>
    }
  ] | null,
  "source": <string>,
  "confidence": "high" | "medium" | "low"
}

ZASADY:
- revenue_amount w PLN (nie w milionach!)
- Jeśli podano "2,5 mld PLN" → 2500000000
- Jeśli podano "150 mln PLN" → 150000000
- Dla grup: wypełnij group_companies z każdą spółką osobno
- Jeśli brak danych → null
- TYLKO JSON, bez komentarzy`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: aiPrompt }
        ],
        max_tokens: 4000,
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Błąd podczas analizy danych' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    let extractedData;
    try {
      let cleanedContent = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedContent = jsonMatch[0];
      }
      extractedData = JSON.parse(cleanedContent);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      return new Response(
        JSON.stringify({ error: 'Nie udało się przetworzyć danych finansowych' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (extractedData.revenue_amount) {
      updateData.revenue_amount = extractedData.revenue_amount;
    }
    if (extractedData.revenue_year) {
      updateData.revenue_year = extractedData.revenue_year;
    }
    if (extractedData.growth_rate !== null && extractedData.growth_rate !== undefined) {
      updateData.growth_rate = extractedData.growth_rate;
    }
    if (extractedData.employee_count) {
      updateData.employee_count = String(extractedData.employee_count);
    }
    if (extractedData.is_group !== null && extractedData.is_group !== undefined) {
      updateData.is_group = extractedData.is_group;
    }
    if (extractedData.group_companies && Array.isArray(extractedData.group_companies) && extractedData.group_companies.length > 0) {
      updateData.group_companies = extractedData.group_companies;
    }

    // Update ai_analysis with new financial data
    const { data: currentCompany, error: fetchError } = await supabase
      .from('companies')
      .select('ai_analysis')
      .eq('id', company_id)
      .single();

    if (!fetchError && currentCompany?.ai_analysis) {
      const updatedAnalysis = {
        ...currentCompany.ai_analysis,
        revenue: extractedData.revenue_amount ? {
          amount: extractedData.revenue_amount,
          year: extractedData.revenue_year || new Date().getFullYear(),
          currency: 'PLN',
          source: extractedData.source || 'Perplexity update'
        } : currentCompany.ai_analysis.revenue,
        growth_rate: extractedData.growth_rate ?? currentCompany.ai_analysis.growth_rate,
        employee_count: extractedData.employee_count ?? currentCompany.ai_analysis.employee_count,
        is_group: extractedData.is_group ?? currentCompany.ai_analysis.is_group,
        group_companies: extractedData.group_companies ?? currentCompany.ai_analysis.group_companies,
        consolidated_revenue: extractedData.consolidated_revenue ?? currentCompany.ai_analysis.consolidated_revenue,
        revenue_update_date: new Date().toISOString()
      };
      updateData.ai_analysis = updatedAnalysis;
    }

    // Update the company
    const { data: updated, error: updateError } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', company_id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Błąd podczas aktualizacji danych' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('=== REVENUE UPDATE COMPLETE ===');
    console.log('Revenue:', extractedData.revenue_amount);
    console.log('Year:', extractedData.revenue_year);
    console.log('Group companies:', extractedData.group_companies?.length || 0);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          revenue_amount: extractedData.revenue_amount,
          revenue_year: extractedData.revenue_year,
          growth_rate: extractedData.growth_rate,
          employee_count: extractedData.employee_count,
          is_group: extractedData.is_group,
          group_companies: extractedData.group_companies,
          consolidated_revenue: extractedData.consolidated_revenue,
          source: extractedData.source,
          confidence: extractedData.confidence
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in update-company-revenue:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Nieznany błąd' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
