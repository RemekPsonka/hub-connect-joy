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

    // Build prompt with available data
    const company = contact.companies;
    const promptParts = [
      `Imię i nazwisko: ${contact.full_name}`,
    ];

    if (contact.title) promptParts.push(`Tytuł: ${contact.title}`);
    if (contact.position) promptParts.push(`Stanowisko: ${contact.position}`);
    if (contact.company) promptParts.push(`Firma: ${contact.company}`);
    if (company?.industry) promptParts.push(`Branża firmy: ${company.industry}`);
    if (company?.description) promptParts.push(`Opis firmy: ${company.description}`);
    if (contact.city) promptParts.push(`Miasto: ${contact.city}`);
    if (contact.notes) promptParts.push(`Notatki: ${contact.notes}`);
    if (contact.tags && contact.tags.length > 0) promptParts.push(`Tagi: ${contact.tags.join(", ")}`);

    const systemPrompt = `Jesteś ekspertem w tworzeniu profesjonalnych podsumowań osób dla systemu CRM do zarządzania kontaktami biznesowymi.
    
Twoim zadaniem jest wygenerowanie zwięzłego, profesjonalnego podsumowania osoby (2-3 zdania, maksymalnie 200 słów).

Podsumowanie powinno:
- Opisać kim jest ta osoba zawodowo
- Wskazać jej główne kompetencje lub obszary ekspertyzy
- Zasugerować jaką wartość może wnieść do sieci kontaktów biznesowych
- Być napisane w języku polskim

Odpowiedz TYLKO tekstem podsumowania, bez dodatkowych komentarzy czy formatowania.`;

    const userPrompt = `Wygeneruj profesjonalne podsumowanie dla następującej osoby:

${promptParts.join("\n")}`;

    console.log("Generating AI profile for contact:", contact.full_name);

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
        profile_summary: profileSummary 
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
