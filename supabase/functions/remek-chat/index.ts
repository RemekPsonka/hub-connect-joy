import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "zod";
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";
import { checkRateLimit, rateLimitedResponse } from "../_shared/rateLimit-upstash-rest.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Zod schema for request validation
const requestSchema = z.object({
  message: z.string().min(1, "Message is required").max(5000, "Message too long (max 5000 chars)"),
  sessionId: z.string().uuid().optional(),
  context: z.object({
    module: z.string().max(100).optional(),
    pageUrl: z.string().max(500).optional(),
    contactId: z.string().uuid().optional(),
    companyId: z.string().uuid().optional(),
  }).optional(),
});

type RemekRequest = z.infer<typeof requestSchema>;

const REMEK_SYSTEM_PROMPT = `Jesteś AI Remek — przyjazny asystent systemowy CRM do zarządzania kontaktami AI dla networkingu biznesowego.

## Twoja osobowość:
- Mówisz po polsku, zwracasz się per "Ty"
- Jesteś cierpliwy, pomocny i konkretny
- Używasz emoji umiarkowanie (✅ ❌ 💡 👉 ⚠️)
- Odpowiadasz krótko i na temat, ale potrafisz rozwinąć gdy trzeba
- Gdy nie znasz odpowiedzi — mówisz to wprost i proponujesz zgłoszenie błędu/sugestii

## Twoja wiedza:
Znasz cały system CRM od podszewki. Oto moduły które znasz:

### 📇 KONTAKTY (contacts)
- Dodawanie: przycisk "+" lub import CSV/LinkedIn/wizytówki OCR
- Pola: full_name (wymagane), email, phone, company, position, linkedin_url, city, group, notes
- Wyszukiwanie: globalne (Ctrl+K) — semantyczne + FTS hybrydowe
- Grupy kontaktów z polityką odświeżania (quarterly/monthly)
- Profil AI: generowany automatycznie z enrichment (Perplexity + Firecrawl)
- Agent AI per kontakt: pamięć agenta, key_facts, relationships
- Duplikaty: automatyczne wykrywanie

### 🏭 FIRMY (companies)
- Auto-enrichment: KRS API, CEIDG, Perplexity, scan WWW (Firecrawl)
- Profil AI: 16-sekcyjna synteza
- Grupy kapitałowe, dane finansowe za 3 lata

### 📋 WYWIADY BIZNESOWE (BI)
- Agent AI prowadzi interaktywny wywiad z kontaktem
- Sekcje: cele, wyzwania, zainteresowania, notatki
- AI generuje: missing_info, needs_offers, task_proposals, connection_recommendations

### 🤝 KONSULTACJE (consultations)
- Spotkania doradcze z kontaktami
- AI generuje preparation_brief przed konsultacją

### 📅 SPOTKANIA GRUPOWE (meetings)
- Spotkania networkingowe z wieloma uczestnikami
- AI generuje rekomendacje "kogo z kim połączyć"

### 🔄 POTRZEBY I OFERTY (needs & offers)
- Vector embeddings + FTS do matching
- AI dopasowuje need↔offer z similarity_score

### ✅ ZADANIA (tasks)
- Statusy: pending → in_progress → completed
- Priorytety: low, medium, high, urgent
- Kategorie z kolorami i ikonami

### 🛡️ UBEZPIECZENIA (insurance)
- Pipeline odnowień: T-minus system
- Produkty, polisy, produkcja, oceny ryzyka AI

### 🧠 AI CHAT
- Główny chat: /ai-chat — rozmowa z AI o całej sieci kontaktów
- Master Agent: zna całą sieć, klastry branżowe, relacje
- RÓŻNICA: AI Chat analizuje DANE użytkownika, Remek pomaga z SYSTEMEM

### 🔍 WYSZUKIWANIE
- Globalne: Ctrl+K → SemanticSearchModal
- Hybrydowe: FTS + semantic embeddings

### 📊 DASHBOARD
- Statystyki sieci, AI Recommendations, Daily Serendipity, Relationship Health

### 🌐 SIEĆ (network)
- Wizualizacja grafu kontaktów (sigma.js)
- Connections z siłą relacji

### ⚙️ USTAWIENIA (settings)
- Grupy kontaktów, kategorie zadań, 2FA/MFA, polityka haseł

### 👥 HANDLOWCY (representatives)
- Przedstawiciele z przypisanymi kontaktami

### 🐛 ZGŁASZANIE BŁĘDÓW (bug_reports)
- Formularz z screenshot automatycznym

## Zasady odpowiadania:

1. ZAWSZE odpowiadaj po polsku
2. Gdy użytkownik pyta "jak coś zrobić" — daj KONKRETNE kroki:
   - Krok 1: Idź do [miejsce w menu]
   - Krok 2: Kliknij [przycisk]
   - Krok 3: Wypełnij [pole]
3. Gdy użytkownik pyta "gdzie coś jest" — podaj DOKŁADNĄ ścieżkę w menu
4. Gdy pytanie dotyczy błędu/problemu — najpierw sprawdź czy to znany problem
5. Gdy NIE ZNASZ odpowiedzi — powiedz wprost: "Nie mam informacji o tym. Chcesz zgłosić to jako sugestię lub błąd?"
6. Podpowiadaj proaktywnie: "Czy wiesz, że możesz też..."
7. Jeśli dostępny jest kontekst (moduł, strona) — odpowiadaj w tym kontekście

## Znane problemy systemu:
- Sigma.js może zamrozić UI przy >500 kontaktach na grafie sieci
- Import LinkedIn może nie rozpoznać wszystkich formatów CSV
- Edge Functions mają timeout 60s — długie operacje mogą się urywać
- Brak push notifications — sugestie AI generowane na żądanie`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Zod validation BEFORE auth check
    const body = await req.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: validation.error.format() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { message, context, sessionId: rawSessionId } = validation.data;
    let sessionId = rawSessionId;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authResult = await verifyAuth(req, supabase);
    if (isAuthError(authResult)) {
      return unauthorizedResponse(authResult, corsHeaders);
    }

    const { tenantId, directorId, assistantId } = authResult;

    // Sprint 01 — rate limit 30/min
    const rl = await checkRateLimit(authResult.user.id, "remek-chat", 30, 60);
    if (!rl.ok) return rateLimitedResponse(corsHeaders);

    // ============= RATE LIMITING (TEMPORARILY DISABLED) =============
    // const rateLimit = await checkRateLimit(
    //   `remek:${authResult.user.id}`,
    //   { max: 50, window: 3600 }  // 50 questions per hour
    // );
    // if (!rateLimit.allowed) {
    //   return rateLimitResponse(rateLimit.resetAt, corsHeaders);
    // }
    // ============= END RATE LIMITING =============

    // Generate session ID if not provided
    if (!sessionId) {
      sessionId = crypto.randomUUID();
    }

    // 1. Search knowledge base for relevant articles
    const searchTerms = message.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    
    const { data: articles } = await supabase
      .from("remek_knowledge_base")
      .select("title, content, module, category")
      .or(`is_global.eq.true,tenant_id.eq.${tenantId}`)
      .or(
        searchTerms.length > 0 
          ? `keywords.cs.{${searchTerms.join(",")}},fts.plfts.${searchTerms.join(" | ")}`
          : "is_global.eq.true"
      )
      .limit(5);

    // 2. Get conversation history (last 10 messages)
    const { data: history } = await supabase
      .from("remek_conversations")
      .select("role, message")
      .eq("session_id", sessionId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true })
      .limit(10);

    // 3. Save user message
    await supabase.from("remek_conversations").insert({
      tenant_id: tenantId,
      director_id: directorId || null,
      assistant_id: assistantId || null,
      session_id: sessionId,
      role: "user",
      message: message,
      context: context || {},
    });

    // 4. Build messages for AI
    const messages: Array<{ role: string; content: string }> = [];

    // System message with context
    let systemContent = REMEK_SYSTEM_PROMPT;
    
    if (articles && articles.length > 0) {
      systemContent += "\n\n## Znaleziona wiedza (użyj jeśli pasuje do pytania):\n";
      articles.forEach((article) => {
        systemContent += `\n### ${article.title}\n${article.content}\n`;
      });
    }

    if (context?.module) {
      systemContent += `\n\n## Kontekst użytkownika:\nUżytkownik jest obecnie w module: ${context.module}`;
      if (context.pageUrl) {
        systemContent += `\nURL strony: ${context.pageUrl}`;
      }
    }

    messages.push({ role: "system", content: systemContent });

    // Add conversation history
    if (history && history.length > 0) {
      history.forEach((msg) => {
        messages.push({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.message,
        });
      });
    }

    // Add current user message
    messages.push({ role: "user", content: message });

    // 5. Call Lovable AI Gateway
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: messages,
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices?.[0]?.message?.content || 
      "Przepraszam, wystąpił problem z odpowiedzią. Spróbuj ponownie.";

    // 6. Save assistant response
    const { data: savedMessage } = await supabase
      .from("remek_conversations")
      .insert({
        tenant_id: tenantId,
        director_id: directorId || null,
        assistant_id: assistantId || null,
        session_id: sessionId,
        role: "assistant",
        message: assistantMessage,
        context: context || {},
      })
      .select("id")
      .single();

    // 7. Return response
    return new Response(
      JSON.stringify({
        message: assistantMessage,
        messageId: savedMessage?.id,
        sessionId: sessionId,
        suggestedArticles: articles?.map((a) => ({ title: a.title, module: a.module })),
        canReportBug: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Remek chat error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ 
        error: "Przepraszam, wystąpił błąd. Spróbuj ponownie za chwilę.",
        details: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
