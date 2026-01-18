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
  profile_summary: string | null;
  linkedin_found: boolean;
  confidence: 'high' | 'medium' | 'low';
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
            content: `Jesteś ekspertem w wyszukiwaniu informacji o osobach z polskiego biznesu. Na podstawie imienia, nazwiska i firmy, spróbuj określić kim jest ta osoba i jakie stanowisko może pełnić.

WAŻNE: Generujesz PRZYPUSZCZENIA na podstawie dostępnych informacji. Jeśli nie możesz nic znaleźć, zwróć niską pewność.

Zwróć TYLKO poprawny JSON (bez markdown, bez \`\`\`) z polami:
- suggested_position: Prawdopodobne stanowisko osoby (np. "Prezes", "Dyrektor marketingu", "Właściciel") lub null
- profile_summary: Krótki opis osoby w 1-2 zdaniach lub null jeśli brak informacji
- linkedin_found: true jeśli osoba prawdopodobnie ma profil LinkedIn, false jeśli nie wiadomo
- confidence: "high" jeśli dane są pewne, "medium" jeśli przypuszczenia, "low" jeśli mało informacji`
          },
          {
            role: 'user',
            content: `Znajdź informacje o tej osobie:

Imię: ${first_name}
Nazwisko: ${last_name}
${company ? `Firma: ${company}` : ''}
${email ? `Email: ${email}` : ''}
${linkedin_url ? `LinkedIn: ${linkedin_url}` : ''}

Na podstawie dostępnych informacji, opisz kim może być ta osoba.`
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
        profile_summary: null,
        linkedin_found: false,
        confidence: 'low'
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
