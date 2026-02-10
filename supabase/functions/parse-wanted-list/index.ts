import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authResult = await verifyAuth(req, supabase);
    if (isAuthError(authResult)) {
      return unauthorizedResponse(authResult, corsHeaders);
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Content is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[parse-wanted-list] Parsing wanted contacts, content length: ${content.length}`);

    const systemPrompt = `Jesteś ekspertem w rozpoznawaniu poszukiwanych kontaktów biznesowych z dowolnego tekstu.
Użytkownik wkleja listę osób/firm, które chce znaleźć — mogą to być notatki ze spotkania, lista CSV, email, lub dowolny tekst.

Twoim zadaniem jest wyodrębnić KAŻDĄ poszukiwaną osobę/firmę jako osobny element.

REGUŁY:
1. Każda osoba lub firma to OSOBNY element w tablicy items
2. Jeśli jest tylko firma bez osoby — person_name = null
3. Jeśli jest tylko osoba bez firmy — company_name = null
4. Rozpoznaj pilność z kontekstu (pilne, ASAP, krytyczne → "high"/"critical", domyślnie "normal")
5. NIP rozpoznaj jeśli jest podany (10 cyfr)
6. Branżę spróbuj wywnioskować z kontekstu
7. search_context = dlaczego szukamy tej osoby/firmy
8. person_context = opis osoby (cechy, reputacja, specjalizacja)
9. company_context = opis firmy lub roli szukanej osoby w firmie
10. Ignoruj puste/nieistotne fragmenty

WAŻNE: Zwróć TYLKO poprawny JSON, bez komentarzy.`;

    const userPrompt = `Przeanalizuj poniższy tekst i wyodrębnij listę poszukiwanych kontaktów/firm.

TEKST:
${content}

Zwróć JSON:
{
  "items": [
    {
      "person_name": "string lub null",
      "person_position": "string lub null",
      "person_context": "string lub null",
      "company_name": "string lub null",
      "company_nip": "string lub null",
      "company_industry": "string lub null",
      "company_context": "string lub null",
      "search_context": "string lub null",
      "urgency": "low" | "normal" | "high" | "critical"
    }
  ],
  "metadata": {
    "totalParsed": number,
    "warnings": ["ewentualne ostrzeżenia"]
  }
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Zbyt wiele zapytań. Spróbuj ponownie za chwilę.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Brak środków na koncie AI. Doładuj kredyty.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const responseText = aiResponse.choices?.[0]?.message?.content || '';

    console.log('[parse-wanted-list] AI response length:', responseText.length);

    let result: any;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      result = {
        items: [],
        metadata: { totalParsed: 0, warnings: ['Nie udało się sparsować odpowiedzi AI'] }
      };
    }

    // Clean items
    result.items = (result.items || []).map((item: any) => ({
      person_name: item.person_name || null,
      person_position: item.person_position || null,
      person_context: item.person_context || null,
      company_name: item.company_name || null,
      company_nip: item.company_nip || null,
      company_industry: item.company_industry || null,
      company_context: item.company_context || null,
      search_context: item.search_context || null,
      urgency: ['low', 'normal', 'high', 'critical'].includes(item.urgency) ? item.urgency : 'normal',
    })).filter((item: any) => item.person_name || item.company_name);

    result.metadata = {
      totalParsed: result.items.length,
      warnings: result.metadata?.warnings || [],
    };

    console.log(`[parse-wanted-list] Parsed ${result.items.length} wanted items`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in parse-wanted-list:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
