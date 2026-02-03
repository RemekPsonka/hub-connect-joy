import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Recommendation {
  id: string;
  type: "connection" | "followup" | "opportunity";
  title: string;
  description: string;
  contactIds?: string[];
  contactNames?: string[];
  contactDescriptions?: Record<string, string>;
  priority: "high" | "medium" | "low";
  reasoning?: string;
}

function generateRecommendationHash(rec: { type: string; contactIds?: string[]; title: string }): string {
  const sortedIds = [...(rec.contactIds || [])].sort().join('-');
  return `${rec.type}-${sortedIds}-${rec.title.slice(0, 50)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authorization using centralized auth
    const authResult = await verifyAuth(req, supabase);
    if (isAuthError(authResult)) {
      return unauthorizedResponse(authResult, corsHeaders);
    }

    const tenantId = authResult.tenantId;
    console.log(`[ai-recommendations] Authorized user: ${authResult.user.id}, tenant: ${tenantId}`);

    // Fetch closed recommendations to filter them out
    const { data: closedRecs } = await supabase
      .from("ai_recommendation_actions")
      .select("recommendation_hash")
      .eq("tenant_id", tenantId);
    
    const closedHashes = new Set((closedRecs || []).map(r => r.recommendation_hash));
    console.log(`Found ${closedHashes.size} closed recommendations`);

    // Fetch context data
    const [contactsRes, needsRes, offersRes, tasksRes, matchesRes] = await Promise.all([
      supabase
        .from("contacts")
        .select("id, full_name, company, position, last_contact_date, relationship_strength")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("relationship_strength", { ascending: false })
        .limit(30),
      supabase
        .from("needs")
        .select("id, title, description, contact_id, contacts(id, full_name)")
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .limit(15),
      supabase
        .from("offers")
        .select("id, title, description, contact_id, contacts(id, full_name)")
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .limit(15),
      supabase
        .from("tasks")
        .select("id, title, due_date, priority, status")
        .eq("tenant_id", tenantId)
        .eq("status", "pending")
        .order("due_date", { ascending: true })
        .limit(10),
      supabase
        .from("matches")
        .select("id, similarity_score, status, needs(title, contact_id, contacts(id, full_name)), offers(title, contact_id, contacts(id, full_name))")
        .eq("tenant_id", tenantId)
        .eq("status", "pending")
        .order("similarity_score", { ascending: false })
        .limit(10),
    ]);

    const contacts = contactsRes.data || [];
    const needs = needsRes.data || [];
    const offers = offersRes.data || [];
    const tasks = tasksRes.data || [];
    const matches = matchesRes.data || [];

    // Build contact ID to name map for later use
    const contactMap = new Map<string, string>();
    contacts.forEach(c => contactMap.set(c.id, c.full_name));

    // Build context for AI with contact IDs
    let context = "Dane użytkownika:\n\n";
    
    context += `Kontakty (${contacts.length}):\n`;
    contacts.forEach((c, i) => {
      const daysSinceContact = c.last_contact_date 
        ? Math.floor((Date.now() - new Date(c.last_contact_date).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      context += `${i + 1}. [ID:${c.id}] ${c.full_name} (${c.company || "brak firmy"}) - siła relacji: ${c.relationship_strength || 0}/10`;
      if (daysSinceContact !== null) {
        context += `, ostatni kontakt: ${daysSinceContact} dni temu`;
      }
      context += "\n";
    });

    context += `\nAktywne potrzeby (${needs.length}):\n`;
    needs.forEach((n: any, i) => {
      const contactId = n.contact_id || n.contacts?.id;
      const contactName = n.contacts?.full_name || "nieznany";
      context += `${i + 1}. "${n.title}" - [ID:${contactId}] ${contactName}\n`;
    });

    context += `\nAktywne oferty (${offers.length}):\n`;
    offers.forEach((o: any, i) => {
      const contactId = o.contact_id || o.contacts?.id;
      const contactName = o.contacts?.full_name || "nieznany";
      context += `${i + 1}. "${o.title}" - [ID:${contactId}] ${contactName}\n`;
    });

    context += `\nOczekujące dopasowania (${matches.length}):\n`;
    matches.forEach((m: any, i) => {
      const needContactId = m.needs?.contact_id || m.needs?.contacts?.id;
      const offerContactId = m.offers?.contact_id || m.offers?.contacts?.id;
      context += `${i + 1}. Potrzeba "${m.needs?.title}" [ID:${needContactId}] ↔ Oferta "${m.offers?.title}" [ID:${offerContactId}] (dopasowanie: ${Math.round((m.similarity_score || 0) * 100)}%)\n`;
    });

    context += `\nOczekujące zadania (${tasks.length}):\n`;
    tasks.forEach((t, i) => {
      context += `${i + 1}. ${t.title} (priorytet: ${t.priority}, termin: ${t.due_date || "brak"})\n`;
    });

    const systemPrompt = `Jesteś AI asystentem do zarządzania siecią kontaktów biznesowych.
Na podstawie danych użytkownika wygeneruj 3-5 konkretnych, akcjonowalnych rekomendacji.

Typy rekomendacji:
- connection: sugestia połączenia dwóch osób, które mogłyby skorzystać na poznaniu się (MUSI zawierać dokładnie 2 ID kontaktów)
- followup: przypomnienie o konieczności odezwania się do kogoś (MUSI zawierać 1 ID kontaktu)
- opportunity: szansa biznesowa lub potencjalna współpraca (MUSI zawierać przynajmniej 1 ID kontaktu)

WAŻNE:
- Używaj dokładnych ID kontaktów z podanych danych (format [ID:uuid])
- Dla typu "connection" ZAWSZE podaj dwa różne kontakty w contactIds
- W polu contactDescriptions podaj dla KAŻDEGO kontaktu (po jego ID) krótki opis tego, czym się zajmuje lub czego potrzebuje (bez imienia, np. "poszukuje wsparcia w marketingu B2B", "specjalizuje się w kampaniach Google Ads")
- Pole reasoning powinno zawierać TYLKO powód połączenia (dlaczego warto ich połączyć)
- Podaj contactNames odpowiadające contactIds

Odpowiedz TYLKO w formacie JSON (bez markdown) z tablicą rekomendacji.`;

    const userPrompt = `${context}

Wygeneruj 3-5 rekomendacji w formacie JSON:
{
  "recommendations": [
    {
      "id": "unique-id-1",
      "type": "connection",
      "title": "Połącz Jana Kowalskiego z Anną Nowak",
      "description": "Krótki opis korzyści z połączenia",
      "contactIds": ["uuid-jana", "uuid-anny"],
      "contactNames": ["Jan Kowalski", "Anna Nowak"],
      "contactDescriptions": {
        "uuid-jana": "poszukuje wsparcia w marketingu i pozyskiwaniu klientów B2B",
        "uuid-anny": "specjalizuje się w kampaniach Google Ads i LinkedIn dla sektora B2B"
      },
      "priority": "high",
      "reasoning": "Potrzeby marketingowe Jana idealnie odpowiadają ofercie Anny. Współpraca może przyspieszyć rozwój firmy."
    },
    {
      "id": "unique-id-2",
      "type": "followup",
      "title": "Skontaktuj się z Piotrem Wiśniewskim",
      "description": "Dawno nie było kontaktu",
      "contactIds": ["uuid-piotra"],
      "contactNames": ["Piotr Wiśniewski"],
      "contactDescriptions": {
        "uuid-piotra": "pracuje nad rozwojem sieci dystrybucji"
      },
      "priority": "medium",
      "reasoning": "Minęło już 45 dni od ostatniego kontaktu, a Piotr może mieć nowe potrzeby biznesowe."
    }
  ]
}`;

    console.log("Generating AI recommendations with context length:", context.length);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded", recommendations: [] }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required", recommendations: [] }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI error", recommendations: [] }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";
    
    console.log("AI response content:", content);

    // Parse JSON from response
    let recommendations: Recommendation[] = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        recommendations = parsed.recommendations || [];
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
    }

    // Filter out already closed recommendations
    const filteredRecommendations = recommendations.filter(rec => {
      const hash = generateRecommendationHash(rec);
      const isClosed = closedHashes.has(hash);
      if (isClosed) {
        console.log(`Filtering out closed recommendation: ${rec.title}`);
      }
      return !isClosed;
    });

    console.log(`Returning ${filteredRecommendations.length} recommendations (filtered ${recommendations.length - filteredRecommendations.length})`);

    return new Response(
      JSON.stringify({ recommendations: filteredRecommendations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in ai-recommendations:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", recommendations: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
