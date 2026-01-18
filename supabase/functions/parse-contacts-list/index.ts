import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedContact {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  city: string | null;
  tags: string[];
  notes: string | null;
}

interface ParseResult {
  contacts: ParsedContact[];
  metadata: {
    sourceFormat: string;
    detectedColumns: string[];
    totalParsed: number;
    warnings: string[];
  };
}

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

    console.log(`[parse-contacts-list] Authorized user: ${authResult.user.id}, tenant: ${authResult.tenantId}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { content, contentType, fileName } = await req.json();

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Parsing contacts from ${contentType}, fileName: ${fileName || 'none'}`);

    const systemPrompt = `Jesteś ekspertem w ekstrakcji danych kontaktowych z różnych formatów.
Twoim zadaniem jest przeanalizować dane wejściowe i wyodrębnić listę kontaktów.

REGUŁY PARSOWANIA:
1. Rozpoznaj strukturę danych (nagłówki, separatory, kolumny tabeli)
2. Zmapuj kolumny do pól kontaktu:
   - first_name, last_name (rozdziel jeśli jest jedno pole "NAZWA" lub "Imię i nazwisko")
   - email (rozpoznaj formaty emaili)
   - phone (normalizuj do formatu międzynarodowego +48...)
   - company (firma, organizacja)
   - position (stanowisko, rola)
   - city (miasto)
3. Kolumny typu "Branża", "Sektor", "Opis", "Działalność" → zapisz w polu notes
4. Kolumny typu "Grupa", "Kategoria", "Label", "Tag" → zapisz w tablicy tags
5. Ignoruj wartości "--", "-", "brak", puste
6. Usuń duplikaty w ramach tej listy (to samo imię i nazwisko)
7. Jeśli brak imienia ale jest email → spróbuj wyciągnąć z emaila (jan.kowalski@... → Jan Kowalski)
8. Dla zrzutów ekranu: rozpoznaj tabelę i wyodrębnij dane z widocznych kolumn

WAŻNE:
- Zwróć TYLKO poprawny JSON
- Nie dodawaj żadnych komentarzy ani wyjaśnień
- Jeśli nie można wyodrębnić kontaktów, zwróć pustą tablicę`;

    const userPrompt = `Przeanalizuj poniższe dane i wyodrębnij kontakty.
Typ danych: ${contentType}
${fileName ? `Nazwa pliku: ${fileName}` : ''}

DANE:
${contentType === 'image' ? '[Obraz w załączeniu - przeanalizuj widoczną tabelę/listę kontaktów]' : content}

Zwróć JSON w formacie:
{
  "contacts": [
    {
      "first_name": "string lub null",
      "last_name": "string lub null", 
      "email": "string lub null",
      "phone": "string lub null",
      "company": "string lub null",
      "position": "string lub null",
      "city": "string lub null",
      "tags": ["array", "of", "strings"],
      "notes": "string lub null"
    }
  ],
  "metadata": {
    "sourceFormat": "csv|excel|pdf|image|text",
    "detectedColumns": ["lista", "wykrytych", "kolumn"],
    "totalParsed": number,
    "warnings": ["lista", "ostrzeżeń"]
  }
}`;

    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    // For images, use vision capability
    if (contentType === 'image') {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          { 
            type: "image_url", 
            image_url: { 
              url: content.startsWith('data:') ? content : `data:image/png;base64,${content}` 
            } 
          }
        ]
      });
    } else {
      messages.push({ role: "user", content: userPrompt });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const responseText = aiResponse.choices?.[0]?.message?.content || '';

    console.log('AI response received, length:', responseText.length);

    // Parse JSON from response
    let result: ParseResult;
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Response text:', responseText.substring(0, 500));
      
      result = {
        contacts: [],
        metadata: {
          sourceFormat: contentType,
          detectedColumns: [],
          totalParsed: 0,
          warnings: ['Nie udało się sparsować odpowiedzi AI']
        }
      };
    }

    // Validate and clean contacts
    result.contacts = (result.contacts || []).map(contact => ({
      first_name: contact.first_name || null,
      last_name: contact.last_name || null,
      email: contact.email || null,
      phone: contact.phone || null,
      company: contact.company || null,
      position: contact.position || null,
      city: contact.city || null,
      tags: Array.isArray(contact.tags) ? contact.tags : [],
      notes: contact.notes || null,
    })).filter(c => c.first_name || c.last_name || c.email);

    result.metadata = {
      sourceFormat: result.metadata?.sourceFormat || contentType,
      detectedColumns: result.metadata?.detectedColumns || [],
      totalParsed: result.contacts.length,
      warnings: result.metadata?.warnings || []
    };

    console.log(`Successfully parsed ${result.contacts.length} contacts`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in parse-contacts-list:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
