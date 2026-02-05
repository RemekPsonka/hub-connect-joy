import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "zod";
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Zod schemas for request validation
const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(50000),
});

const requestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1, "At least one message required"),
  context: z.object({
    contactId: z.string().uuid().optional(),
    meetingId: z.string().uuid().optional(),
    includeContacts: z.boolean().optional(),
    includeNeeds: z.boolean().optional(),
    includeOffers: z.boolean().optional(),
  }).optional(),
});

type ChatMessage = z.infer<typeof chatMessageSchema>;
type ChatRequest = z.infer<typeof requestSchema>;

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

    // Verify authorization
    const authResult = await verifyAuth(req, supabase);
    if (isAuthError(authResult)) {
      return unauthorizedResponse(authResult, corsHeaders);
    }

    const tenantId = authResult.tenantId;
    console.log(`[ai-chat] Authorized user: ${authResult.user.id}, tenant: ${tenantId}`);

    // Zod validation
    const body = await req.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: validation.error.format() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, context } = validation.data;

    // Build context information
    let contextInfo = "";
    
    // ============= SEMANTIC SEARCH - Generate query embedding =============
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    let semanticContacts: any[] = [];

    if (OPENAI_API_KEY && lastUserMessage.length > 5) {
      console.log(`[ai-chat] Generating query embedding for semantic search...`);
      try {
        const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: lastUserMessage.substring(0, 8000),
            encoding_format: "float"
          }),
        });

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          const queryEmbedding = embeddingData.data?.[0]?.embedding;

          if (queryEmbedding) {
            console.log(`[ai-chat] Query embedding generated, performing semantic search...`);
            
            // Use search_all_hybrid for semantic search
            const { data: hybridResults, error: hybridError } = await supabase.rpc('search_all_hybrid', {
              p_query: lastUserMessage,
              p_query_embedding: `[${queryEmbedding.join(',')}]`,
              p_tenant_id: tenantId,
              p_types: ['contact'],
              p_fts_weight: 0.3,
              p_semantic_weight: 0.7,
              p_threshold: 0.25,
              p_limit: 30
            });

            if (!hybridError && hybridResults?.length > 0) {
              console.log(`[ai-chat] Semantic search found ${hybridResults.length} matches`);
              
              // Get full contact data
              const contactIds = hybridResults.map((r: any) => r.id);
              const { data: matchedContactData } = await supabase
                .from("contacts")
                .select(`
                  id, full_name, company, position, email, profile_summary, tags, notes,
                  companies (name, industry, description)
                `)
                .in('id', contactIds)
                .eq("is_active", true);

              // Merge with scores
              semanticContacts = (matchedContactData || []).map(contact => {
                const semanticResult = hybridResults.find((r: any) => r.id === contact.id);
                return {
                  ...contact,
                  semantic_score: semanticResult?.semantic_score || 0,
                  combined_score: semanticResult?.combined_score || 0
                };
              }).sort((a, b) => b.combined_score - a.combined_score);
            } else if (hybridError) {
              console.warn(`[ai-chat] Semantic search error:`, hybridError);
            }
          }
        }
      } catch (e) {
        console.warn(`[ai-chat] Semantic search failed, using fallback:`, e);
      }
    }

    // Add semantic matches to context (PRIORITY)
    if (semanticContacts.length > 0) {
      contextInfo += "\n\n🎯 KONTAKTY ZNALEZIONE SEMANTYCZNIE (AI zrozumiało znaczenie pytania):\n";
      semanticContacts.forEach((c, i) => {
        const industry = (c.companies as any)?.industry || 'brak';
        const tags = Array.isArray(c.tags) ? c.tags.join(', ') : 'brak';
        const score = c.combined_score?.toFixed(2) || '0';
        contextInfo += `
${i + 1}. [${score}] **${c.full_name}** - ${c.company || 'brak firmy'}
   Branża: ${industry}
   Stanowisko: ${c.position || 'brak'}
   Email: ${c.email || 'brak'}
   Tagi: ${tags}
   Profil: ${c.profile_summary?.substring(0, 300) || 'brak opisu'}
   Notatki: ${c.notes?.substring(0, 200) || 'brak'}
`;
      });
    }

    // Fetch relevant data for context using the verified tenant_id
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

    const systemPrompt = `Jesteś AI Network Assistant - inteligentnym asystentem do zarządzania siecią kontaktów biznesowych i rekomendacji połączeń.
Używasz WYSZUKIWANIA SEMANTYCZNEGO - AI rozumie znaczenie słów (np. "kurczak" ≈ "drób" ≈ "mięso").

Twoje główne funkcje:
1. Odpowiadanie na pytania o kontakty i ich relacje
2. Sugerowanie potencjalnych połączeń między osobami  
3. Pomaganie w przygotowaniu do spotkań
4. Identyfikowanie dopasowań między potrzebami a ofertami
5. Analiza zdrowia relacji i sugestie follow-upów

WAŻNE - WYSZUKIWANIE SEMANTYCZNE:
- Kontakty oznaczone 🎯 zostały znalezione przez AI semantycznie
- Wynik [0.85] oznacza 85% podobieństwa semantycznego do pytania
- Te kontakty są PRIORYTETOWE - analizuj je najpierw!

FORMATOWANIE ODPOWIEDZI:
- Używaj Markdown do formatowania: nagłówki (##, ###), listy (-, 1.), pogrubienie (**tekst**)
- Wyróżniaj kluczowe informacje pogrubieniem
- Używaj list dla wielu elementów
- Dziel długie odpowiedzi na sekcje z nagłówkami
- Bądź zwięzły, ale kompletny

Odpowiadaj zawsze po polsku, chyba że użytkownik pyta w innym języku.
Bądź konkretny i pomocny. Gdy nie masz pewnych informacji, powiedz to wprost.

${contextInfo ? `\n--- KONTEKST UŻYTKOWNIKA ---${contextInfo}` : ""}`;

    console.log(`[ai-chat] Context length: ${contextInfo.length}, semantic matches: ${semanticContacts.length}`);

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
