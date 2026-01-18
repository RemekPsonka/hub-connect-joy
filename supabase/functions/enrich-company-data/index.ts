import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

// Check if logo URL is valid (Clearbit returns 200 for existing logos)
async function isLogoValid(logoUrl: string): Promise<boolean> {
  try {
    const response = await fetch(logoUrl, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company_name, website, industry_hint } = await req.json();
    
    if (!company_name) {
      return new Response(
        JSON.stringify({ error: 'Nazwa firmy jest wymagana' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Klucz API nie jest skonfigurowany' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Enriching company data for:', company_name);

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

    // Step 2: Call Lovable AI Gateway for company analysis
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `Jesteś ekspertem w analizie firm polskich.

⚠️ KLUCZOWA ZASADA - ŹRÓDŁA DANYCH:
NIE MASZ dostępu do baz REGON, KRS, CEIDG ani internetu.
Możesz TYLKO:
1. Sugerować prawdopodobną branżę na podstawie nazwy firmy
2. Podać ogólny opis działalności na podstawie nazwy

NIE WYMYŚLAJ konkretnych danych rejestrowych (NIP, REGON, KRS, adres)!
Jeśli nie znasz - zwróć null.

📊 OZNACZENIA W ODPOWIEDZI:
- Pola z wartością = SUGESTIA AI (nie fakt!)
- Pole "data_certainty" = jakie dane są pewne vs sugestie

Zwróć TYLKO poprawny JSON:
{
  "name": "Pełna oficjalna nazwa firmy (lub oryginalna jeśli nieznana)",
  "nip": null,
  "regon": null,
  "krs": null,
  "address": null,
  "city": null,
  "postal_code": null,
  "country": "Polska",
  "industry": "💡 SUGESTIA: Prawdopodobna branża na podstawie nazwy",
  "description": "💡 SUGESTIA: Ogólny opis prawdopodobnej działalności",
  "services": "💡 SUGESTIA: Prawdopodobne usługi/produkty",
  "collaboration_areas": "💡 SUGESTIA: Potencjalne obszary współpracy",
  "employee_count_estimate": null,
  "confidence": "low",
  "data_certainty": {
    "industry": "sugestia",
    "description": "sugestia",
    "nip": "brak_danych",
    "address": "brak_danych"
  },
  "suggested_website": null,
  "data_notes": ["Wszystkie dane to SUGESTIE - wymaga weryfikacji w REGON/KRS"]
}`
          },
          {
            role: 'user',
            content: `Przeanalizuj firmę i zasugeruj profil (oznacz jako sugestie!):

Nazwa firmy: ${company_name}
${website ? `Strona www: ${website}` : 'Strona www: Nie podano'}
${industry_hint ? `Wskazówka branżowa: ${industry_hint}` : ''}

UWAGA: NIE masz dostępu do REGON/KRS. Nie wymyślaj NIP, adresu itp.
Możesz tylko sugerować branżę na podstawie nazwy.`
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

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
    console.log('AI response received');

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
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      enrichedData = JSON.parse(cleanedContent);
      
      // Ensure we don't return fake NIP/REGON/KRS
      // These should only come from verified sources
      enrichedData.nip = null;
      enrichedData.regon = null;
      enrichedData.krs = null;
      enrichedData.address = null;
      enrichedData.postal_code = null;
      enrichedData.city = null;
      
      // Add note about data source
      if (!enrichedData.data_notes) {
        enrichedData.data_notes = [];
      }
      enrichedData.data_notes.push('NIP/REGON/KRS/adres wymaga weryfikacji w oficjalnych rejestrach');
      
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ error: 'Nie udało się przetworzyć danych firmy', raw: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: If no logo yet and AI suggested a website, try to get logo from it
    if (!logo_url && enrichedData.suggested_website) {
      const suggestedDomain = extractDomain(enrichedData.suggested_website);
      if (suggestedDomain) {
        const clearbitUrl = getClearbitLogoUrl(suggestedDomain);
        if (clearbitUrl) {
          const isValid = await isLogoValid(clearbitUrl);
          if (isValid) {
            logo_url = clearbitUrl;
            console.log('Found logo via AI-suggested website:', logo_url);
          }
        }
      }
    }

    // Add logo_url to response
    enrichedData.logo_url = logo_url;

    console.log('Successfully enriched company data:', enrichedData);

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
