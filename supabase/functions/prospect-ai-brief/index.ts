import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function queryPerplexity(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        { role: "system", content: "Odpowiadaj po polsku. Podaj konkretne fakty, dane, liczby. Nie spekuluj – pisz tylko to co znajdziesz." },
        { role: "user", content: prompt },
      ],
      search_recency_filter: "year",
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("Perplexity error:", res.status, t);
    return `Brak danych (błąd Perplexity: ${res.status})`;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "Brak danych";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prospectId } = await req.json();
    if (!prospectId) throw new Error("Brak prospectId");

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!PERPLEXITY_API_KEY) throw new Error("PERPLEXITY_API_KEY not configured");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch prospect
    const { data: prospect, error: fetchErr } = await supabase
      .from("meeting_prospects")
      .select("*")
      .eq("id", prospectId)
      .single();

    if (fetchErr || !prospect) throw new Error("Nie znaleziono prospekta");

    const fullName = prospect.full_name;
    const company = prospect.company || "";
    const position = prospect.position || "";
    const industry = prospect.industry || "";

    // Step 1: Perplexity — parallel queries
    const personPrompt = `Znajdź informacje o osobie: ${fullName}${company ? `, firma: ${company}` : ""}${position ? `, stanowisko: ${position}` : ""}.
Podaj:
- Kim jest ta osoba, jakie pełni funkcje
- Jakie inne firmy posiada lub współtworzy
- Obecność medialna, wywiady, artykuły
- Pasje, zainteresowania, działalność społeczna
- Rodzina (jeśli publiczne informacje)
Pisz konkretnie, krótko, po polsku.`;

    const companyPrompt = company
      ? `Znajdź informacje o firmie: ${company}${industry ? ` (branża: ${industry})` : ""}.
Podaj:
- Czym się zajmuje firma, główna działalność
- Branża i specyfika (produkcja/handel/usługi/budowlanka)
- Lokalizacje: siedziba, oddziały, magazyny, hale produkcyjne
- Majątek: nieruchomości, flota, maszyny, linie produkcyjne
- Przychody, zatrudnienie (jeśli dostępne)
- Kontrakty, przetargi, główni klienci
- Strona WWW i krótki opis z niej
Pisz konkretnie, krótko, po polsku.`
      : null;

    const [personInfo, companyInfo] = await Promise.all([
      queryPerplexity(PERPLEXITY_API_KEY, personPrompt),
      companyPrompt
        ? queryPerplexity(PERPLEXITY_API_KEY, companyPrompt)
        : Promise.resolve("Brak nazwy firmy — nie wyszukiwano."),
    ]);

    // Step 2: Lovable AI — synthesis
    const synthesisPrompt = `Jesteś doświadczonym brokerem ubezpieczeniowym przygotowującym się do pierwszego spotkania z potencjalnym klientem.

DANE O OSOBIE:
Imię i nazwisko: ${fullName}
Stanowisko: ${position || "brak danych"}
Firma: ${company || "brak danych"}
Branża: ${industry || "brak danych"}

WYNIKI WYSZUKIWANIA O OSOBIE:
${personInfo}

WYNIKI WYSZUKIWANIA O FIRMIE:
${companyInfo}

Na podstawie powyższych danych przygotuj KRÓTKI BRIEF PRZED SPOTKANIEM w formacie markdown. Brief ma pomóc Ci być przygotowanym — wiedzieć kim jest klient, co robi, co posiada, jakie mogą być jego potrzeby ubezpieczeniowe. NIE sprzedajesz — przygotowujesz się.

Struktura briefu:

## 👤 Osoba
2-3 zdania: kim jest, jaką pełni funkcję, pasje/rodzina/zainteresowania, inne firmy.

## 🏢 Firma
Działalność, branża, lokalizacje (siedziba, oddziały, magazyny), majątek (nieruchomości, flota, maszyny), skala działalności. Jeśli budowlanka — wspomnij o kontraktach. Jeśli handel — o łańcuchu dostaw. Jeśli produkcja — o liniach i halach.

## 🛡️ Kontekst ubezpieczeniowy
Na co zwrócić uwagę jako broker: mienie, OC działalności, OC zawodowe, flota, cyber, D&O, pracownicy (grupowe), cargo, budowlanka (CAR/EAR), gwarancje. Wymień KONKRETNE ryzyka pasujące do tej firmy i branży.

## 💬 Tematy do rozmowy
3-5 tematów do naturalnego nawiązania na spotkaniu — powiązane z tym co wiesz o osobie i firmie. Np. ostatnie inwestycje, ekspansja, branżowe wyzwania, wspólne zainteresowania.

Pisz zwięźle, po polsku, konkretnie. Jeśli czegoś nie wiesz — napisz "brak danych", nie wymyślaj.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: synthesisPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("Lovable AI error:", aiRes.status, errText);

      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Zbyt wiele zapytań AI. Spróbuj ponownie za chwilę." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Brak środków na AI. Doładuj konto." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const brief = aiData.choices?.[0]?.message?.content || "Nie udało się wygenerować briefu.";

    // Step 3: Save to DB
    const { error: updateErr } = await supabase
      .from("meeting_prospects")
      .update({
        ai_brief: brief,
        ai_brief_generated_at: new Date().toISOString(),
      })
      .eq("id", prospectId);

    if (updateErr) {
      console.error("DB update error:", updateErr);
      throw new Error("Błąd zapisu briefu do bazy");
    }

    return new Response(JSON.stringify({ brief }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("prospect-ai-brief error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
