import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Klucz API OpenAI nie jest skonfigurowany' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Enriching company data for:', company_name);

    // Call OpenAI GPT-4 API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Jesteś ekspertem w analizie firm i rynku polskiego. Na podstawie nazwy firmy i dostępnych informacji, wygeneruj prawdopodobny profil firmy.

WAŻNE: Generujesz PRZYPUSZCZENIA na podstawie nazwy i kontekstu. Użytkownik powinien zweryfikować te dane.

Zwróć TYLKO poprawny JSON (bez markdown) z polami:
- industry: Prawdopodobna branża firmy (string)
- description: Krótki opis działalności, 2-3 zdania (string)
- services: Lista prawdopodobnych usług/produktów, oddzielone przecinkami (string)
- collaboration_areas: Potencjalne obszary współpracy biznesowej (string)
- employee_count_estimate: Szacunkowa wielkość firmy: "mikro (1-9)", "mała (10-49)", "średnia (50-249)", "duża (250+)" lub null jeśli nie da się oszacować
- confidence: Poziom pewności oceny: "high", "medium", "low"`
          },
          {
            role: 'user',
            content: `Przeanalizuj firmę i wygeneruj profil:

Nazwa firmy: ${company_name}
${website ? `Strona www: ${website}` : ''}
${industry_hint ? `Wskazówka branżowa: ${industry_hint}` : ''}

Wygeneruj prawdopodobny profil tej firmy.`
          }
        ],
        max_tokens: 800,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Błąd podczas analizy firmy' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('OpenAI response received');

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error('No content in OpenAI response');
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
