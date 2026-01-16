import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  context?: {
    contactId?: string;
    meetingId?: string;
    includeContacts?: boolean;
    includeNeeds?: boolean;
    includeOffers?: boolean;
  };
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

    const { messages, context } = await req.json() as ChatRequest;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context information
    let contextInfo = "";
    
    if (tenantId) {
      // Fetch relevant data for context
      if (context?.includeContacts !== false) {
        const { data: contacts } = await supabase
          .from("contacts")
          .select("full_name, company, position, relationship_strength")
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .order("relationship_strength", { ascending: false })
          .limit(20);

        if (contacts?.length) {
          contextInfo += "\n\nTwoje najważniejsze kontakty:\n";
          contacts.forEach((c, i) => {
            contextInfo += `${i + 1}. ${c.full_name}${c.company ? ` (${c.company})` : ""}${c.position ? ` - ${c.position}` : ""}\n`;
          });
        }
      }

      if (context?.includeNeeds !== false) {
        const { data: needs } = await supabase
          .from("needs")
          .select("title, description, contacts(full_name)")
          .eq("tenant_id", tenantId)
          .eq("status", "active")
          .limit(10);

        if (needs?.length) {
          contextInfo += "\n\nAktywne potrzeby kontaktów:\n";
          needs.forEach((n: any, i) => {
            contextInfo += `${i + 1}. ${n.title} (${n.contacts?.full_name || "nieznany"})\n`;
          });
        }
      }

      if (context?.includeOffers !== false) {
        const { data: offers } = await supabase
          .from("offers")
          .select("title, description, contacts(full_name)")
          .eq("tenant_id", tenantId)
          .eq("status", "active")
          .limit(10);

        if (offers?.length) {
          contextInfo += "\n\nAktywne oferty kontaktów:\n";
          offers.forEach((o: any, i) => {
            contextInfo += `${i + 1}. ${o.title} (${o.contacts?.full_name || "nieznany"})\n`;
          });
        }
      }

      // Fetch upcoming consultations
      const { data: consultations } = await supabase
        .from("consultations")
        .select("scheduled_at, contacts(full_name), agenda")
        .eq("tenant_id", tenantId)
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(5);

      if (consultations?.length) {
        contextInfo += "\n\nNadchodzące konsultacje:\n";
        consultations.forEach((c: any, i) => {
          const date = new Date(c.scheduled_at).toLocaleDateString("pl-PL");
          contextInfo += `${i + 1}. ${date} - ${c.contacts?.full_name || "nieznany"}\n`;
        });
      }

      // Fetch pending tasks
      const { data: tasks } = await supabase
        .from("tasks")
        .select("title, due_date, priority")
        .eq("tenant_id", tenantId)
        .eq("status", "pending")
        .order("due_date", { ascending: true })
        .limit(10);

      if (tasks?.length) {
        contextInfo += "\n\nOczekujące zadania:\n";
        tasks.forEach((t, i) => {
          const due = t.due_date ? new Date(t.due_date).toLocaleDateString("pl-PL") : "brak terminu";
          contextInfo += `${i + 1}. ${t.title} (termin: ${due}, priorytet: ${t.priority})\n`;
        });
      }
    }

    const systemPrompt = `Jesteś AI Network Assistant - inteligentnym asystentem do zarządzania siecią kontaktów biznesowych i rekomendacji połączeń.

Twoje główne funkcje:
1. Odpowiadanie na pytania o kontakty i ich relacje
2. Sugerowanie potencjalnych połączeń między osobami
3. Pomaganie w przygotowaniu do spotkań
4. Identyfikowanie dopasowań między potrzebami a ofertami
5. Analiza zdrowia relacji i sugestie follow-upów

Odpowiadaj zawsze po polsku, chyba że użytkownik pyta w innym języku.
Bądź konkretny i pomocny. Gdy nie masz pewnych informacji, powiedz to wprost.

${contextInfo ? `\n--- KONTEKST UŻYTKOWNIKA ---${contextInfo}` : ""}`;

    console.log("Chat request with context length:", contextInfo.length);

    // Call Lovable AI Gateway with streaming
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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Przekroczono limit zapytań. Spróbuj ponownie za chwilę." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Wymagana płatność. Dodaj środki do swojego konta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Błąd komunikacji z AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Error in ai-chat:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
