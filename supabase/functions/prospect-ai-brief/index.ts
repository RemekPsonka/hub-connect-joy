import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function queryPerplexity(apiKey: string, prompt: string, useRecencyFilter = false): Promise<string> {
  const body: Record<string, unknown> = {
    model: "sonar-pro",
    messages: [
      { role: "system", content: "Odpowiadaj po polsku. Podaj konkretne fakty, dane, liczby, cytaty. Nie spekuluj – pisz tylko to co znajdziesz. Jeśli znajdziesz cokolwiek – napisz, nawet drobny fakt." },
      { role: "user", content: prompt },
    ],
  };

  if (useRecencyFilter) {
    body.search_recency_filter = "year";
  }

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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
    const body = await req.json();
    const source = body.source || "prospect";
    const prospectId = body.prospectId;
    const dealContactId = body.dealContactId;

    if (source === "prospect" && !prospectId) throw new Error("Brak prospectId");
    if (source === "deal_contact" && !dealContactId) throw new Error("Brak dealContactId");

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!PERPLEXITY_API_KEY) throw new Error("PERPLEXITY_API_KEY not configured");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let fullName = "";
    let company = "";
    let position = "";
    let industry = "";

    if (source === "deal_contact") {
      // Fetch deal_team_contact + joined contact
      const { data: dtc, error: dtcErr } = await supabase
        .from("deal_team_contacts")
        .select("id, contact_id")
        .eq("id", dealContactId)
        .single();
      if (dtcErr || !dtc) throw new Error("Nie znaleziono kontaktu dealowego");

      const { data: contact, error: cErr } = await supabase
        .from("contacts")
        .select("full_name, company, position, industry")
        .eq("id", dtc.contact_id)
        .single();
      if (cErr || !contact) throw new Error("Nie znaleziono kontaktu CRM");

      fullName = contact.full_name;
      company = contact.company || "";
      position = contact.position || "";
      industry = contact.industry || "";
    } else {
      const { data: prospect, error: fetchErr } = await supabase
        .from("meeting_prospects")
        .select("*")
        .eq("id", prospectId)
        .single();
      if (fetchErr || !prospect) throw new Error("Nie znaleziono prospekta");

      fullName = prospect.full_name;
      company = prospect.company || "";
      position = prospect.position || "";
      industry = prospect.industry || "";
    }

    // ── 4 parallel Perplexity queries ──

    const personProfessionalPrompt = `Znajdź WSZYSTKIE informacje o osobie: ${fullName}${company ? `, firma: ${company}` : ""}${position ? `, stanowisko: ${position}` : ""}.

Szukaj w KRS, CEIDG, LinkedIn, Golden.com, rejestrach publicznych.

Podaj:
- Kim jest ta osoba, jaką pełni funkcję w firmie ${company || "(nieznana)"}
- Historia kariery — poprzednie stanowiska, firmy
- Inne firmy które posiada, współtworzy, w których zasiada w zarządzie lub radzie nadzorczej
- Udziały, akcje, powiązania kapitałowe
- Wykształcenie, uczelnia, kierunek (jeśli dostępne)
- Nagrody biznesowe, wyróżnienia, rankingi (np. Forbes, Diamenty)

Pisz konkretnie, krótko, po polsku. Każdy znaleziony fakt jest ważny.`;

    const personPrivatePrompt = `Znajdź informacje PRYWATNE i MEDIALNE o osobie: ${fullName}${company ? ` (firma: ${company})` : ""}.

Szukaj fraz typu: "${fullName} wywiad", "${fullName} pasja", "${fullName} fundacja", "${fullName} hobby", "${fullName} rodzina", "${fullName} sport", "${fullName} charytatywnie".

Podaj WSZYSTKO co znajdziesz:
- Pasje, hobby, zainteresowania (sport, podróże, motoryzacja, sztuka, wino, etc.)
- Rodzina: partner/żona/mąż, dzieci — TYLKO jeśli publicznie dostępne (wywiady, social media)
- Organizacje: izby handlowe, stowarzyszenia branżowe, kluby biznesowe (Rotary, Lions, BNI, YPO, EO)
- Fundacje, działalność charytatywna, CSR, patronaty
- Wywiady — cytaty, wypowiedzi w mediach, podcasty, konferencje
- Social media: aktywność na LinkedIn, Twitter/X, Instagram (jeśli publiczne)
- Inne ciekawe fakty osobiste

Każdy "smaczek" jest cenny. Pisz po polsku, konkretnie.`;

    const companyProfilePrompt = company
      ? `Znajdź SZCZEGÓŁOWE informacje o firmie: ${company}${industry ? ` (branża: ${industry})` : ""}.

Szukaj w KRS, CEIDG, GUS, stronach WWW firmy, rejestrach.

Podaj:
- Czym się zajmuje firma, główna działalność, produkty/usługi
- Branża i specyfika (produkcja/handel/usługi/budowlanka/IT/finanse)
- Lokalizacje: siedziba główna, oddziały, filie, magazyny, hale produkcyjne, biura regionalne
- Majątek: nieruchomości, flota pojazdów, maszyny, linie produkcyjne, infrastruktura IT
- Przychody, zysk, zatrudnienie (ostatnie dostępne dane)
- Główni klienci, kontrahenci, partnerzy handlowi
- Strona WWW — krótki opis z niej
- Forma prawna, data założenia, kapitał zakładowy
- Spółki powiązane, grupa kapitałowa, spółki-córki

Pisz konkretnie, po polsku. Każdy fakt jest ważny.`
      : null;

    const companyNewsPrompt = company
      ? `Znajdź NAJNOWSZE informacje i aktualności o firmie: ${company}${industry ? ` (branża: ${industry})` : ""}.

Szukaj notek prasowych, artykułów, wpisów z ostatnich 2 lat.

Podaj:
- Notki prasowe, komunikaty, artykuły w mediach branżowych
- Przetargi publiczne (TED, BIP, przetargi.info) — wygrane, złożone oferty
- Inwestycje: nowe zakłady, rozbudowa, akwizycje, fuzje (M&A)
- Nagrody, wyróżnienia, rankingi branżowe (Gazele Biznesu, Diamenty Forbesa, etc.)
- Zmiany w KRS: nowi wspólnicy, podwyższenie kapitału, zmiany w zarządzie
- Eventy: targi, konferencje, sponsoring, organizacja wydarzeń
- Kontrakty, umowy ramowe, nowi klienci
- Problemy: spory sądowe, kontrole, kary (jeśli publiczne)

Pisz konkretnie, po polsku. Podaj daty jeśli znane.`
      : null;

    const [personProfessional, personPrivate, companyProfile, companyNews] = await Promise.all([
      queryPerplexity(PERPLEXITY_API_KEY, personProfessionalPrompt),
      queryPerplexity(PERPLEXITY_API_KEY, personPrivatePrompt),
      companyProfilePrompt
        ? queryPerplexity(PERPLEXITY_API_KEY, companyProfilePrompt)
        : Promise.resolve("Brak nazwy firmy — nie wyszukiwano."),
      companyNewsPrompt
        ? queryPerplexity(PERPLEXITY_API_KEY, companyNewsPrompt, true)
        : Promise.resolve("Brak nazwy firmy — nie wyszukiwano."),
    ]);

    // ── Synthesis with Lovable AI ──

    const synthesisPrompt = `Jesteś doświadczonym brokerem ubezpieczeniowym przygotowującym się do PIERWSZEGO spotkania z potencjalnym klientem. To Twoja jedyna szansa na dobre pierwsze wrażenie — musisz wiedzieć o nim jak najwięcej.

DANE O OSOBIE:
Imię i nazwisko: ${fullName}
Stanowisko: ${position || "brak danych"}
Firma: ${company || "brak danych"}
Branża: ${industry || "brak danych"}

WYNIKI WYSZUKIWANIA — PROFIL ZAWODOWY OSOBY:
${personProfessional}

WYNIKI WYSZUKIWANIA — ŻYCIE PRYWATNE I MEDIA:
${personPrivate}

WYNIKI WYSZUKIWANIA — PROFIL FIRMY:
${companyProfile}

WYNIKI WYSZUKIWANIA — AKTUALNOŚCI FIRMY:
${companyNews}

Na podstawie WSZYSTKICH powyższych danych przygotuj SZCZEGÓŁOWY BRIEF PRZED SPOTKANIEM w formacie markdown. Uwzględnij KAŻDY znaleziony fakt — nawet drobny "smaczek" może być kluczowy w budowaniu relacji.

Struktura briefu:

## 👤 Osoba — ${fullName}

### Kariera i rola
Kim jest, jaką pełni funkcję, historia kariery, poprzednie stanowiska.

### Inne firmy i zarządy
Jakie inne firmy posiada lub współtworzy, zarządy, rady nadzorcze, powiązania kapitałowe.

### Pasje i zainteresowania
Hobby, sport, podróże, motoryzacja, kolekcje — wszystko co znaleziono.

### Rodzina
Partner/żona/mąż, dzieci — TYLKO jeśli publicznie dostępne z wywiadów lub social media. Jeśli brak danych — napisz "brak publicznych informacji".

### Organizacje i fundacje
Izby handlowe, stowarzyszenia, kluby biznesowe (Rotary, Lions, BNI, YPO), fundacje, CSR, patronaty.

### Wypowiedzi medialne
Cytaty z wywiadów, wypowiedzi na konferencjach, podcasty — dosłowne cytaty jeśli dostępne.

## 🏢 Firma — ${company || "brak danych"}

### Profil i działalność
Czym się zajmuje, produkty/usługi, forma prawna, data założenia.

### Lokalizacje i majątek
Siedziba, oddziały, magazyny, hale, flota, maszyny, infrastruktura. Jeśli budowlanka — plac maszynowy. Jeśli produkcja — linie produkcyjne. Jeśli handel — magazyny i logistyka.

### Skala biznesu
Przychody, zatrudnienie, kapitał. Grupa kapitałowa, spółki powiązane.

### Aktualności
Ostatnie inwestycje, przetargi, notki prasowe, nagrody, zmiany w KRS, nowi klienci, kontrakty. Podaj daty.

## 🛡️ Kontekst ubezpieczeniowy

Na co zwrócić uwagę jako broker — KONKRETNE ryzyka pasujące do tej firmy i branży:
- Mienie (budynki, maszyny, zapasy)
- OC działalności / OC zawodowe
- Flota (jeśli posiada pojazdy)
- Cyber (jeśli IT/dane/e-commerce)
- D&O (jeśli zarząd/rada nadzorcza)
- Pracownicy (grupowe, NNW)
- Cargo/transport (jeśli logistyka)
- CAR/EAR (jeśli budowlanka)
- Gwarancje ubezpieczeniowe (jeśli przetargi)
- Key person (jeśli firma zależna od właściciela)

## 💬 Tematy do rozmowy

5-7 konkretnych tematów do naturalnego nawiązania na spotkaniu. Powiązane z tym co wiesz o osobie i firmie:
- Ostatnie sukcesy firmy
- Pasje i zainteresowania (ice-breaker)
- Wspólne organizacje lub znajomi
- Branżowe wyzwania
- Plany rozwoju / inwestycje
- Rodzina / dzieci (jeśli znane — delikatnie)
- Aktualne wydarzenia w branży

Pisz zwięźle ale KOMPLETNIE, po polsku. Każdy znaleziony fakt MUSI znaleźć się w briefie. Jeśli czegoś nie znaleziono — napisz "brak danych", nie wymyślaj.`;

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

    const updateTable = source === "deal_contact" ? "deal_team_contacts" : "meeting_prospects";
    const updateId = source === "deal_contact" ? dealContactId : prospectId;

    const { error: updateErr } = await supabase
      .from(updateTable)
      .update({
        ai_brief: brief,
        ai_brief_generated_at: new Date().toISOString(),
      })
      .eq("id", updateId);

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
