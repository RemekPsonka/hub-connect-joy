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

    // Step 1: Search for the person using Firecrawl - expanded queries
    const searchQueries = [
      `"${first_name} ${last_name}" ${company || ''} LinkedIn`,
      `"${first_name} ${last_name}" ${company || ''} stanowisko kariera`,
      `"${first_name} ${last_name}" ${company || ''} zarząd prezes dyrektor`
    ];
    
    let allSearchResults: FirecrawlSearchResult[] = [];
    
    // Primary search
    const primaryQuery = `"${first_name} ${last_name}" ${company || ''} LinkedIn stanowisko zawodowe kariera`;
    console.log('[enrich-person-data] Firecrawl search query:', primaryQuery);
    
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: primaryQuery,
        limit: 7,
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

    // Step 2: Analyze results with Lovable AI - ENHANCED PROMPT
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
            content: `Jesteś ekspertem w analizie profili zawodowych osób.

🎯 TWOJE ZADANIE:
Przeanalizuj wyniki wyszukiwania i stwórz SZCZEGÓŁOWY profil zawodowy szukanej osoby.

📋 CO MUSISZ USTALIĆ:

1. AKTUALNE STANOWISKO
   - Dokładna nazwa stanowiska
   - W jakiej firmie pracuje
   - Od kiedy (jeśli dostępne)

2. HISTORIA ZAWODOWA / KARIERA
   - Poprzednie stanowiska i firmy
   - Ścieżka kariery (awanse, zmiany)
   - Kluczowe osiągnięcia

3. KOMPETENCJE I SPECJALIZACJA
   - Główne umiejętności
   - Branża/specjalizacja
   - Certyfikaty, wykształcenie (jeśli dostępne)

4. OBECNOŚĆ ONLINE
   - LinkedIn (URL profilu)
   - Publikacje, artykuły
   - Wystąpienia, konferencje, wywiady

5. ROLA W FIRMIE ${company ? `(${company})` : ''}
   - Czy jest w zarządzie/kierownictwie?
   - Obszar odpowiedzialności
   - Kluczowe projekty/zadania

6. KONTEKST BIZNESOWY
   - Branża w której działa
   - Sieć kontaktów (jeśli widoczna)
   - Aktywność zawodowa

ZASADY KRYTYCZNE:
- Podawaj TYLKO informacje które BEZPOŚREDNIO dotyczą szukanej osoby
- Każda informacja MUSI mieć oznaczone źródło [📎 Źródło: URL]
- Jeśli coś dotyczy INNEJ osoby o podobnym nazwisku - NIE uwzględniaj
- Brak danych = jasno to zaznacz (nie wymyślaj!)

FORMAT ODPOWIEDZI (markdown):

## 👤 Profil zawodowy: ${first_name} ${last_name}

### 💼 Aktualna pozycja
✅ **[Stanowisko]** w **[Firma]**
📅 Od: [data jeśli znana]
📎 Źródło: [URL]

LUB

📭 Nie znaleziono informacji o aktualnym stanowisku

---

### 📈 Historia kariery
| Okres | Stanowisko | Firma |
|-------|------------|-------|
| [data] | [stanowisko] | [firma] |

📎 Źródła: [URLs]

LUB

📭 Nie znaleziono informacji o historii kariery

---

### 🎯 Specjalizacja i kompetencje
- **Branża:** [branża]
- **Kompetencje:** [lista]
- **Wykształcenie:** [jeśli znane]

📎 Źródło: [URL]

---

### 🌐 Obecność online
- **LinkedIn:** [URL lub brak]
- **Publikacje:** [jeśli są]
- **Wystąpienia:** [jeśli są]

---

### 🏢 Rola w ${company || 'firmie'}
✅ [Opis roli, odpowiedzialności, projektów]
📎 Źródło: [URL]

LUB

📭 Brak szczegółów o roli w firmie

---

### 💡 Podsumowanie i uwagi
- **Wiarygodność danych:** [wysoka/średnia/niska]
- **Uwagi:** [komentarz o jakości źródeł, potencjalnych rozbieżnościach]

---

OZNACZENIA:
- ✅ = Zweryfikowany fakt ze źródła
- 📎 = Link do źródła
- 📭 = Brak informacji
- 💡 = Uwaga/komentarz AI
- ⚠️ = Informacja niepewna`
          },
          {
            role: 'user',
            content: `🔍 Szukam SZCZEGÓŁOWYCH informacji o osobie:

👤 DANE PODSTAWOWE:
- Imię: ${first_name}
- Nazwisko: ${last_name}
${company ? `- Firma: ${company}` : '- Firma: Nie podano'}
${email ? `- Email: ${email}` : ''}
${linkedin_url ? `- LinkedIn: ${linkedin_url}` : ''}

═══════════════════════════════════════════════════════════════
📊 WYNIKI WYSZUKIWANIA (${searchResults.length} źródeł):
═══════════════════════════════════════════════════════════════

${searchResults.length === 0 ? '⚠️ Brak wyników wyszukiwania.' : searchResults.map((r, i) => `
┌─────────────────────────────────────────────────────────────
│ ŹRÓDŁO ${i + 1}: ${r.url}
├─────────────────────────────────────────────────────────────
│ Tytuł: ${r.title || 'Brak tytułu'}
│ Opis: ${r.description || 'Brak opisu'}
├─────────────────────────────────────────────────────────────
│ TREŚĆ:
${r.markdown?.substring(0, 2500) || 'Brak treści'}
└─────────────────────────────────────────────────────────────
`).join('\n')}

═══════════════════════════════════════════════════════════════

🎯 ZADANIE:
1. Przeanalizuj WSZYSTKIE źródła
2. Wyodrębnij TYLKO informacje o ${first_name} ${last_name}${company ? ` z firmy ${company}` : ''}
3. Zbuduj pełny profil zawodowy z historią kariery
4. Jeśli dane są o INNEJ osobie - zaznacz to jasno
5. Oceń wiarygodność każdej informacji`
          }
        ],
        max_tokens: 2500,
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
