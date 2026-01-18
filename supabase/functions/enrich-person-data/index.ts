import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PersonData {
  first_name: string;
  last_name: string;
  company?: string;
  email?: string;
  linkedin_url?: string;
}

interface EnrichedPersonData {
  suggested_position: string | null;
  position_certainty: 'confirmed' | 'likely' | 'guess';
  profile_summary: string | null;
  summary_source: string;
  linkedin_found: boolean;
  confidence: 'high' | 'medium' | 'low';
  data_notes: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { first_name, last_name, company, email, linkedin_url } = await req.json() as PersonData;
    
    if (!first_name || !last_name) {
      return new Response(
        JSON.stringify({ error: 'Imię i nazwisko są wymagane' }),
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

    console.log('Enriching person data for:', first_name, last_name, 'at', company);

    // Call Lovable AI Gateway for person analysis
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
            content: `Jesteś ekspertem w analizie profili zawodowych osób.

⚠️ KLUCZOWA ZASADA:
NIE MASZ dostępu do internetu ani LinkedIn.
Pracujesz TYLKO na danych przekazanych w zapytaniu.
NIE WYMYŚLAJ informacji o konkretnej osobie!

TWOJE ZADANIE:
Na podstawie nazwy firmy i kontekstu, zasugeruj PRAWDOPODOBNE stanowisko.
Jasno oznacz, że to SUGESTIA, nie fakt.

ZASADY:
1. Jeśli podano email firmowy → "likely" (prawdopodobne stanowisko)
2. Jeśli tylko nazwa firmy → "guess" (zgadywanie)
3. NIE twórz wymyślonego opisu osoby
4. Profile summary = tylko ogólne info o typowym stanowisku w takiej firmie

Zwróć TYLKO poprawny JSON:
{
  "suggested_position": "string lub null",
  "position_certainty": "confirmed" | "likely" | "guess",
  "profile_summary": "Krótka OGÓLNA informacja o typowym stanowisku w takiej firmie (nie o konkretnej osobie!) lub null",
  "summary_source": "AI_DEDUCTION" | "NO_DATA",
  "linkedin_found": false,
  "confidence": "low" | "medium",
  "data_notes": ["lista uwag o tym co jest sugestią a co pewne"]
}`
          },
          {
            role: 'user',
            content: `Przeanalizuj dane i zasugeruj stanowisko (oznacz jako sugestię):

Imię: ${first_name}
Nazwisko: ${last_name}
${company ? `Firma: ${company}` : 'Firma: Nie podano'}
${email ? `Email: ${email}` : 'Email: Nie podano'}
${linkedin_url ? `LinkedIn: ${linkedin_url}` : 'LinkedIn: Nie podano'}

UWAGA: Nie masz dostępu do internetu. Możesz tylko zgadywać na podstawie nazwy firmy.
Wszystko co zwracasz to SUGESTIA, nie fakt!`
          }
        ],
        max_tokens: 500,
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
        JSON.stringify({ error: 'Błąd podczas analizy osoby' }),
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
    let enrichedData: EnrichedPersonData;
    try {
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      enrichedData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Return default data on parse error
      enrichedData = {
        suggested_position: null,
        position_certainty: 'guess',
        profile_summary: null,
        summary_source: 'NO_DATA',
        linkedin_found: false,
        confidence: 'low',
        data_notes: ['Nie udało się przetworzyć odpowiedzi AI']
      };
    }

    console.log('Successfully enriched person data:', enrichedData);

    return new Response(
      JSON.stringify({ success: true, data: enrichedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enrich-person-data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Nieznany błąd' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
