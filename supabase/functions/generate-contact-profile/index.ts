import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse, verifyResourceAccess, accessDeniedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Extract company domain from email (excluding public domains)
function extractDomainFromEmail(email: string | null): string | null {
  if (!email) return null;
  const parts = email.split('@');
  if (parts.length !== 2) return null;
  const domain = parts[1].toLowerCase();
  const publicDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'wp.pl', 'onet.pl', 'o2.pl', 'interia.pl', 'hotmail.com', 'icloud.com', 'live.com', 'me.com', 'protonmail.com', 'tutanota.com'];
  if (publicDomains.includes(domain)) return null;
  return domain;
}

// Scrape a website using Firecrawl
async function scrapeWebsite(url: string, apiKey: string): Promise<string | null> {
  try {
    console.log("Scraping website:", url);
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    if (!response.ok) {
      console.log("Firecrawl scrape failed:", response.status);
      return null;
    }

    const data = await response.json();
    const markdown = data.data?.markdown || data.markdown;
    console.log("Scraped content length:", markdown?.length || 0);
    return markdown || null;
  } catch (error) {
    console.error("Error scraping website:", error);
    return null;
  }
}

// Search for person in company context using Firecrawl
async function searchPerson(query: string, apiKey: string): Promise<string | null> {
  try {
    console.log("Searching for:", query);
    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit: 5,
        lang: 'pl',
        country: 'PL',
      }),
    });

    if (!response.ok) {
      console.log("Firecrawl search failed:", response.status);
      return null;
    }

    const data = await response.json();
    if (!data.data || data.data.length === 0) {
      return null;
    }

    // Combine search results into text
    const results = data.data.map((r: any) => 
      `**${r.title || 'Brak tytułu'}** (${r.url || ''})\n${r.description || r.markdown?.substring(0, 500) || ''}`
    ).join('\n\n');

    console.log("Search results found:", data.data.length);
    return results;
  } catch (error) {
    console.error("Error searching:", error);
    return null;
  }
}

// Query Perplexity for comprehensive search
interface PerplexityResult {
  content: string;
  citations: string[];
}

async function queryPerplexity(
  query: string, 
  systemPrompt: string, 
  apiKey: string, 
  recencyFilter?: string
): Promise<PerplexityResult> {
  try {
    console.log("Perplexity query:", query.substring(0, 100));
    const body: any = {
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
      console.log("Perplexity failed:", response.status);
      return { content: '', citations: [] };
    }

    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      citations: data.citations || []
    };
  } catch (error) {
    console.error("Perplexity error:", error);
    return { content: '', citations: [] };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contact_id } = await req.json();

    if (!contact_id) {
      return new Response(JSON.stringify({ error: "contact_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ============= AUTHORIZATION CHECK =============
    const authResult = await verifyAuth(req, supabase);
    if (isAuthError(authResult)) {
      return unauthorizedResponse(authResult, corsHeaders);
    }
    const { tenantId } = authResult;
    // ============= END AUTHORIZATION CHECK =============

    // ============= RESOURCE ACCESS CHECK =============
    const hasAccess = await verifyResourceAccess(supabase, 'contacts', contact_id, tenantId);
    if (!hasAccess) {
      return accessDeniedResponse(corsHeaders, 'Access denied to this contact');
    }
    // ============= END RESOURCE ACCESS CHECK =============

    // Fetch contact with company data
    const { data: contact, error: contactError } = await supabase.from("contacts").select("*, companies(*)").eq("id", contact_id).single();

    if (contactError || !contact) {
      return new Response(JSON.stringify({ error: "Contact not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch additional data
    const [consultationsResult, needsResult, offersResult] = await Promise.all([
      supabase.from("consultations").select("scheduled_at, notes, ai_summary, agenda, status").eq("contact_id", contact_id).order("scheduled_at", { ascending: false }).limit(3),
      supabase.from("needs").select("title, description, priority, status").eq("contact_id", contact_id).eq("status", "active"),
      supabase.from("offers").select("title, description, status").eq("contact_id", contact_id).eq("status", "active"),
    ]);

    const consultations = consultationsResult.data || [];
    const needs = needsResult.data || [];
    const offers = offersResult.data || [];
    let company = contact.companies;

    console.log("Generating AI profile for contact:", contact.full_name);

    // ============= STEP 1: Extract company domain from email =============
    const emailDomain = extractDomainFromEmail(contact.email);
    let companyWebsite = emailDomain ? `https://${emailDomain}` : company?.website;
    const companyNameFromData = contact.company || company?.name || emailDomain?.replace(/\.(pl|com|eu|net|org)$/i, '') || null;

    console.log("Company website to scrape:", companyWebsite);
    console.log("Company name from data:", companyNameFromData);

    // ============= STEP 1.5: Check/Create company record =============
    let companyId = contact.company_id;
    let companyCreated = false;
    let companyUpdated = false;

    if (!companyId && (companyNameFromData || emailDomain)) {
      console.log("Contact has no company_id, checking if company exists...");
      
      // Search for existing company by name or website domain
      let searchConditions = [];
      if (companyNameFromData) {
        searchConditions.push(`name.ilike.%${companyNameFromData}%`);
      }
      if (emailDomain) {
        searchConditions.push(`website.ilike.%${emailDomain}%`);
      }

      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id, name, website, industry, description, ai_analysis')
        .eq('tenant_id', tenantId)
        .or(searchConditions.join(','))
        .maybeSingle();

      if (existingCompany) {
        console.log("Found existing company:", existingCompany.name);
        companyId = existingCompany.id;
        company = existingCompany;
        if (!companyWebsite && existingCompany.website) {
          companyWebsite = existingCompany.website;
        }
      } else {
        console.log("Company not found, will create after AI analysis...");
      }
    }

    const companyName = companyNameFromData || 'Nieznana firma';

    // ============= STEP 2: Scrape company website (PRIORITY 1) =============
    let companyWebsiteContent = "";
    let companySubpagesContent = "";
    
    if (FIRECRAWL_API_KEY && companyWebsite) {
      // Scrape main page
      const mainPageContent = await scrapeWebsite(companyWebsite, FIRECRAWL_API_KEY);
      if (mainPageContent) {
        companyWebsiteContent = `### Strona główna (${companyWebsite})\n${mainPageContent.substring(0, 4000)}`;
      }

      // Try subpages for more context - especially for registry data and offer details
      const subpages = ['/o-nas', '/about', '/oferta', '/uslugi', '/services', '/kontakt', '/contact', '/dane-firmy', '/regulamin', '/polityka-prywatnosci'];
      for (const subpage of subpages.slice(0, 5)) { // Scrape up to 5 subpages for better data
        const subpageUrl = companyWebsite.replace(/\/$/, '') + subpage;
        const subpageContent = await scrapeWebsite(subpageUrl, FIRECRAWL_API_KEY);
        if (subpageContent && subpageContent.length > 200) {
          companySubpagesContent += `\n\n### Podstrona ${subpage} (${subpageUrl})\n${subpageContent.substring(0, 2500)}`;
        }
      }
    }

    const hasWebsiteData = companyWebsiteContent.length > 100;
    console.log("Has website data:", hasWebsiteData, "Content length:", companyWebsiteContent.length);

    // ============= STEP 3: Search for person in company context (PRIORITY 2) =============
    // Use domain from email for better search if company name looks truncated
    const searchCompanyName = companyName.length < 10 && emailDomain 
      ? emailDomain.replace(/\.(pl|com|eu|net|org)$/i, '').replace(/-/g, ' ')
      : companyName;
    
    let personSearchResults = "";
    if (FIRECRAWL_API_KEY) {
      const searchQuery = `"${contact.full_name}" "${searchCompanyName}" stanowisko`;
      const searchResults = await searchPerson(searchQuery, FIRECRAWL_API_KEY);
      if (searchResults) {
        personSearchResults = searchResults;
      }
    }

    // ============= STEP 3b: Search for personal info (hobbies, media mentions) =============
    let personalSearchResults = "";
    if (FIRECRAWL_API_KEY) {
      const personalQuery = `"${contact.full_name}" (wywiad OR hobby OR sport OR rodzina OR "media" OR "prasa")`;
      const personalResults = await searchPerson(personalQuery, FIRECRAWL_API_KEY);
      if (personalResults) {
        personalSearchResults = personalResults;
        console.log("Personal search results found, length:", personalResults.length);
      }
    }

    // ============= STEP 3c: PERPLEXITY SEARCH FOR PERSON =============
    let perplexityProfile = '';
    let perplexityMedia = '';
    let perplexityOrgs = '';
    let perplexityCitations: string[] = [];

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (PERPLEXITY_API_KEY) {
      console.log('Running Perplexity search for person:', contact.full_name, searchCompanyName);
      
      // Query 1: Professional profile and career
      const profileQuery = `"${contact.full_name}" ${searchCompanyName} Polska:
- aktualne stanowisko i rola w firmie
- historia kariery, poprzednie firmy i stanowiska
- pełna nazwa prawna firmy (np. Atlas Ward Polska Sp. z o.o.)
- osiągnięcia zawodowe, nagrody biznesowe
- wykształcenie, uczelnia, kierunek`;
      
      // Query 2: Media, public statements, hobbies
      const mediaQuery = `"${contact.full_name}" wywiad artykuł cytat pasja hobby:
- wywiady w prasie i mediach (Forbes, Puls Biznesu, itp.)
- cytaty i wypowiedzi publiczne
- wystąpienia na konferencjach i eventach
- podcasty, webinary
- hobby, pasje, sport (motorsport, żeglarstwo, golf, itp.)
- życie prywatne, rodzina (jeśli publiczne)`;
      
      // Query 3: Other organizations, awards, controversies
      const orgQuery = `"${contact.full_name}" rada nadzorcza fundacja stowarzyszenie nagroda:
- udział w radach nadzorczych innych firm
- członkostwo w organizacjach biznesowych (BCC, Konfederacja Lewiatan, itp.)
- fundacje i działalność społeczna/charytatywna
- nagrody: EY Przedsiębiorca Roku, Forbes, rankingi branżowe
- kontrowersje, skandale, problemy prawne
- sponsoring, patronaty`;

      const [profileResult, mediaResult, orgResult] = await Promise.all([
        queryPerplexity(
          profileQuery, 
          'Jesteś ekspertem ds. kariery i profili zawodowych biznesmenów w Polsce. Szukaj faktów o karierze, stanowiskach, wykształceniu.', 
          PERPLEXITY_API_KEY
        ),
        queryPerplexity(
          mediaQuery, 
          'Jesteś dziennikarzem szukającym wzmianek medialnych, wywiadów, hobby i życia prywatnego polskich biznesmenów. Cytuj konkretne źródła.', 
          PERPLEXITY_API_KEY,
          'year'
        ),
        queryPerplexity(
          orgQuery, 
          'Jesteś analitykiem biznesowym szukającym powiązań osób z organizacjami, nagrodami, kontrowersjami. Bądź rzetelny i podawaj źródła.', 
          PERPLEXITY_API_KEY
        )
      ]);

      perplexityProfile = profileResult.content;
      perplexityMedia = mediaResult.content;
      perplexityOrgs = orgResult.content;
      perplexityCitations = [...new Set([
        ...profileResult.citations, 
        ...mediaResult.citations, 
        ...orgResult.citations
      ])];
      
      console.log('Perplexity results:', {
        profile: perplexityProfile.length,
        media: perplexityMedia.length,
        orgs: perplexityOrgs.length,
        citations: perplexityCitations.length
      });
    } else {
      console.log('PERPLEXITY_API_KEY not configured, skipping Perplexity search');
    }

    // ============= STEP 4: Build prompt with data hierarchy =============
    const systemPrompt = `Jesteś ekspertem od analizy kontaktów biznesowych i wydobywania danych z polskich stron firmowych. Wygeneruj profesjonalny profil na podstawie HIERARCHII ŹRÓDEŁ.

## HIERARCHIA ŹRÓDEŁ (PRZESTRZEGAJ KOLEJNOŚCI!):

### PRIORYTET 1 - FAKTY ZE STRONY WWW FIRMY
Jeśli dostępne są dane ze strony firmy, użyj ich PRZEDE WSZYSTKIM do opisania:
- Czym zajmuje się firma - SZCZEGÓŁOWO, nie ogólnikowo!
- PEŁNĄ ofertę produktów/usług - KAŻDY produkt/usługę osobno
- W jakiej branży działa
- Specjalizacje i wyróżniki konkurencyjne
- Dla kogo są te usługi (klienci docelowi)

### 🔴 KRYTYCZNE - DANE REJESTROWE (SZUKAJ AKTYWNIE!)
Przeszukaj CAŁĄ stronę www pod kątem:
- **NIP** - szukaj w: stopka strony, /kontakt, /o-nas, regulamin, polityka prywatności (format: XXX-XXX-XX-XX lub 10 cyfr)
- **REGON** - często obok NIP (9 lub 14 cyfr)
- **KRS** - dla spółek kapitałowych (10 cyfr, format 0000XXXXXX)
- **Adres siedziby** - ulica, numer, miasto, kod pocztowy
- **Forma prawna** - sp. z o.o., S.A., JDG, spółka komandytowa itp.

### 👥 ZARZĄD I WŁAŚCICIELE
Szukaj informacji o:
- Właścicielach firmy
- Członkach zarządu (Prezes, Wiceprezes, Członek Zarządu)
- Założycielach
- Dyrektorach (Dyrektor Generalny, CFO, CTO itp.)

### PRIORYTET 2 - WYNIKI WYSZUKIWANIA O OSOBIE
Na podstawie wyników wyszukiwania uzupełnij dane o stanowisku i karierze.

### PRIORYTET 3 - ŻYCIE OSOBISTE I MEDIA
Na podstawie wyników wyszukiwania uzupełnij informacje o rodzinie, hobby, sporcie i wzmiankach w mediach.

### PRIORYTET 4 - DANE Z SYSTEMU
Notatki, potrzeby, oferty, konsultacje z CRM.

## OZNACZENIA (OBOWIĄZKOWE!):
- ✅ POTWIERDZONE - fakt ze strony www lub wyszukiwania (PODAJ ŹRÓDŁO!)
- 💡 DEDUKCJA - logiczny wniosek (tylko gdy brak faktów)
- 📭 BRAK DANYCH - do uzupełnienia

## KRYTYCZNE ZASADY:
1. Jeśli masz dane ze strony www firmy → używaj ICH, nie dedukcji!
2. Zawsze podawaj źródło: 📎 Źródło: [URL]
3. Nigdy nie wymyślaj danych o firmie jeśli masz stronę www
4. Najpierw FAKTY, potem wnioski
5. **WYDOBYWAJ PEŁNĄ OFERTĘ** - nie pisz ogólnikowo "usługi transportowe", tylko konkretnie: "transport krajowy, spedycja międzynarodowa, magazynowanie, obsługa celna"

## STRUKTURA ODPOWIEDZI:

## 👤 Kim jest ta osoba
[Krótkie wprowadzenie z potwierdzonym stanowiskiem i firmą]

## 🏢 O firmie ${companyName}
${hasWebsiteData ? `
✅ **Branża:** [wyodrębnij ze strony www]
✅ **Działalność:** [co firma robi - SZCZEGÓŁOWO ze strony, minimum 2-3 zdania]
✅ **Pełna oferta:** [WSZYSTKIE produkty/usługi ze strony - wypunktuj każdy osobno!]
✅ **Specjalizacje:** [wyróżniki, unikalne kompetencje]
✅ **Klienci docelowi:** [dla kogo są te usługi]

### 📍 Dane rejestrowe (jeśli znalezione na stronie)
✅ **NIP:** [10 cyfr - szukaj w stopce, /kontakt, /o-nas, regulaminie]
✅ **REGON:** [9 lub 14 cyfr]
✅ **KRS:** [10 cyfr - dla spółek]
✅ **Adres:** [ulica, numer, kod pocztowy, miasto]
✅ **Forma prawna:** [sp. z o.o., S.A., JDG itp.]

### 👥 Zarząd i właściciele (jeśli znalezione)
[Lista osób z funkcjami i źródłami]

📎 Źródło: ${companyWebsite}
` : `
📭 Brak danych - strona www niedostępna
💡 Na podstawie nazwy "${companyName}" można przypuszczać...
`}

## 💼 Rola w firmie
[Stanowisko osoby, odpowiedzialności]

## 🎯 Kompetencje
[Na podstawie stanowiska, branży i danych]

## 🏠 Życie prywatne
[Informacje o życiu osobistym - SZCZEGÓŁOWO ze źródeł Perplexity!]
- 👨‍👩‍👧‍👦 **Rodzina:** [status rodzinny, dzieci jeśli znane ze źródeł]
- 🎯 **Hobby i zainteresowania:** [pozazawodowe aktywności, pasje - SZCZEGÓŁOWO!]
- ⚽ **Sport:** [ulubione dyscypliny, aktywność fizyczna, np. motorsport, rajdy]
- 🏆 **Pasje i osiągnięcia pozazawodowe:** [zespoły sportowe, sponsoring, itp.]

## 📰 Wzmianki w mediach
[Artykuły prasowe, wywiady, publikacje, wystąpienia publiczne]
- WYMIEŃ KONKRETNE wywiady, artykuły z tytułami i źródłami!
- Cytaty i wypowiedzi prasowe
- Wystąpienia na konferencjach, podcasty
- Jeśli brak - napisz "📭 Brak znalezionych wzmianek w mediach"

## 🏅 Nagrody i wyróżnienia
[Nagrody biznesowe, rankingi, wyróżnienia - z datami i źródłami]
- EY Przedsiębiorca Roku (finaliści/laureaci)
- Rankingi Forbes, Puls Biznesu, itp.
- Nagrody branżowe

## 🔗 Inne organizacje
[Rady nadzorcze, fundacje, stowarzyszenia, kluby biznesowe - z nazwami i rolami]
- Rady nadzorcze innych firm
- Organizacje branżowe (BCC, Konfederacja Lewiatan, itp.)
- Fundacje i działalność społeczna
- Kluby biznesowe, sponsoring

## ⚠️ Ostrzeżenia
[Kontrowersje, skandale, problemy prawne - jeśli znalezione w mediach]
- Jeśli brak - napisz "✅ Brak znalezionych ostrzeżeń"

## 🏷️ Tagi
[Lista 5-10 słów kluczowych charakteryzujących osobę, format: #tag1 #tag2]
Przykład: #budownictwo #ceo #motorsport #innowacje #bim #przedsiębiorca

## 🤝 Wartość dla sieci
[Jak osoba może pomóc innym kontaktom - SZCZEGÓŁOWO na podstawie oferty firmy]

## 📋 Potrzeby biznesowe
[Na podstawie danych z systemu lub wnioski]

## 📝 Pytania do następnego spotkania
1. [Konkretne pytanie o firmę/współpracę]
2. [Pytanie o potrzeby]
3. [Pytanie o sieć kontaktów]
4. [Pytanie o zainteresowania/hobby - do budowania relacji]

Maksymalnie 1200 słów. ZAWSZE oznaczaj źródła.`;

    const userPrompt = `# DANE KONTAKTU
**Imię i nazwisko:** ${contact.full_name}
**Stanowisko:** ${contact.position || 'brak'}
**Firma:** ${companyName}
**Email:** ${contact.email || 'brak'}
**Notatki:** ${contact.notes || 'Brak'}

# DANE Z SYSTEMU CRM
**Potrzeby:** ${needs.map(n => `${n.title}: ${n.description || ''}`).join('; ') || 'Brak'}
**Oferty:** ${offers.map(o => `${o.title}: ${o.description || ''}`).join('; ') || 'Brak'}
**Konsultacje:** ${consultations.length} (ostatnia: ${consultations[0]?.scheduled_at || 'brak'})

${hasWebsiteData ? `
# PRIORYTET 1: DANE ZE STRONY WWW FIRMY
${companyWebsiteContent}
${companySubpagesContent}
` : '# BRAK DANYCH ZE STRONY WWW FIRMY\n(Strona niedostępna lub brak klucza Firecrawl)'}

${personSearchResults ? `
# PRIORYTET 2: WYNIKI WYSZUKIWANIA O OSOBIE (KARIERA)
${personSearchResults}
` : '# BRAK WYNIKÓW WYSZUKIWANIA O OSOBIE'}

${personalSearchResults ? `
# PRIORYTET 3: WYNIKI WYSZUKIWANIA - ŻYCIE OSOBISTE I MEDIA
Wykorzystaj poniższe informacje do sekcji "Życie prywatne" i "Wzmianki w mediach":
${personalSearchResults}
` : '# BRAK WYNIKÓW WYSZUKIWANIA O ŻYCIU OSOBISTYM I MEDIACH'}

${perplexityProfile ? `
# PERPLEXITY: PROFIL ZAWODOWY I KARIERA
${perplexityProfile}
` : ''}

${perplexityMedia ? `
# PERPLEXITY: MEDIA, WYWIADY, HOBBY, ŻYCIE PRYWATNE
WYKORZYSTAJ TE INFORMACJE DO SEKCJI: Życie prywatne, Wzmianki w mediach, Hobby!
${perplexityMedia}
` : ''}

${perplexityOrgs ? `
# PERPLEXITY: INNE ORGANIZACJE, NAGRODY, OSTRZEŻENIA
WYKORZYSTAJ DO SEKCJI: Nagrody i wyróżnienia, Inne organizacje, Ostrzeżenia!
${perplexityOrgs}
` : ''}

${perplexityCitations.length > 0 ? `
# ŹRÓDŁA PERPLEXITY (CYTUJ W PROFILU!)
${perplexityCitations.slice(0, 15).join('\n')}
` : ''}

---
WYGENERUJ PROFIL ZGODNIE Z HIERARCHIĄ ŹRÓDEŁ. FAKTY ZE STRONY WWW MAJĄ PIERWSZEŃSTWO!
PAMIĘTAJ O WSZYSTKICH SEKCJACH: Życie prywatne (SZCZEGÓŁOWE hobby!), Wzmianki w mediach, Nagrody, Inne organizacje, Ostrzeżenia, Tagi!
PEŁNA NAZWA FIRMY - użyj nazwy znalezionej w Perplexity jeśli jest dłuższa/pełniejsza!`;

    // ============= STEP 5: Call AI with tool calling for structured company data =============
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ 
        model: "google/gemini-3-flash-preview", 
        messages: [
          { role: "system", content: systemPrompt }, 
          { role: "user", content: userPrompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_contact_and_company_profile",
            description: "Zapisz profil osoby i dane firmy do systemu",
            parameters: {
              type: "object",
              properties: {
                person_profile: {
                  type: "string",
                  description: "Pełny profil osoby w formacie markdown zgodnie z szablonem"
                },
                company_data: {
                  type: "object",
                  description: "Strukturyzowane dane firmy do zapisania w bazie - UZUPEŁNIJ WSZYSTKIE ZNALEZIONE POLA! Szukaj NIP, REGON, KRS, adresu w stopce strony, /kontakt, /o-nas, regulaminie.",
                  properties: {
                    name: { type: "string", description: "Pełna nazwa prawna firmy (np. Adam Pawłowski EUPATENT lub Sistrans Sp. z o.o.)" },
                    industry: { type: "string", description: "Branża firmy (np. Własność intelektualna, Patenty, Transport)" },
                    description: { type: "string", description: "Opis firmy (max 500 znaków) - co robi i dla kogo" },
                    what_company_does: { type: "string", description: "SZCZEGÓŁOWA działalność firmy - minimum 3 zdania! Co konkretnie robi firma?" },
                    what_company_offers: { type: "string", description: "PEŁNA oferta produktów/usług - wymień WSZYSTKIE usługi ze strony, każdą osobno!" },
                    what_company_seeks: { type: "string", description: "Czego firma szuka: klienci, partnerzy, pracownicy" },
                    specializations: { type: "array", items: { type: "string" }, description: "Lista specjalizacji i wyróżników konkurencyjnych" },
                    target_clients: { type: "string", description: "Klienci docelowi firmy - dla kogo są te usługi?" },
                    services: { type: "array", items: { type: "string" }, description: "Lista usług - KAŻDA usługa osobno jako element tablicy!" },
                    collaboration_areas: { type: "array", items: { type: "string" }, description: "Obszary możliwej współpracy biznesowej" },
                    management: { 
                      type: "array", 
                      items: { 
                        type: "object", 
                        properties: {
                          name: { type: "string", description: "Imię i nazwisko" },
                          position: { type: "string", description: "Stanowisko (Prezes, Właściciel, Dyrektor)" },
                          source: { type: "string", description: "Źródło informacji (URL)" }
                        }
                      }, 
                      description: "Zarząd, właściciele, kluczowe osoby w firmie" 
                    },
                    company_type: { type: "string", description: "Forma prawna: sp. z o.o., S.A., JDG, spółka komandytowa itp." },
                    nip: { type: "string", description: "NIP firmy (10 cyfr) - SZUKAJ W STOPCE, /KONTAKT, /O-NAS, REGULAMINIE! Format: XXXXXXXXXX" },
                    regon: { type: "string", description: "REGON firmy (9 lub 14 cyfr) - często obok NIP" },
                    krs: { type: "string", description: "KRS firmy (10 cyfr, format 0000XXXXXX) - tylko dla spółek" },
                    address: { type: "string", description: "Adres siedziby (ulica i numer) - szukaj w stopce i /kontakt" },
                    city: { type: "string", description: "Miasto siedziby" },
                    postal_code: { type: "string", description: "Kod pocztowy (format XX-XXX)" },
                    website: { type: "string", description: "Strona www firmy" }
                  },
                  required: ["name", "industry", "description", "what_company_does", "what_company_offers"]
                }
              },
              required: ["person_profile", "company_data"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "save_contact_and_company_profile" } },
        max_tokens: 3000,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    // Safely parse response body
    let aiData: any;
    try {
      const responseText = await aiResponse.text();
      if (!responseText || responseText.trim() === '') {
        throw new Error("Empty response from AI Gateway");
      }
      aiData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error(`AI response parse error: ${parseError instanceof Error ? parseError.message : 'Unknown'}`);
    }
    
    // Parse tool call response
    let profileSummary = "";
    let companyData: any = null;

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        profileSummary = args.person_profile || "";
        companyData = args.company_data || null;
        console.log("Parsed AI response - profile length:", profileSummary.length, "company data:", !!companyData);
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
        // Fallback to regular content
        profileSummary = aiData.choices?.[0]?.message?.content?.trim() || "";
      }
    } else {
      // Fallback if no tool call
      profileSummary = aiData.choices?.[0]?.message?.content?.trim() || "";
    }

    if (!profileSummary) throw new Error("No profile summary generated");

    // ============= STEP 6: Create/Update company if we have data =============
    if (companyData && companyData.name && !companyId) {
      console.log("Creating new company:", companyData.name);
      
      const companyInsert = {
        tenant_id: tenantId,
        name: companyData.name,
        industry: companyData.industry || null,
        description: companyData.description || null,
        website: companyData.website || companyWebsite || null,
        city: companyData.city || null,
        address: companyData.address || null,
        postal_code: companyData.postal_code || null,
        nip: companyData.nip?.replace(/\D/g, '').substring(0, 10) || null,
        regon: companyData.regon?.replace(/\D/g, '') || null,
        krs: companyData.krs?.replace(/\D/g, '') || null,
        ai_analysis: JSON.stringify({
          what_company_does: companyData.what_company_does || null,
          what_company_offers: companyData.what_company_offers || null,
          what_company_seeks: companyData.what_company_seeks || null,
          specializations: companyData.specializations || [],
          target_clients: companyData.target_clients || null,
          services: companyData.services || [],
          collaboration_areas: companyData.collaboration_areas || [],
          management: companyData.management || [],
          company_type: companyData.company_type || null,
          analyzed_at: new Date().toISOString(),
          source: companyWebsite
        })
      };

      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert(companyInsert)
        .select('id')
        .single();

      if (companyError) {
        console.error("Failed to create company:", companyError);
      } else if (newCompany) {
        companyId = newCompany.id;
        companyCreated = true;
        console.log("Created company with ID:", companyId);
      }
    } else if (companyData && companyId) {
      // Update existing company with new data from website or Perplexity
      console.log("Updating existing company:", companyId);
      
      const companyUpdate: any = {};
      
      // UPDATE COMPANY NAME if AI found a longer/more complete name
      if (companyData.name && companyData.name.length > (company?.name?.length || 0)) {
        console.log('Updating company name from', company?.name, 'to', companyData.name);
        companyUpdate.name = companyData.name;
      }
      
      if (companyData.industry && !company?.industry) companyUpdate.industry = companyData.industry;
      if (companyData.description && !company?.description) companyUpdate.description = companyData.description;
      if (companyData.city && !company?.city) companyUpdate.city = companyData.city;
      if (companyData.address && !company?.address) companyUpdate.address = companyData.address;
      if (companyData.postal_code) companyUpdate.postal_code = companyData.postal_code;
      if (companyData.nip && !company?.nip) companyUpdate.nip = companyData.nip.replace(/\D/g, '').substring(0, 10);
      if (companyData.regon && !company?.regon) companyUpdate.regon = companyData.regon.replace(/\D/g, '');
      if (companyData.krs && !company?.krs) companyUpdate.krs = companyData.krs.replace(/\D/g, '');
      if (companyData.website && !company?.website) companyUpdate.website = companyData.website;
      
      // Always update AI analysis with latest data
      companyUpdate.ai_analysis = JSON.stringify({
        what_company_does: companyData.what_company_does || null,
        what_company_offers: companyData.what_company_offers || null,
        what_company_seeks: companyData.what_company_seeks || null,
        specializations: companyData.specializations || [],
        target_clients: companyData.target_clients || null,
        services: companyData.services || [],
        collaboration_areas: companyData.collaboration_areas || [],
        management: companyData.management || [],
        company_type: companyData.company_type || null,
        analyzed_at: new Date().toISOString(),
        source: companyWebsite,
        perplexity_used: !!perplexityProfile
      });

      if (Object.keys(companyUpdate).length > 0) {
        await supabase.from('companies').update(companyUpdate).eq('id', companyId);
        companyUpdated = true;
      }
    }

    // ============= STEP 7: Update contact with profile and company link =============
    const contactUpdate: any = { 
      profile_summary: profileSummary, 
      updated_at: new Date().toISOString() 
    };
    
    if (companyId && !contact.company_id) {
      contactUpdate.company_id = companyId;
      console.log("Linking contact to company:", companyId);
    }

    await supabase.from("contacts").update(contactUpdate).eq("id", contact_id);

    // Log AI profile generation activity
    await supabase.from("contact_activity_log").insert({
      tenant_id: tenantId,
      contact_id: contact_id,
      activity_type: 'ai_profile_generated',
      description: 'Wygenerowano profil AI',
      metadata: { 
        model: 'google/gemini-3-flash-preview',
        has_website_data: hasWebsiteData,
        company_website: companyWebsite,
        has_search_results: personSearchResults.length > 0,
        has_perplexity_results: perplexityProfile.length > 0 || perplexityMedia.length > 0 || perplexityOrgs.length > 0,
        perplexity_citations: perplexityCitations.length,
        company_created: companyCreated,
        company_updated: companyUpdated,
        company_id: companyId
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        profile_summary: profileSummary,
        sources: {
          website_scraped: hasWebsiteData,
          company_website: companyWebsite,
          search_performed: personSearchResults.length > 0,
          perplexity_used: perplexityProfile.length > 0 || perplexityMedia.length > 0 || perplexityOrgs.length > 0,
          perplexity_citations: perplexityCitations.slice(0, 10)
        },
        company: {
          id: companyId,
          created: companyCreated,
          updated: companyUpdated,
          data: companyData
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-contact-profile:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
