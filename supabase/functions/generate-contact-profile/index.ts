import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse, verifyResourceAccess, accessDeniedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const company = contact.companies;

    console.log("Generating AI profile for contact:", contact.full_name);

    const systemPrompt = `Jesteś ekspertem od analizy kontaktów biznesowych. Wygeneruj profesjonalny profil.

## OZNACZENIA:
- ✅ POTWIERDZONE - z danych
- 💡 DEDUKCJA - logiczny wniosek
- 📭 BRAK DANYCH - do uzupełnienia

STRUKTURA:
## 👤 Kim jest ta osoba
## 💼 Kariera
## 🎯 Kompetencje
## 🤝 Wartość dla sieci
## 📋 Potrzeby biznesowe
## 📝 Pytania do następnego spotkania

Maksymalnie 500 słów. Oznacz źródła każdej informacji.`;

    const userPrompt = `Kontakt: ${contact.full_name}
Stanowisko: ${contact.position || 'brak'}
Firma: ${contact.company || company?.name || 'brak'}
Notatki: ${contact.notes || 'Brak'}
Potrzeby: ${needs.map(n => n.title).join(', ') || 'Brak'}
Oferty: ${offers.map(o => o.title).join(', ') || 'Brak'}
Konsultacje: ${consultations.length}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }] }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const profileSummary = aiData.choices?.[0]?.message?.content?.trim();

    if (!profileSummary) throw new Error("No profile summary generated");

    // Update contact
    await supabase.from("contacts").update({ profile_summary: profileSummary, updated_at: new Date().toISOString() }).eq("id", contact_id);

    return new Response(
      JSON.stringify({ success: true, profile_summary: profileSummary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-contact-profile:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
