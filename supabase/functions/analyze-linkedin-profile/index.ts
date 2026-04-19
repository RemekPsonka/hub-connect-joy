// INTERNAL — wywoływane tylko przez `enrich-person/` (orchestrator). Nie wołać bezpośrednio z FE.
// Step alias: 'linkedin'.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NetworkContact {
  first_name: string;
  last_name: string;
  full_name: string;
  position: string | null;
  company: string | null;
  linkedin_url: string | null;
  relationship_type: string;
  confidence: string;
}

interface LinkedInAnalysis {
  profile_analysis: {
    headline?: string;
    current_position?: string;
    current_company?: string;
    location?: string;
    about?: string;
    experience?: Array<{
      company: string;
      position: string;
      period: string;
      description?: string;
    }>;
    education?: Array<{
      school: string;
      degree?: string;
      period?: string;
    }>;
    skills?: string[];
    certifications?: string[];
    languages?: string[];
    achievements?: string[];
  };
  network_contacts: NetworkContact[];
  analysis_notes: string;
  sources: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY") || Deno.env.get("FIRECRAWL_API_KEY_1");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!firecrawlApiKey) {
      console.error("FIRECRAWL_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Firecrawl connector not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Lovable AI not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authentication
    const authResult = await verifyAuth(req, supabase);
    if (isAuthError(authResult)) {
      return unauthorizedResponse(authResult, corsHeaders);
    }

    const { contact_id, linkedin_url } = await req.json();

    if (!contact_id || !linkedin_url) {
      return new Response(
        JSON.stringify({ error: "contact_id and linkedin_url are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Analyzing LinkedIn profile: ${linkedin_url} for contact: ${contact_id}`);

    // Step 1: Scrape LinkedIn profile using Firecrawl
    console.log("Scraping LinkedIn profile with Firecrawl...");
    
    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${firecrawlApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: linkedin_url,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text();
      console.error("Firecrawl scrape error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to scrape LinkedIn profile. The profile may be private or unavailable." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const scrapeData = await scrapeResponse.json();
    const profileContent = scrapeData.data?.markdown || scrapeData.markdown || "";

    if (!profileContent || profileContent.length < 100) {
      console.log("Profile content too short, trying search...");
    }

    // Step 2: Also search for more information about this person
    const profileName = linkedin_url.split("/in/")[1]?.replace(/\/$/, "").replace(/-/g, " ") || "";
    
    let searchResults = "";
    if (profileName) {
      try {
        const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `"${profileName}" LinkedIn OR site:linkedin.com`,
            limit: 5,
            scrapeOptions: {
              formats: ["markdown"],
            },
          }),
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const results = searchData.data || [];
          searchResults = results
            .map((r: { title?: string; url?: string; markdown?: string }) => 
              `### ${r.title || "Result"}\nURL: ${r.url || ""}\n${(r.markdown || "").substring(0, 2000)}`
            )
            .join("\n\n---\n\n");
        }
      } catch (e) {
        console.error("Search error:", e);
      }
    }

    const combinedContent = `
## Główny profil LinkedIn
${profileContent.substring(0, 8000)}

## Dodatkowe wyniki wyszukiwania
${searchResults.substring(0, 6000)}
    `.trim();

    console.log(`Total content length: ${combinedContent.length} characters`);

    // Step 3: Analyze with AI
    const systemPrompt = `Jesteś ekspertem w analizie profili LinkedIn. Twoim zadaniem jest wydobycie WSZYSTKICH dostępnych informacji z profilu.

🔍 WYODRĘBNIJ NASTĘPUJĄCE INFORMACJE:

1. DANE PODSTAWOWE
   - Imię i nazwisko (jeśli widoczne)
   - Aktualny nagłówek/headline
   - Aktualne stanowisko i firma
   - Lokalizacja
   - O mnie/podsumowanie

2. DOŚWIADCZENIE ZAWODOWE
   - Pełna historia stanowisk (firma, rola, okres, opis)
   - Osiągnięcia zawodowe
   - Kluczowe projekty

3. WYKSZTAŁCENIE
   - Uczelnie, kierunki, lata
   - Certyfikaty i kursy

4. UMIEJĘTNOŚCI
   - Kompetencje twarde
   - Kompetencje miękkie
   - Języki

5. SIEĆ KONTAKTÓW (BARDZO WAŻNE!)
   Przeanalizuj profil i znajdź WSZYSTKIE wymienione osoby:
   - Współpracownicy z obecnej/poprzednich firm
   - Osoby w sekcji rekomendacji (kto rekomenduje/kogo rekomenduje)
   - Osoby wspomniane w opisach stanowisk lub projektów
   - Osoby z tej samej firmy widoczne na profilu
   
   Dla każdej znalezionej osoby wyodrębnij:
   - imię i nazwisko
   - stanowisko (jeśli widoczne)
   - firma (jeśli widoczna)
   - linkedin_url (jeśli dostępny)
   - typ relacji (współpracownik, rekomendujący, rekomendowany, były współpracownik)
   - confidence (high/medium/low)

ODPOWIEDZ W FORMACIE JSON:
{
  "profile_analysis": {
    "headline": "Nagłówek profilu",
    "current_position": "Aktualne stanowisko",
    "current_company": "Aktualna firma",
    "location": "Lokalizacja",
    "about": "Sekcja O mnie",
    "experience": [
      {"company": "Firma", "position": "Stanowisko", "period": "2020-obecny", "description": "Opis"}
    ],
    "education": [
      {"school": "Uczelnia", "degree": "Kierunek", "period": "2010-2015"}
    ],
    "skills": ["umiejętność1", "umiejętność2"],
    "certifications": ["certyfikat1"],
    "languages": ["Polski", "Angielski"],
    "achievements": ["osiągnięcie1", "osiągnięcie2"]
  },
  "network_contacts": [
    {
      "first_name": "Jan",
      "last_name": "Kowalski",
      "full_name": "Jan Kowalski",
      "position": "CTO",
      "company": "TechCorp",
      "linkedin_url": "https://linkedin.com/in/jan-kowalski",
      "relationship_type": "współpracownik",
      "confidence": "high"
    }
  ],
  "analysis_notes": "## 📊 Analiza LinkedIn\\n\\n### 👤 Profil\\n**Nagłówek:** ...\\n**Stanowisko:** ...\\n\\n### 💼 Doświadczenie\\n- **2020-obecnie:** ...\\n\\n### 🎓 Wykształcenie\\n...\\n\\n### 💪 Umiejętności\\n...\\n\\n### 🔗 Znalezione kontakty\\n- Jan Kowalski (CTO) - współpracownik\\n...",
  "sources": ["${linkedin_url}"]
}

WAŻNE:
- Jeśli nie możesz znaleźć jakiejś informacji, użyj null
- Notatka analysis_notes powinna być w formacie Markdown, czytelna i kompletna
- Kontakty network_contacts powinny zawierać TYLKO osoby które faktycznie znalazłeś w treści
- Nie wymyślaj kontaktów - dodawaj tylko te które są widoczne w danych`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Przeanalizuj ten profil LinkedIn:\n\n${combinedContent}` }
        ],
        max_tokens: 4000,
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to analyze profile with AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";

    console.log("AI response received, parsing...");

    // Parse AI response
    let analysis: LinkedInAnalysis;
    try {
      // Extract JSON from response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      analysis = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      console.log("Raw AI content:", aiContent);
      
      // Create fallback analysis
      analysis = {
        profile_analysis: {
          headline: "Nie udało się przeanalizować profilu",
        },
        network_contacts: [],
        analysis_notes: `## 📊 Analiza LinkedIn\n\nNie udało się w pełni przeanalizować profilu.\n\n### Surowa treść:\n${profileContent.substring(0, 2000)}`,
        sources: [linkedin_url],
      };
    }

    // Step 4: Get current contact data
    const { data: currentContact, error: contactError } = await supabase
      .from("contacts")
      .select("notes, full_name")
      .eq("id", contact_id)
      .single();

    if (contactError) {
      console.error("Error fetching contact:", contactError);
      return new Response(
        JSON.stringify({ error: "Contact not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 5: Build note with analysis
    const timestamp = new Date().toLocaleString("pl-PL", { 
      dateStyle: "long", 
      timeStyle: "short" 
    });

    const newNote = `${analysis.analysis_notes}

---
📅 Analiza wykonana: ${timestamp}
📎 Źródło: ${linkedin_url}
🔗 Znaleziono kontaktów: ${analysis.network_contacts.length}`;

    // Append to existing notes
    const updatedNotes = currentContact.notes 
      ? `${currentContact.notes}\n\n---\n\n${newNote}`
      : newNote;

    // Step 6: Update contact notes
    const { error: updateError } = await supabase
      .from("contacts")
      .update({ 
        notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", contact_id);

    if (updateError) {
      console.error("Error updating contact notes:", updateError);
    }

    // Step 7: Create network contacts
    const createdContacts: Array<{ id: string; full_name: string; created: boolean }> = [];

    for (const networkContact of analysis.network_contacts) {
      if (!networkContact.full_name && !networkContact.first_name) continue;

      const fullName = networkContact.full_name || 
        `${networkContact.first_name || ""} ${networkContact.last_name || ""}`.trim();

      if (!fullName || fullName.length < 2) continue;

      // Check if contact already exists (by name and company)
      const { data: existingContacts } = await supabase
        .from("contacts")
        .select("id, full_name")
        .eq("tenant_id", authResult.tenantId)
        .eq("is_active", true)
        .ilike("full_name", `%${fullName}%`)
        .limit(1);

      if (existingContacts && existingContacts.length > 0) {
        // Contact exists, just create connection
        createdContacts.push({ 
          id: existingContacts[0].id, 
          full_name: existingContacts[0].full_name,
          created: false 
        });

        // Check if connection exists
        const { data: existingConn } = await supabase
          .from("connections")
          .select("id")
          .eq("tenant_id", authResult.tenantId)
          .or(`and(contact_a_id.eq.${contact_id},contact_b_id.eq.${existingContacts[0].id}),and(contact_a_id.eq.${existingContacts[0].id},contact_b_id.eq.${contact_id})`)
          .limit(1);

        if (!existingConn || existingConn.length === 0) {
          // Create connection
          await supabase
            .from("connections")
            .insert({
              tenant_id: authResult.tenantId,
              contact_a_id: contact_id,
              contact_b_id: existingContacts[0].id,
              connection_type: networkContact.relationship_type || "współpracownik",
              strength: networkContact.confidence === "high" ? 3 : networkContact.confidence === "medium" ? 2 : 1,
            });
        }
      } else {
        // Create new contact
        const firstName = networkContact.first_name || fullName.split(" ")[0];
        const lastName = networkContact.last_name || fullName.split(" ").slice(1).join(" ");

        const { data: newContact, error: createError } = await supabase
          .from("contacts")
          .insert({
            tenant_id: authResult.tenantId,
            full_name: fullName,
            first_name: firstName,
            last_name: lastName,
            position: networkContact.position,
            company: networkContact.company,
            linkedin_url: networkContact.linkedin_url,
            source: "linkedin_network",
            notes: `Kontakt znaleziony w sieci LinkedIn: ${currentContact.full_name}\nTyp relacji: ${networkContact.relationship_type || "nieznany"}`,
            is_active: true,
          })
          .select("id, full_name")
          .single();

        if (createError) {
          console.error("Error creating contact:", createError);
          continue;
        }

        createdContacts.push({ 
          id: newContact.id, 
          full_name: newContact.full_name,
          created: true 
        });

        // Create connection
        await supabase
          .from("connections")
          .insert({
            tenant_id: authResult.tenantId,
            contact_a_id: contact_id,
            contact_b_id: newContact.id,
            connection_type: networkContact.relationship_type || "współpracownik",
            strength: networkContact.confidence === "high" ? 3 : networkContact.confidence === "medium" ? 2 : 1,
          });
      }
    }

    console.log(`Analysis complete. Created ${createdContacts.filter(c => c.created).length} new contacts, found ${createdContacts.filter(c => !c.created).length} existing.`);

    return new Response(
      JSON.stringify({
        success: true,
        profile_analysis: analysis.profile_analysis,
        contacts_created: createdContacts.filter(c => c.created).length,
        contacts_linked: createdContacts.filter(c => !c.created).length,
        contacts: createdContacts,
        notes_updated: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-linkedin-profile:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
