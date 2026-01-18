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

      // Try subpages for more context
      const subpages = ['/o-nas', '/about', '/oferta', '/uslugi', '/services', '/kontakt', '/contact'];
      for (const subpage of subpages.slice(0, 3)) { // Limit to 3 subpages
        const subpageUrl = companyWebsite.replace(/\/$/, '') + subpage;
        const subpageContent = await scrapeWebsite(subpageUrl, FIRECRAWL_API_KEY);
        if (subpageContent && subpageContent.length > 200) {
          companySubpagesContent += `\n\n### Podstrona ${subpage} (${subpageUrl})\n${subpageContent.substring(0, 2000)}`;
        }
      }
    }

    const hasWebsiteData = companyWebsiteContent.length > 100;
    console.log("Has website data:", hasWebsiteData, "Content length:", companyWebsiteContent.length);

    // ============= STEP 3: Search for person in company context (PRIORITY 2) =============
    let personSearchResults = "";
    if (FIRECRAWL_API_KEY) {
      const searchQuery = `"${contact.full_name}" "${companyName}" stanowisko`;
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

    // ============= STEP 4: Build prompt with data hierarchy =============
    const systemPrompt = `Jesteś ekspertem od analizy kontaktów biznesowych. Wygeneruj profesjonalny profil na podstawie HIERARCHII ŹRÓDEŁ.

## HIERARCHIA ŹRÓDEŁ (PRZESTRZEGAJ KOLEJNOŚCI!):

### PRIORYTET 1 - FAKTY ZE STRONY WWW FIRMY
Jeśli dostępne są dane ze strony firmy, użyj ich PRZEDE WSZYSTKIM do opisania:
- Czym zajmuje się firma
- Jaką ofertę ma firma
- W jakiej branży działa
- Jakie są specjalizacje

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

## STRUKTURA ODPOWIEDZI:

## 👤 Kim jest ta osoba
[Krótkie wprowadzenie z potwierdzonym stanowiskiem i firmą]

## 🏢 O firmie ${companyName}
${hasWebsiteData ? `
✅ **Branża:** [wyodrębnij ze strony www]
✅ **Działalność:** [co firma robi - ze strony]
✅ **Oferta:** [produkty/usługi - ze strony]
✅ **Specjalizacje:** [jeśli widoczne]
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
[Informacje o życiu osobistym - tylko ze źródeł lub oznacz jako 💡 DEDUKCJA]
- 👨‍👩‍👧‍👦 **Rodzina:** [status rodzinny, dzieci jeśli znane ze źródeł]
- 🎯 **Hobby i zainteresowania:** [pozazawodowe aktywności, pasje]
- ⚽ **Sport:** [ulubione dyscypliny, aktywność fizyczna]

## 📰 Wzmianki w mediach
[Artykuły prasowe, wywiady, publikacje, wystąpienia publiczne]
- Jeśli znaleziono wzmianki - podaj tytuły i źródła
- Jeśli brak - napisz "📭 Brak znalezionych wzmianek w mediach"

## 🤝 Wartość dla sieci
[Jak osoba może pomóc innym kontaktom]

## 📋 Potrzeby biznesowe
[Na podstawie danych z systemu lub wnioski]

## 📝 Pytania do następnego spotkania
1. [Konkretne pytanie o firmę/współpracę]
2. [Pytanie o potrzeby]
3. [Pytanie o sieć kontaktów]
4. [Pytanie o zainteresowania/hobby - do budowania relacji]

Maksymalnie 700 słów. ZAWSZE oznaczaj źródła.`;

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

---
WYGENERUJ PROFIL ZGODNIE Z HIERARCHIĄ ŹRÓDEŁ. FAKTY ZE STRONY WWW MAJĄ PIERWSZEŃSTWO!
PAMIĘTAJ O SEKCJACH: ŻYCIE PRYWATNE (rodzina, hobby, sport) I WZMIANKI W MEDIACH!`;

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
                  description: "Strukturyzowane dane firmy do zapisania w bazie",
                  properties: {
                    name: { type: "string", description: "Pełna nazwa firmy (np. Sistrans Sp. z o.o.)" },
                    industry: { type: "string", description: "Branża firmy (np. Transport, Spedycja, Logistyka)" },
                    description: { type: "string", description: "Krótki opis firmy (max 500 znaków)" },
                    what_company_does: { type: "string", description: "Główna działalność firmy" },
                    what_company_offers: { type: "string", description: "Oferta produktów/usług" },
                    specializations: { type: "array", items: { type: "string" }, description: "Lista specjalizacji" },
                    nip: { type: "string", description: "NIP firmy (10 cyfr) jeśli znaleziony" },
                    regon: { type: "string", description: "REGON firmy jeśli znaleziony" },
                    krs: { type: "string", description: "KRS firmy jeśli znaleziony" },
                    address: { type: "string", description: "Adres firmy (ulica, numer)" },
                    city: { type: "string", description: "Miasto" },
                    postal_code: { type: "string", description: "Kod pocztowy (np. 00-001)" },
                    website: { type: "string", description: "Strona www firmy" }
                  },
                  required: ["name", "industry", "description"]
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

    const aiData = await aiResponse.json();
    
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
          what_company_does: companyData.what_company_does,
          what_company_offers: companyData.what_company_offers,
          specializations: companyData.specializations,
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
    } else if (companyData && companyId && hasWebsiteData) {
      // Update existing company with new data from website
      console.log("Updating existing company:", companyId);
      
      const companyUpdate: any = {};
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
        what_company_does: companyData.what_company_does,
        what_company_offers: companyData.what_company_offers,
        specializations: companyData.specializations,
        analyzed_at: new Date().toISOString(),
        source: companyWebsite
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
          search_performed: personSearchResults.length > 0
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
