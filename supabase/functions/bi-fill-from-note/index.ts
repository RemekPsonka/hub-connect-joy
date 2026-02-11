import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BI_SECTIONS_SCHEMA = {
  type: "object",
  properties: {
    section_a_basic: {
      type: "object",
      properties: {
        branza: { type: "array", items: { type: "string" } },
        email_bezposredni: { type: "string" },
        telefon_prywatny: { type: "string" },
        www: { type: "string" },
        nip: { type: "string" },
        zrodlo_kontaktu: { type: "string" },
        status_relacji: { type: "string", enum: ["nowy", "polecony", "powracajacy", "znajomy", "klient"] },
        sila_relacji: { type: "number" },
      },
      additionalProperties: false,
    },
    section_c_company_profile: {
      type: "object",
      properties: {
        zakres_dzialalnosci: { type: "string" },
        rynki: { type: "string" },
        produkty_uslugi: { type: "array", items: { type: "string" } },
        wartosc_dla_klientow: { type: "string" },
        powod_dumy: { type: "string" },
        tytul_rola: { type: "string" },
        ceo_operacyjny: { type: "boolean" },
        poziom_decyzyjnosci: { type: "number" },
        procent_udzialow: { type: "number" },
        wspolnicy: { type: "boolean" },
        inwestor_finansowy: { type: "boolean" },
      },
      additionalProperties: false,
    },
    section_d_scale: {
      type: "object",
      properties: {
        przychody_ostatni_rok: { type: "string" },
        przychody_plan: { type: "string" },
        pracownicy: { type: "string" },
        pojazdy: { type: "number" },
        liczba_spolek: { type: "number" },
        inne_branze: { type: "array", items: { type: "string" } },
        kraje_dzialalnosci: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
    },
    section_f_strategy: {
      type: "object",
      properties: {
        cele_strategiczne: { type: "string" },
        wplyw_makro: { type: "string" },
        szanse: { type: "string" },
        ryzyka: { type: "string" },
      },
      additionalProperties: false,
    },
    section_g_needs: {
      type: "object",
      properties: {
        top3_priorytety: { type: "array", items: { type: "string" } },
        najwieksze_wyzwanie: { type: "string" },
        czego_poszukuje: { type: "array", items: { type: "string" } },
        jakich_kontaktow: { type: "string" },
        jakich_rekomendacji: { type: "string" },
        grupa_docelowa: { type: "string" },
      },
      additionalProperties: false,
    },
    section_h_investments: {
      type: "object",
      properties: {
        ostatnie_typ: { type: "string" },
        ostatnie_kwota: { type: "string" },
        planowane_projekty: { type: "string" },
        status: { type: "string", enum: ["idea", "w_trakcie", "loi", "closed"] },
      },
      additionalProperties: false,
    },
    section_l_personal: {
      type: "object",
      properties: {
        miasto_bazowe: { type: "string" },
        czeste_lokalizacje: { type: "array", items: { type: "string" } },
        hobby: { type: "array", items: { type: "string" } },
        cele_prywatne: { type: "string" },
        zasady: { type: "string" },
      },
      additionalProperties: false,
    },
    section_m_organizations: {
      type: "object",
      properties: {
        fundacje_csr: { type: "array", items: { type: "string" } },
        organizacje_branzowe: { type: "array", items: { type: "string" } },
        stowarzyszenia: { type: "array", items: { type: "string" } },
        inne: { type: "string" },
      },
      additionalProperties: false,
    },
    section_n_followup: {
      type: "object",
      properties: {
        pytania_klienta: { type: "string" },
        kolejne_spotkanie: { type: "string" },
        doslanie_dokumentow: { type: "string" },
        ustalenia_koncowe: { type: "string" },
      },
      additionalProperties: false,
    },
    ai_notes: { type: "string" },
  },
  required: ["ai_notes"],
  additionalProperties: false,
};

async function extractFromNote(note: string, contactName: string, companyName: string | null, apiKey: string) {
  const systemPrompt = `Jesteś ekspertem od analizy notatek ze spotkań biznesowych. 
Twoim zadaniem jest wyekstrahowanie ustrukturyzowanych danych z notatki i zmapowanie ich na sekcje formularza Business Interview.

Kontekst:
- Osoba: ${contactName}
- Firma: ${companyName || 'nieznana'}

Analizuj notatkę i wyciągnij TYLKO te dane, które są wyraźnie wspomniane w notatce.
NIE wymyślaj danych. Jeśli czegoś nie ma w notatce, nie uwzględniaj tego pola.
W polu ai_notes napisz krótko co udało się wyciągnąć i czego brakuje.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Notatka ze spotkania:\n\n${note}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "fill_bi_sections",
          description: "Fill Business Interview sections with extracted data from the meeting note",
          parameters: BI_SECTIONS_SCHEMA,
        },
      }],
      tool_choice: { type: "function", function: { name: "fill_bi_sections" } },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("AI extraction error:", response.status, text);
    throw new Error(`AI extraction failed: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in AI response");

  return JSON.parse(toolCall.function.arguments);
}

async function enrichWithPerplexity(contactName: string, companyName: string | null, extractedData: any, perplexityKey: string) {
  if (!companyName && !contactName) return null;

  const searchTarget = companyName || contactName;
  const query = companyName
    ? `${companyName} Polska firma: branża, lokalizacja, przychody, liczba pracowników, produkty/usługi, właściciel, strona www, NIP`
    : `${contactName} biznesmen Polska: firma, branża, stanowisko, działalność`;

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${perplexityKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: "Jesteś asystentem wyszukującym informacje biznesowe o polskich firmach i osobach. Odpowiadaj zwięźle, podając fakty. Jeśli nie znajdziesz informacji, napisz to wprost.",
          },
          { role: "user", content: query },
        ],
        search_recency_filter: "year",
      }),
    });

    if (!response.ok) {
      console.error("Perplexity error:", response.status);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.error("Perplexity fetch error:", e);
    return null;
  }
}

async function synthesize(extractedData: any, perplexityData: string | null, contactName: string, companyName: string | null, apiKey: string) {
  if (!perplexityData) return extractedData;

  const systemPrompt = `Jesteś ekspertem od uzupełniania formularzy Business Interview.
Masz dane wyekstrahowane z notatki oraz dodatkowe informacje z internetu.

Twoim zadaniem jest UZUPEŁNIENIE brakujących pól w danych z notatki, korzystając z danych z internetu.
ZASADY:
- NIE nadpisuj danych już wyekstrahowanych z notatki
- Dodawaj TYLKO sprawdzone informacje z internetu
- Dla pól tablicowych (arrays) - dołącz nowe elementy
- W ai_notes dodaj informację co zostało uzupełnione z internetu

Osoba: ${contactName}
Firma: ${companyName || 'nieznana'}

Dane z notatki (JSON):
${JSON.stringify(extractedData, null, 2)}

Dane z internetu:
${perplexityData}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Uzupełnij dane z notatki o informacje z internetu i zwróć pełny wynik." },
      ],
      tools: [{
        type: "function",
        function: {
          name: "fill_bi_sections",
          description: "Fill Business Interview sections with merged data",
          parameters: BI_SECTIONS_SCHEMA,
        },
      }],
      tool_choice: { type: "function", function: { name: "fill_bi_sections" } },
    }),
  });

  if (!response.ok) {
    console.error("Synthesis error:", response.status);
    return extractedData;
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return extractedData;

  try {
    return JSON.parse(toolCall.function.arguments);
  } catch {
    return extractedData;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { note, contactName, companyName, existingData } = await req.json();

    if (!note || !contactName) {
      return new Response(JSON.stringify({ error: "note and contactName are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`[bi-fill-from-note] Processing note for ${contactName}, company: ${companyName || 'unknown'}`);

    // Step 1: Extract structured data from note
    console.log("[bi-fill-from-note] Step 1: Extracting from note...");
    const extractedData = await extractFromNote(note, contactName, companyName, LOVABLE_API_KEY);
    console.log("[bi-fill-from-note] Extracted sections:", Object.keys(extractedData).filter(k => k !== 'ai_notes'));

    // Step 2: Enrich with Perplexity (if key available)
    let perplexityData: string | null = null;
    if (PERPLEXITY_API_KEY) {
      console.log("[bi-fill-from-note] Step 2: Enriching with Perplexity...");
      perplexityData = await enrichWithPerplexity(contactName, companyName, extractedData, PERPLEXITY_API_KEY);
      if (perplexityData) {
        console.log("[bi-fill-from-note] Perplexity data received, length:", perplexityData.length);
      }
    } else {
      console.log("[bi-fill-from-note] Step 2: Skipping Perplexity (no API key)");
    }

    // Step 3: Synthesize if we have Perplexity data
    let finalData = extractedData;
    if (perplexityData) {
      console.log("[bi-fill-from-note] Step 3: Synthesizing...");
      finalData = await synthesize(extractedData, perplexityData, contactName, companyName, LOVABLE_API_KEY);
    }

    console.log("[bi-fill-from-note] Done. Final sections:", Object.keys(finalData).filter(k => k !== 'ai_notes'));

    return new Response(JSON.stringify({ success: true, data: finalData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[bi-fill-from-note] Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
