// INTERNAL — wywoływane tylko przez `enrich-person/` (orchestrator). Nie wołać bezpośrednio z FE.
// Step alias: 'data' (default w orchestratorze).
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
  perplexity_used: boolean;
  public_statements: string | null;
  other_organizations: string | null;
  warnings: string | null;
  tags: string[];
}

interface FirecrawlSearchResult {
  url: string;
  title: string;
  description?: string;
  markdown?: string;
}

interface PerplexityResult {
  content: string;
  citations: string[];
}

async function queryPerplexity(
  apiKey: string, 
  query: string, 
  systemPrompt: string,
  recencyFilter?: string
): Promise<PerplexityResult | null> {
  try {
    const body: Record<string, unknown> = {
      model: 'sonar-pro',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
    };
    
    if (recencyFilter) {
      body.search_recency_filter = recencyFilter;
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`[Perplexity] Error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      citations: data.citations || []
    };
  } catch (error) {
    console.error('[Perplexity] Query error:', error);
    return null;
  }
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

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY') || Deno.env.get('FIRECRAWL_API_KEY_1');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Lovable AI API nie jest skonfigurowany' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fullName = `${first_name} ${last_name}`;
    const companyContext = company ? ` ${company}` : '';
    
    console.log('[enrich-person-data] Starting enrichment for:', fullName, company);

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: PARALLEL PERPLEXITY QUERIES (if API key available)
    // ═══════════════════════════════════════════════════════════════
    
    let perplexityResults: {
      profile: PerplexityResult | null;
      media: PerplexityResult | null;
      organizations: PerplexityResult | null;
      family: PerplexityResult | null;
    } = { profile: null, media: null, organizations: null, family: null };
    
    let allPerplexityCitations: string[] = [];
    
    if (PERPLEXITY_API_KEY) {
      console.log('[enrich-person-data] Starting Perplexity searches...');
      
      // QUERY 1: Professional profile and career
      const profileQuery = `"${fullName}"${companyContext} Polska:
- aktualne stanowisko i firma
- historia kariery, poprzednie stanowiska
- wykształcenie, certyfikaty, osiągnięcia
- LinkedIn, bio zawodowe
- branża i specjalizacja`;

      const profileSystemPrompt = `Jesteś ekspertem w researchu biznesowym. Znajdź i przedstaw SZCZEGÓŁOWY profil zawodowy osoby.
Odpowiadaj TYLKO po polsku. Podawaj fakty ze źródeł. Format markdown.
Struktura:
## Aktualna pozycja
## Historia kariery  
## Wykształcenie i kompetencje
## Profil LinkedIn (URL jeśli znaleziony)`;

      // QUERY 2: Public statements, media, interviews
      const mediaQuery = `"${fullName}" wypowiedź wywiad artykuł cytat konferencja:
- cytaty i wypowiedzi prasowe
- wywiady w mediach (TV, radio, prasa, online)
- publikacje i artykuły autorskie
- wystąpienia na konferencjach, webinary, podcasty
- komentarze eksperckie`;

      const mediaSystemPrompt = `Jesteś dziennikarzem śledczym. Znajdź WSZYSTKIE publiczne wypowiedzi i występy medialne tej osoby.
Odpowiadaj TYLKO po polsku. Cytuj dosłownie gdzie możliwe. Format markdown.
Struktura:
## Wypowiedzi prasowe (z datami i źródłami)
## Wywiady medialne
## Publikacje autorskie
## Wystąpienia konferencyjne`;

      // QUERY 3: Other organizations, controversies, warnings
      const orgQuery = `"${fullName}" zarząd "rada nadzorcza" fundacja stowarzyszenie skandal kontrowersja problem:
- członkostwo w radach nadzorczych innych firm
- funkcje w organizacjach, stowarzyszeniach, fundacjach
- działalność społeczna i charytatywna
- kontrowersje, skandale, problemy prawne
- konflikty interesów, afery`;

      const orgSystemPrompt = `Jesteś analitykiem due diligence. Znajdź WSZYSTKIE powiązania tej osoby z innymi organizacjami oraz WSZYSTKIE potencjalne czerwone flagi.
Odpowiadaj TYLKO po polsku. Bądź szczegółowy i obiektywny. Format markdown.
Struktura:
## Inne funkcje w zarządach/radach nadzorczych
## Organizacje i stowarzyszenia
## Działalność społeczna
## ⚠️ OSTRZEŻENIA (kontrowersje, problemy, skandale)`;

      // QUERY 4: Family connections and personal life
      const familyQuery = `"${fullName}" żona mąż dzieci rodzina syn córka rodzice brat siostra partner:
- małżonek/małżonka (imię, wiek, czym się zajmuje)
- dzieci (imiona, wiek, zajęcie/szkoła)
- rodzice (imiona, czy żyją, czym się zajmowali)
- rodzeństwo (imiona, relacja, zajęcie)
- inne ważne powiązania rodzinne`;

      const familySystemPrompt = `Jesteś ekspertem w wywiadzie środowiskowym. Znajdź informacje o rodzinie i powiązaniach osobistych tej osoby.
Odpowiadaj TYLKO po polsku. Podawaj fakty ze źródeł publicznych. Format markdown.

WAŻNE: Dla KAŻDEGO członka rodziny podaj:
- Imię (jeśli znane publicznie)
- Pokrewieństwo (żona, mąż, syn, córka, ojciec, matka, brat, siostra, partner/partnerka)
- Wiek lub przedział wiekowy (jeśli znany)
- Zawód/zajęcie (np. lekarz, student, emeryt, właściciel firmy X)

Struktura odpowiedzi:
## Małżonek/Partner
## Dzieci  
## Rodzice
## Rodzeństwo
## Inne powiązania rodzinne

Jeśli brak publicznie dostępnych informacji - napisz "📭 Brak publicznie dostępnych danych".
NIE WYMYŚLAJ danych rodzinnych!`;

      // Execute all four queries in parallel
      const [profileResult, mediaResult, orgResult, familyResult] = await Promise.all([
        queryPerplexity(PERPLEXITY_API_KEY, profileQuery, profileSystemPrompt),
        queryPerplexity(PERPLEXITY_API_KEY, mediaQuery, mediaSystemPrompt, 'year'),
        queryPerplexity(PERPLEXITY_API_KEY, orgQuery, orgSystemPrompt),
        queryPerplexity(PERPLEXITY_API_KEY, familyQuery, familySystemPrompt)
      ]);

      perplexityResults = {
        profile: profileResult,
        media: mediaResult,
        organizations: orgResult,
        family: familyResult
      };

      // Collect all citations
      if (profileResult?.citations) allPerplexityCitations.push(...profileResult.citations);
      if (mediaResult?.citations) allPerplexityCitations.push(...mediaResult.citations);
      if (orgResult?.citations) allPerplexityCitations.push(...orgResult.citations);
      if (familyResult?.citations) allPerplexityCitations.push(...familyResult.citations);
      
      // Deduplicate citations
      allPerplexityCitations = [...new Set(allPerplexityCitations)];
      
      console.log(`[enrich-person-data] Perplexity completed: profile=${!!profileResult}, media=${!!mediaResult}, org=${!!orgResult}, family=${!!familyResult}`);
      console.log(`[enrich-person-data] Total Perplexity citations: ${allPerplexityCitations.length}`);
    } else {
      console.warn('[enrich-person-data] PERPLEXITY_API_KEY not configured, skipping internet search');
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: FIRECRAWL SEARCH (if API key available)
    // ═══════════════════════════════════════════════════════════════
    
    let firecrawlResults: FirecrawlSearchResult[] = [];
    
    if (FIRECRAWL_API_KEY) {
      console.log('[enrich-person-data] Starting Firecrawl search...');
      
      const primaryQuery = `"${fullName}"${companyContext} LinkedIn stanowisko zawodowe kariera`;
      
      try {
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

        if (firecrawlResponse.ok) {
          const firecrawlData = await firecrawlResponse.json();
          firecrawlResults = firecrawlData.data || [];
          console.log(`[enrich-person-data] Firecrawl returned ${firecrawlResults.length} results`);
        } else {
          console.error('[enrich-person-data] Firecrawl error:', firecrawlResponse.status);
        }
      } catch (error) {
        console.error('[enrich-person-data] Firecrawl error:', error);
      }
    } else {
      console.warn('[enrich-person-data] FIRECRAWL_API_KEY not configured, skipping Firecrawl search');
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 3: AI SYNTHESIS - Combine all data sources
    // ═══════════════════════════════════════════════════════════════
    
    console.log('[enrich-person-data] Starting AI synthesis...');

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
            content: `Jesteś ekspertem w analizie profili zawodowych i due diligence osób.

🎯 TWOJE ZADANIE:
Przeanalizuj WSZYSTKIE dostarczone źródła i stwórz KOMPLEKSOWY profil osoby.

📋 SEKCJE DO WYPEŁNIENIA:

1. **PROFIL ZAWODOWY**
   - Aktualne stanowisko i firma
   - Historia kariery (poprzednie stanowiska)
   - Wykształcenie, certyfikaty
   - Specjalizacja i kompetencje

2. **WYPOWIEDZI PUBLICZNE I MEDIA**
   - Cytaty prasowe (z datami i źródłami)
   - Wywiady medialne
   - Publikacje autorskie
   - Wystąpienia konferencyjne

3. **INNE ORGANIZACJE**
   - Rady nadzorcze innych firm
   - Członkostwo w stowarzyszeniach
   - Fundacje, działalność społeczna
   - Powiązania biznesowe

4. **RODZINA I POWIĄZANIA OSOBISTE**
   - Małżonek/partner (imię, wiek, zajęcie)
   - Dzieci (imiona, wiek, zajęcia)
   - Rodzice (imiona, status, czym się zajmowali)
   - Rodzeństwo (imiona, relacja, zajęcia)
   - Inne ważne powiązania rodzinne
   (Jeśli brak publicznych danych - napisz "📭 Brak publicznie dostępnych informacji")

5. **⚠️ OSTRZEŻENIA I CZERWONE FLAGI**
   - Kontrowersje, skandale
   - Problemy prawne
   - Konflikty interesów
   - Negatywne informacje prasowe
   (Jeśli brak - napisz "Nie znaleziono ostrzeżeń")

6. **TAGI** (5-10 słów kluczowych charakteryzujących osobę)
   Format: #tag1 #tag2 #tag3

ZASADY KRYTYCZNE:
- ✅ = Zweryfikowany fakt ze źródła
- 📎 = Link do źródła
- 📭 = Brak informacji
- ⚠️ = Ostrzeżenie/problem
- Każda informacja MUSI mieć źródło
- NIE WYMYŚLAJ informacji!
- Jeśli dane są o INNEJ osobie - zaznacz to`
          },
          {
            role: 'user',
            content: `🔍 KOMPLEKSOWA ANALIZA OSOBY:

👤 DANE PODSTAWOWE:
- Imię i nazwisko: ${fullName}
${company ? `- Firma: ${company}` : '- Firma: Nie podano'}
${email ? `- Email: ${email}` : ''}
${linkedin_url ? `- LinkedIn: ${linkedin_url}` : ''}

═══════════════════════════════════════════════════════════════
📡 ŹRÓDŁO 1: PERPLEXITY - PROFIL ZAWODOWY
═══════════════════════════════════════════════════════════════
${perplexityResults.profile?.content || '📭 Brak danych z Perplexity (API key nie skonfigurowany)'}

Cytaty: ${perplexityResults.profile?.citations?.join(', ') || 'brak'}

═══════════════════════════════════════════════════════════════
📡 ŹRÓDŁO 2: PERPLEXITY - WYPOWIEDZI I MEDIA
═══════════════════════════════════════════════════════════════
${perplexityResults.media?.content || '📭 Brak danych'}

Cytaty: ${perplexityResults.media?.citations?.join(', ') || 'brak'}

═══════════════════════════════════════════════════════════════
📡 ŹRÓDŁO 3: PERPLEXITY - ORGANIZACJE I OSTRZEŻENIA
═══════════════════════════════════════════════════════════════
${perplexityResults.organizations?.content || '📭 Brak danych'}

Cytaty: ${perplexityResults.organizations?.citations?.join(', ') || 'brak'}

═══════════════════════════════════════════════════════════════
👨‍👩‍👧‍👦 ŹRÓDŁO 4: PERPLEXITY - RODZINA I POWIĄZANIA OSOBISTE
═══════════════════════════════════════════════════════════════
${perplexityResults.family?.content || '📭 Brak danych'}

Cytaty: ${perplexityResults.family?.citations?.join(', ') || 'brak'}

═══════════════════════════════════════════════════════════════
🔍 ŹRÓDŁO 5: FIRECRAWL - WYNIKI WYSZUKIWANIA (${firecrawlResults.length} stron)
═══════════════════════════════════════════════════════════════
${firecrawlResults.length === 0 ? '📭 Brak wyników wyszukiwania.' : firecrawlResults.map((r, i) => `
┌─────────────────────────────────────────────────────────────
│ STRONA ${i + 1}: ${r.url}
│ Tytuł: ${r.title || 'Brak tytułu'}
├─────────────────────────────────────────────────────────────
${r.markdown?.substring(0, 2000) || r.description || 'Brak treści'}
└─────────────────────────────────────────────────────────────`).join('\n')}

═══════════════════════════════════════════════════════════════

🎯 ZADANIE:
1. Połącz informacje ze WSZYSTKICH źródeł
2. Stwórz spójny, szczegółowy profil
3. Wyodrębnij wypowiedzi publiczne i cytaty
4. Wymień WSZYSTKIE organizacje gdzie osoba działa
5. Wyodrębnij informacje o RODZINIE (imiona, pokrewieństwo, wiek, zajęcie)
6. Zidentyfikuj WSZYSTKIE ostrzeżenia i czerwone flagi
7. Wygeneruj 5-10 tagów charakteryzujących osobę`
          }
        ],
        max_tokens: 4000,
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

    // ═══════════════════════════════════════════════════════════════
    // STEP 4: EXTRACT STRUCTURED DATA FROM AI RESPONSE
    // ═══════════════════════════════════════════════════════════════
    
    // Extract tags from the response (looking for #tag patterns)
    const tagMatches = profileSummary.match(/#[\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+/gi) || [];
    const tags = tagMatches.map((t: string) => t.replace('#', '').toLowerCase());
    
    // Extract public statements section
    let publicStatements: string | null = null;
    const statementsMatch = profileSummary.match(/(?:WYPOWIEDZI|MEDIA|CYTATY)[^]*?(?=\n##|\n═|$)/i);
    if (statementsMatch) {
      publicStatements = statementsMatch[0].trim();
    }
    
    // Extract other organizations section
    let otherOrganizations: string | null = null;
    const orgMatch = profileSummary.match(/(?:INNE ORGANIZACJE|RADY NADZORCZE|STOWARZYSZENIA)[^]*?(?=\n##|\n═|$)/i);
    if (orgMatch) {
      otherOrganizations = orgMatch[0].trim();
    }
    
    // Extract warnings section
    let warnings: string | null = null;
    const warningsMatch = profileSummary.match(/(?:OSTRZEŻENIA|CZERWONE FLAGI|KONTROWERSJE|SKANDALE)[^]*?(?=\n##|\n═|$)/i);
    if (warningsMatch && !warningsMatch[0].includes('Nie znaleziono ostrzeżeń')) {
      warnings = warningsMatch[0].trim();
    }

    // Combine all sources
    const allSources = [
      ...firecrawlResults.map(r => r.url),
      ...allPerplexityCitations
    ].filter((url, index, self) => self.indexOf(url) === index); // Deduplicate

    // Determine confidence
    let confidence: 'verified' | 'partial' | 'not_found' = 'not_found';
    const hasPerplexityData = perplexityResults.profile?.content || perplexityResults.media?.content;
    const hasFirecrawlData = firecrawlResults.length > 0;
    const hasLinkedIn = allSources.some(url => url.includes('linkedin.com'));
    const hasVerifiedInfo = profileSummary.includes('✅');
    
    if (hasLinkedIn || (hasVerifiedInfo && (hasPerplexityData || firecrawlResults.length >= 3))) {
      confidence = 'verified';
    } else if (hasVerifiedInfo || hasPerplexityData || hasFirecrawlData) {
      confidence = 'partial';
    }

    // Build data notes
    const dataNotes: string[] = [];
    if (PERPLEXITY_API_KEY) {
      dataNotes.push(`Perplexity: profil=${!!perplexityResults.profile}, media=${!!perplexityResults.media}, organizacje=${!!perplexityResults.organizations}, rodzina=${!!perplexityResults.family}`);
      dataNotes.push(`Źródła Perplexity: ${allPerplexityCitations.length}`);
    } else {
      dataNotes.push('Perplexity: nie skonfigurowany');
    }
    if (FIRECRAWL_API_KEY) {
      dataNotes.push(`Firecrawl: ${firecrawlResults.length} stron`);
    } else {
      dataNotes.push('Firecrawl: nie skonfigurowany');
    }
    if (hasLinkedIn) dataNotes.push('✅ Znaleziono profil LinkedIn');
    if (warnings) dataNotes.push('⚠️ Znaleziono ostrzeżenia');
    if (tags.length > 0) dataNotes.push(`Tagi: ${tags.length}`);

    const enrichedData: EnrichedPersonData = {
      profile_summary: profileSummary,
      sources: allSources,
      search_performed: true,
      confidence,
      data_notes: dataNotes,
      perplexity_used: !!PERPLEXITY_API_KEY,
      public_statements: publicStatements,
      other_organizations: otherOrganizations,
      warnings,
      tags
    };

    console.log('[enrich-person-data] Successfully enriched person data');
    console.log(`[enrich-person-data] Confidence: ${confidence}, Tags: ${tags.length}, Sources: ${allSources.length}`);

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
