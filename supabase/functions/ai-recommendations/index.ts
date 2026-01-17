import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  priority: "high" | "medium" | "low";
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

    // Get authorization header to identify user
    const authHeader = req.headers.get("Authorization");
    let tenantId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        const { data: director } = await supabase
          .from("directors")
          .select("tenant_id")
          .eq("user_id", user.id)
          .single();
        
        tenantId = director?.tenant_id ?? null;
      }
    }

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", recommendations: [] }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
        .select("id, title, description, contacts(full_name)")
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .limit(15),
      supabase
        .from("offers")
        .select("id, title, description, contacts(full_name)")
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
        .select("id, similarity_score, status, needs(title, contacts(full_name)), offers(title, contacts(full_name))")
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

    // Build context for AI
    let context = "Dane użytkownika:\n\n";
    
    context += `Kontakty (${contacts.length}):\n`;
    contacts.forEach((c, i) => {
      const daysSinceContact = c.last_contact_date 
        ? Math.floor((Date.now() - new Date(c.last_contact_date).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      context += `${i + 1}. ${c.full_name} (${c.company || "brak firmy"}) - siła relacji: ${c.relationship_strength || 0}/10`;
      if (daysSinceContact !== null) {
        context += `, ostatni kontakt: ${daysSinceContact} dni temu`;
      }
      context += "\n";
    });

    context += `\nAktywne potrzeby (${needs.length}):\n`;
    needs.forEach((n: any, i) => {
      context += `${i + 1}. "${n.title}" - ${n.contacts?.full_name || "nieznany"}\n`;
    });

    context += `\nAktywne oferty (${offers.length}):\n`;
    offers.forEach((o: any, i) => {
      context += `${i + 1}. "${o.title}" - ${o.contacts?.full_name || "nieznany"}\n`;
    });

    context += `\nOczekujące dopasowania (${matches.length}):\n`;
    matches.forEach((m: any, i) => {
      context += `${i + 1}. Potrzeba "${m.needs?.title}" ↔ Oferta "${m.offers?.title}" (dopasowanie: ${Math.round((m.similarity_score || 0) * 100)}%)\n`;
    });

    context += `\nOczekujące zadania (${tasks.length}):\n`;
    tasks.forEach((t, i) => {
      context += `${i + 1}. ${t.title} (priorytet: ${t.priority}, termin: ${t.due_date || "brak"})\n`;
    });

    const systemPrompt = `Jesteś AI asystentem do zarządzania siecią kontaktów biznesowych.
Na podstawie danych użytkownika wygeneruj 3-5 konkretnych, akcjonowalnych rekomendacji.

Typy rekomendacji:
- connection: sugestia połączenia dwóch osób, które mogłyby skorzystać na poznaniu się
- followup: przypomnienie o konieczności odezwania się do kogoś
- opportunity: szansa biznesowa lub potencjalna współpraca

Odpowiedz TYLKO w formacie JSON (bez markdown) z tablicą rekomendacji.`;

    const userPrompt = `${context}

Wygeneruj 3-5 rekomendacji w formacie JSON:
{
  "recommendations": [
    {
      "id": "unique-id",
      "type": "connection" | "followup" | "opportunity",
      "title": "Krótki tytuł",
      "description": "Opis dlaczego to ważne i co zrobić",
      "priority": "high" | "medium" | "low"
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

    return new Response(
      JSON.stringify({ recommendations }),
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
