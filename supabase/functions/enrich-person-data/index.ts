import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

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
  profile_summary: string | null;
  sources: string[];
  search_performed: boolean;
  confidence: 'verified' | 'partial' | 'not_found';
  data_notes: string[];
}

interface FirecrawlSearchResult {
  url: string;
  title: string;
  description?: string;
  markdown?: string;
}

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

    console.log(`[enrich-person-data] Authorized user: ${authResult.user.id}, tenant: ${authResult.tenantId}`);

    const { first_name, last_name, company, email, linkedin_url } = await req.json() as PersonData;
    
    if (!first_name || !last_name) {
      return new Response(
        JSON.stringify({ error: 'Imię i nazwisko są wymagane' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!FIRECRAWL_API_KEY) {
      console.error('FIRECRAWL_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Firecrawl API nie jest skonfigurowany' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Lovable AI API nie jest skonfigurowany' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[enrich-person-data] Starting Firecrawl search for:', first_name, last_name, company);

    // Step 1: Search for the person using Firecrawl
    const searchQuery = `${first_name} ${last_name} ${company || ''} LinkedIn stanowisko zawodowe`;
    
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 5,
        lang: 'pl',
        scrapeOptions: {
          formats: ['markdown']
        }
      }),
    });

    if (!firecrawlResponse.ok) {
      const errorText = await firecrawlResponse.text();
      console.error('[enrich-person-data] Firecrawl API error:', firecrawlResponse.status, errorText);
      
      if (firecrawlResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Przekroczono limit zapytań Firecrawl, spróbuj ponownie za chwilę' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Błąd podczas wyszukiwania osoby' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlData = await firecrawlResponse.json();
    const searchResults: FirecrawlSearchResult[] = firecrawlData.data || [];
    
    console.log(`[enrich-person-data] Firecrawl returned ${searchResults.length} results`);

    // Step 2: Analyze results with Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `Jesteś ekspertem w analizie wyników wyszukiwania o osobach.

TWOJE ZADANIE:
Przeanalizuj wyniki wyszukiwania i wyodrębnij ZWERYFIKOWANE informacje o szukanej osobie.

ZASADY KRYTYCZNE:
1. Podawaj TYLKO informacje które BEZPOŚREDNIO dotyczą szukanej osoby
2. Każda informacja MUSI mieć oznaczone źródło [źródło: URL]
3. Jeśli informacja jest niepewna lub dotyczy innej osoby - NIE uwzględniaj jej
4. Jeśli brak danych - jasno to zaznacz

FORMAT ODPOWIEDZI (markdown):

## 🔍 Wyniki wyszukiwania online

### Stanowisko i firma
✅ [informacja] 
📎 Źródło: [URL]

LUB

📭 Nie znaleziono informacji o stanowisku

### Doświadczenie zawodowe
✅ [informacja]
📎 Źródło: [URL]

LUB

📭 Nie znaleziono informacji o doświadczeniu

### LinkedIn
✅ Profil: [URL]

LUB

📭 Nie znaleziono profilu LinkedIn

### Inne informacje
✅ [informacja]
📎 Źródło: [URL]

### Uwagi
💡 [komentarz o jakości/wiarygodności znalezionych danych]

UŻYJ:
- ✅ dla zweryfikowanych faktów ze źródeł
- 📎 dla oznaczenia źródła
- 📭 dla brakujących informacji
- 💡 dla uwag i komentarzy AI`
          },
          {
            role: 'user',
            content: `Szukam informacji o osobie:
- Imię: ${first_name}
- Nazwisko: ${last_name}
${company ? `- Firma: ${company}` : '- Firma: Nie podano'}
${email ? `- Email: ${email}` : ''}
${linkedin_url ? `- LinkedIn: ${linkedin_url}` : ''}

WYNIKI WYSZUKIWANIA (${searchResults.length} wyników):

${searchResults.length === 0 ? 'Brak wyników wyszukiwania.' : searchResults.map((r, i) => `
--- WYNIK ${i + 1} ---
URL: ${r.url}
Tytuł: ${r.title || 'Brak tytułu'}
Opis: ${r.description || 'Brak opisu'}
Treść: ${r.markdown?.substring(0, 1500) || 'Brak treści'}
`).join('\n')}

Przeanalizuj te wyniki i wyodrębnij tylko te informacje, które BEZPOŚREDNIO dotyczą osoby ${first_name} ${last_name}${company ? ` z firmy ${company}` : ''}.
Jeśli wyniki nie dotyczą tej osoby lub brak konkretnych danych - zaznacz to jasno.`
          }
        ],
        max_tokens: 1500,
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Przekroczono limit zapytań AI, spróbuj ponownie za chwilę' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Brak środków na koncie AI, doładuj kredyty' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('[enrich-person-data] AI gateway error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Błąd podczas analizy wyników' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const profileSummary = aiData.choices?.[0]?.message?.content || null;

    if (!profileSummary) {
      console.error('[enrich-person-data] No content in AI response');
      return new Response(
        JSON.stringify({ error: 'Brak odpowiedzi od AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract sources from results
    const sources = searchResults.map(r => r.url);

    // Determine confidence based on results
    let confidence: 'verified' | 'partial' | 'not_found' = 'not_found';
    if (searchResults.length > 0) {
      const hasLinkedIn = sources.some(url => url.includes('linkedin.com'));
      const hasVerifiedInfo = profileSummary.includes('✅');
      
      if (hasLinkedIn || (hasVerifiedInfo && searchResults.length >= 3)) {
        confidence = 'verified';
      } else if (hasVerifiedInfo) {
        confidence = 'partial';
      }
    }

    const enrichedData: EnrichedPersonData = {
      profile_summary: profileSummary,
      sources,
      search_performed: true,
      confidence,
      data_notes: [
        `Przeszukano ${searchResults.length} źródeł internetowych`,
        searchResults.some(r => r.url.includes('linkedin.com')) 
          ? 'Znaleziono profil LinkedIn' 
          : 'Nie znaleziono profilu LinkedIn'
      ]
    };

    console.log('[enrich-person-data] Successfully enriched person data, confidence:', confidence);

    return new Response(
      JSON.stringify({ success: true, data: enrichedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[enrich-person-data] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Nieznany błąd' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
