import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authorization
    const authResult = await verifyAuth(req, supabase);
    if (isAuthError(authResult)) {
      return unauthorizedResponse(authResult, corsHeaders);
    }

    console.log(`[ocr-business-cards-batch] Authorized user: ${authResult.user.id}, tenant: ${authResult.tenantId}`);

    const { images } = await req.json();
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Brak obrazów do analizy' }),
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

    console.log(`Processing ${images.length} images for business cards...`);

    const allContacts: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      console.log(`Processing image ${i + 1}/${images.length}...`);

      try {
        // Call Lovable AI Gateway with Gemini vision model
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
                content: `Jesteś ekspertem w analizie wizytówek biznesowych. Twoim zadaniem jest przeanalizować zdjęcie, które może zawierać WIELE wizytówek naraz (np. rozłożonych na stole, w wizytowniku).

WAŻNE: Na jednym zdjęciu może być WIELE wizytówek - musisz zidentyfikować i wyodrębnić dane z KAŻDEJ widocznej wizytówki.

Dla KAŻDEJ wizytówki wyekstrahuj:
- title: Tytuł naukowy/zawodowy (dr, prof., mgr, inż., MBA) - TYLKO tytuły, BEZ imienia
- first_name: Imię
- last_name: Nazwisko  
- position: Stanowisko w firmie (nie tytuł naukowy!)
- company: Nazwa firmy
- email: Email
- phone: Telefon główny
- mobile: Telefon komórkowy (jeśli inny)
- website: Strona www (bez http/https)
- address: Pełny adres
- city: Miasto
- nip: NIP firmy (jeśli widoczny)
- regon: REGON (jeśli widoczny)
- linkedin_url: LinkedIn URL
- notes: Inne informacje (slogan, specjalizacje)
- profile_summary: 2-3 zdania profesjonalnego opisu osoby

PRZYKŁADY rozdzielania tytułów:
- "dr hab. n. med. Jan Kowalski" → title: "dr hab. n. med.", first_name: "Jan", last_name: "Kowalski"
- "mgr inż. Anna Nowak" → title: "mgr inż.", first_name: "Anna", last_name: "Nowak"

Zwróć TYLKO poprawny JSON (bez markdown) w formacie:
{
  "contacts": [
    { ...dane wizytówki 1... },
    { ...dane wizytówki 2... },
    ...
  ],
  "total_found": liczba_wizytówek
}

Jeśli pole jest niewidoczne, ustaw null.
Normalizuj telefony do +48...
Wizytówki mogą być obrócone, nakładać się - zidentyfikuj każdą osobno.`
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Przeanalizuj to zdjęcie i wyodrębnij dane ze WSZYSTKICH widocznych wizytówek:'
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
            max_tokens: 4000,
            temperature: 0.1,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Image ${i + 1} error:`, response.status, errorText);
          
          if (response.status === 429) {
            errors.push(`Obraz ${i + 1}: Przekroczono limit zapytań, spróbuj ponownie później`);
            continue;
          }
          if (response.status === 402) {
            errors.push(`Obraz ${i + 1}: Wymagana płatność - dodaj środki do konta`);
            continue;
          }
          
          errors.push(`Obraz ${i + 1}: Błąd analizy`);
          continue;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (!content) {
          console.error(`Image ${i + 1}: No content in response`);
          errors.push(`Obraz ${i + 1}: Brak odpowiedzi od AI`);
          continue;
        }

        // Parse JSON response
        let parsedData;
        try {
          const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          parsedData = JSON.parse(cleanedContent);
        } catch (parseError) {
          console.error(`Image ${i + 1}: Failed to parse:`, content);
          errors.push(`Obraz ${i + 1}: Nie udało się przetworzyć odpowiedzi`);
          continue;
        }

        // Add contacts from this image
        if (parsedData.contacts && Array.isArray(parsedData.contacts)) {
          console.log(`Image ${i + 1}: Found ${parsedData.contacts.length} contacts`);
          allContacts.push(...parsedData.contacts);
        } else if (parsedData.first_name) {
          // Single contact returned directly
          console.log(`Image ${i + 1}: Found 1 contact (direct)`);
          allContacts.push(parsedData);
        }

      } catch (err) {
        console.error(`Image ${i + 1} processing error:`, err);
        errors.push(`Obraz ${i + 1}: ${err instanceof Error ? err.message : 'Nieznany błąd'}`);
      }

      // Small delay between images to avoid rate limiting
      if (i < images.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`Total contacts extracted: ${allContacts.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        contacts: allContacts,
        total: allContacts.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ocr-business-cards-batch:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Nieznany błąd' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
