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
    const { image } = await req.json();
    
    if (!image) {
      return new Response(
        JSON.stringify({ error: 'Brak obrazu do analizy' }),
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

    console.log('Processing business card image...');

    // Call OpenAI GPT-4 Vision API
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
            content: `Jesteś ekspertem w analizie wizytówek. Twoim zadaniem jest wyekstrahowanie wszystkich danych kontaktowych z obrazu wizytówki.

WAŻNE: Rozdziel dane osobowe na tytuł naukowy/zawodowy, imię i nazwisko.
            
Zwróć TYLKO poprawny JSON (bez markdown, bez komentarzy) z następującymi polami:
- title: Tytuł naukowy lub zawodowy (dr, prof., mgr, inż., dr hab., dr n. med., MBA, etc.) - TYLKO tytuły, BEZ imienia i nazwiska (string lub null)
- first_name: Imię osoby (string, wymagane)
- last_name: Nazwisko osoby (string, wymagane)
- position: Stanowisko w firmie, np. Dyrektor, Manager, Prezes (string lub null) - to NIE jest tytuł naukowy!
- company: Nazwa firmy (string lub null)
- email: Adres email (string lub null)
- phone: Główny numer telefonu (string lub null)
- mobile: Numer komórkowy jeśli inny niż główny (string lub null)
- website: Strona www firmy bez http/https (string lub null)
- address: Pełny adres - ulica, numer, miasto, kod (string lub null)
- city: Samo miasto (string lub null)
- linkedin_url: URL profilu LinkedIn jeśli widoczny (string lub null)
- notes: Inne informacje z wizytówki, np. slogan, specjalizacje (string lub null)

PRZYKŁADY rozdzielania:
- "dr hab. n. med. Jan Kowalski, prof. UJ" → title: "dr hab. n. med., prof. UJ", first_name: "Jan", last_name: "Kowalski"
- "mgr inż. Anna Nowak" → title: "mgr inż.", first_name: "Anna", last_name: "Nowak"
- "Piotr Wiśniewski MBA" → title: "MBA", first_name: "Piotr", last_name: "Wiśniewski"
- "Jan Kowalski" → title: null, first_name: "Jan", last_name: "Kowalski"

Jeśli jakieś pole nie jest widoczne na wizytówce, ustaw null.
Normalizuj numery telefonów do formatu międzynarodowego (+48...).
Usuń prefiksy http/https ze stron www.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Przeanalizuj tę wizytówkę i wyekstrahuj wszystkie dane kontaktowe:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: image,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1, // Low temperature for more consistent extraction
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Błąd podczas analizy wizytówki' }),
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
    let extractedData;
    try {
      // Remove potential markdown code blocks
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extractedData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ error: 'Nie udało się przetworzyć danych z wizytówki', raw: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully extracted data:', extractedData);

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ocr-business-card:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Nieznany błąd' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
