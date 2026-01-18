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
  // Handle CORS preflight requests
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

    // Step 2: Call Lovable AI Gateway for company analysis with extended data
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
            content: `Jesteś ekspertem w analizie firm polskich. Na podstawie nazwy firmy i dostępnych informacji, wygeneruj prawdopodobny profil firmy wraz z danymi rejestracyjnymi.

WAŻNE: Generujesz PRZYPUSZCZENIA na podstawie nazwy i kontekstu. Dane rejestrowe (NIP, REGON, KRS) możesz podać tylko jeśli masz pewność - w przeciwnym razie zwróć null.

Zwróć TYLKO poprawny JSON (bez markdown, bez \`\`\`) z polami:
- name: Pełna oficjalna nazwa firmy (string)
- nip: Numer NIP firmy (10 cyfr bez myślników) lub null jeśli nieznany
- regon: Numer REGON firmy (9 lub 14 cyfr) lub null jeśli nieznany
- krs: Numer KRS (10 cyfr) lub null jeśli nieznany
- address: Ulica i numer budynku lub null
- city: Miasto siedziby firmy lub null
- postal_code: Kod pocztowy (XX-XXX) lub null
- country: Kraj (domyślnie "Polska")
- industry: Prawdopodobna branża firmy (string)
- description: Krótki opis działalności, 2-3 zdania (string)
- services: Lista prawdopodobnych usług/produktów, oddzielone przecinkami (string)
- collaboration_areas: Potencjalne obszary współpracy biznesowej (string)
- employee_count_estimate: Szacunkowa wielkość firmy: "micro" (1-9), "small" (10-49), "medium" (50-249), "large" (250+) lub null
- confidence: Poziom pewności oceny: "high", "medium", "low"
- suggested_website: Jeśli znasz oficjalną stronę firmy, podaj URL (string lub null)`
          },
          {
            role: 'user',
            content: `Przeanalizuj firmę i wygeneruj pełny profil z danymi rejestracyjnymi:

Nazwa firmy: ${company_name}
${website ? `Strona www: ${website}` : ''}
${industry_hint ? `Wskazówka branżowa: ${industry_hint}` : ''}

Wygeneruj prawdopodobny profil tej firmy wraz z danymi rejestracyjnymi jeśli są dostępne.`
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
