import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contact_id } = await req.json();

    if (!contact_id) {
      return new Response(
        JSON.stringify({ error: "contact_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch contact with company data
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("*, companies(*)")
      .eq("id", contact_id)
      .single();

    if (contactError || !contact) {
      return new Response(
        JSON.stringify({ error: "Contact not found", details: contactError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch additional data for richer profile
    const [consultationsResult, needsResult, offersResult] = await Promise.all([
      // Last 3 consultations
      supabase
        .from("consultations")
        .select("scheduled_at, notes, ai_summary, agenda, status")
        .eq("contact_id", contact_id)
        .order("scheduled_at", { ascending: false })
        .limit(3),
      // Active needs
      supabase
        .from("needs")
        .select("title, description, priority, status")
        .eq("contact_id", contact_id)
        .eq("status", "active"),
      // Active offers
      supabase
        .from("offers")
        .select("title, description, status")
        .eq("contact_id", contact_id)
        .eq("status", "active"),
    ]);

    const consultations = consultationsResult.data || [];
    const needs = needsResult.data || [];
    const offers = offersResult.data || [];
    const company = contact.companies;

    // Assess data quality
    const dataQuality = {
      hasPosition: !!contact.position || !!contact.title,
      hasCompany: !!contact.company || !!company?.name,
      hasNotes: !!contact.notes,
      hasNeeds: needs.length > 0,
      hasOffers: offers.length > 0,
      hasConsultations: consultations.length > 0,
    };
    const qualityScore = Object.values(dataQuality).filter(Boolean).length;

    console.log("Generating AI profile for contact:", contact.full_name, "| Data quality score:", qualityScore);

    // Build rich system prompt
    const systemPrompt = `Jesteś ekspertem od analizy kontaktów biznesowych i tworzenia profesjonalnych profili osób dla systemu CRM.

TWOJE ZADANIE:
Stwórz kompleksowy, profesjonalny profil osoby na podstawie dostarczonych danych.
Profil powinien być użyteczny dla dyrektora zarządzającego siecią kontaktów biznesowych.

STRUKTURA PROFILU:
1. **Kim jest ta osoba** (1-2 zdania) - rola zawodowa, pozycja w firmie
2. **Kompetencje i obszary ekspertyzy** (1-2 zdania) - na podstawie stanowiska, branży, potrzeb/ofert
3. **Wartość dla sieci kontaktów** (1-2 zdania) - jak może pomóc, jakie korzyści wnosi
4. **Rekomendowany sposób kontaktu** (1 zdanie) - na podstawie historii interakcji

ZASADY:
- Pisz w języku polskim, profesjonalnym tonem
- Maksymalnie 300 słów
- Bazuj TYLKO na dostarczonych danych - nie wymyślaj informacji
- Jeśli brakuje danych dla sekcji, pomiń ją gracefully
- Jeśli są notatki z konsultacji, wyciągnij kluczowe informacje o osobie
- Podkreśl unikalne cechy/wartość tej osoby
- Unikaj ogólników - bądź konkretny i precyzyjny
- Jeśli osoba ma zdefiniowane potrzeby lub oferty, wykorzystaj je do opisu jej profilu

${qualityScore < 2 ? `
UWAGA: Dostępnych jest bardzo mało danych o tej osobie.
Wygeneruj krótkie, ogólne podsumowanie (1-2 zdania) bez domysłów.
Skoncentruj się tylko na tym, co wiadomo na pewno.` : ''}

ODPOWIEDZ TYLKO tekstem profilu, bez nagłówków sekcji i bez formatowania markdown.`;

    // Build rich user prompt with all available data
    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return 'brak danych';
      try {
        return new Date(dateStr).toLocaleDateString('pl-PL');
      } catch {
        return dateStr;
      }
    };

    const userPromptParts = [
      `Wygeneruj profesjonalny profil dla następującej osoby:`,
      ``,
      `=== DANE PODSTAWOWE ===`,
      `Imię i nazwisko: ${contact.full_name}`,
      `Tytuł: ${contact.title || 'brak'}`,
      `Stanowisko: ${contact.position || 'brak'}`,
      `Firma: ${contact.company || company?.name || 'brak'}`,
      `Miasto: ${contact.city || 'brak'}`,
      `Źródło kontaktu: ${contact.source || 'nieznane'}`,
      `LinkedIn: ${contact.linkedin_url || 'brak'}`,
      `Siła relacji: ${contact.relationship_strength || 5}/10`,
      `Ostatni kontakt: ${formatDate(contact.last_contact_date)}`,
      `Tagi: ${contact.tags && contact.tags.length > 0 ? contact.tags.join(', ') : 'brak'}`,
      ``,
      `=== NOTATKI ===`,
      contact.notes || 'Brak notatek',
    ];

    // Add company info if available
    if (company) {
      userPromptParts.push(
        ``,
        `=== INFORMACJE O FIRMIE ===`,
        `Nazwa firmy: ${company.name}`,
        `Branża: ${company.industry || 'nieznana'}`,
        `Opis firmy: ${company.description || 'brak'}`,
        `Analiza AI firmy: ${company.ai_analysis || 'brak'}`,
        `Wielkość: ${company.employee_count || 'nieznana'}`,
        `Strona: ${company.website || 'brak'}`
      );
    }

    // Add needs
    userPromptParts.push(``, `=== POTRZEBY (czego szuka) ===`);
    if (needs.length > 0) {
      needs.forEach(n => {
        userPromptParts.push(`- ${n.title}${n.description ? ': ' + n.description : ''} [priorytet: ${n.priority || 'normalny'}]`);
      });
    } else {
      userPromptParts.push('Brak zdefiniowanych potrzeb');
    }

    // Add offers
    userPromptParts.push(``, `=== OFERTY (co może zaoferować) ===`);
    if (offers.length > 0) {
      offers.forEach(o => {
        userPromptParts.push(`- ${o.title}${o.description ? ': ' + o.description : ''}`);
      });
    } else {
      userPromptParts.push('Brak zdefiniowanych ofert');
    }

    // Add consultation history
    userPromptParts.push(``, `=== HISTORIA KONSULTACJI (ostatnie 3) ===`);
    if (consultations.length > 0) {
      consultations.forEach((c, i) => {
        userPromptParts.push(
          `--- Konsultacja ${i + 1} ---`,
          `Data: ${formatDate(c.scheduled_at)}`,
          `Status: ${c.status || 'nieznany'}`,
          `Agenda: ${c.agenda || 'brak'}`,
          `Notatki: ${c.notes || 'brak'}`,
          `Podsumowanie AI: ${c.ai_summary || 'brak'}`
        );
      });
    } else {
      userPromptParts.push('Brak historii konsultacji');
    }

    const userPrompt = userPromptParts.join('\n');

    // Call AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Przekroczono limit zapytań AI. Spróbuj ponownie za chwilę." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Brak środków na konto AI. Doładuj kredyty." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const profileSummary = aiData.choices?.[0]?.message?.content?.trim();

    if (!profileSummary) {
      throw new Error("No profile summary generated");
    }

    console.log("Generated profile summary:", profileSummary.substring(0, 100) + "...");

    // Update contact with the generated profile
    const { error: updateError } = await supabase
      .from("contacts")
      .update({ 
        profile_summary: profileSummary,
        updated_at: new Date().toISOString()
      })
      .eq("id", contact_id);

    if (updateError) {
      console.error("Error updating contact:", updateError);
      throw new Error("Failed to save profile summary");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        profile_summary: profileSummary,
        data_quality_score: qualityScore
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-contact-profile:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
