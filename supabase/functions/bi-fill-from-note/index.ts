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
        branza_tagi: { type: "array", items: { type: "string" } },
        email_bezposredni: { type: "string" },
        telefon_prywatny: { type: "string" },
        www: { type: "string" },
        nip: { type: "string" },
        email_asystenta: { type: "string" },
        telefon_asystenta: { type: "string" },
        zrodlo_kontaktu: { type: "string" },
        status_relacji: { type: "string", enum: ["nowy", "polecony", "powracajacy", "znajomy", "klient"] },
        sila_relacji: { type: "number" },
        rozważa_aplikacje_cc: { type: "string", enum: ["tak", "nie", "nie_wiem"] },
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
        lista_wspolnikow: {
          type: "array",
          items: {
            type: "object",
            properties: {
              nazwa: { type: "string" },
              procent: { type: "number" },
            },
            required: ["nazwa"],
            additionalProperties: false,
          },
        },
        inwestor_finansowy: { type: "boolean" },
      },
      additionalProperties: false,
    },
    section_d_scale: {
      type: "object",
      properties: {
        przychody_ostatni_rok: { type: "string", enum: ["do_10mln", "10_50mln", "50_100mln", "100_300mln", "300_500mln", "500mln_1mld", "powyzej_1mld"] },
        przychody_plan: { type: "string", enum: ["do_10mln", "10_50mln", "50_100mln", "100_300mln", "300_500mln", "500mln_1mld", "powyzej_1mld"] },
        ebitda_ostatni: { type: "string" },
        ebitda_plan: { type: "string" },
        pracownicy: { type: "string" },
        pojazdy: { type: "number" },
        liczba_spolek: { type: "number" },
        glowna_vs_holding: { type: "boolean" },
        inne_branze: { type: "array", items: { type: "string" } },
        skala_pl: { type: "string" },
        skala_zagranica: { type: "string" },
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
        czego_poszukuje: { type: "array", items: { type: "string", enum: ["klienci", "ekspansja", "kapital", "ma", "inwestor", "hr", "optymalizacja", "technologia"] } },
        jakich_kontaktow: { type: "string" },
        jakich_rekomendacji: { type: "string" },
        grupa_docelowa: { type: "string" },
        horyzont_czasowy: { type: "string", enum: ["0-6", "6-18", "18+"] },
        priorytet: { type: "string", enum: ["niski", "sredni", "wysoki"] },
      },
      additionalProperties: false,
    },
    section_h_investments: {
      type: "object",
      properties: {
        ostatnie_typ: { type: "string" },
        ostatnie_kwota: { type: "string" },
        ostatnie_doradcy: { type: "string" },
        ostatnie_decydenci: { type: "string" },
        planowane_projekty: { type: "string" },
        czego_brakuje: { type: "string" },
        czego_brakuje_typ: { type: "array", items: { type: "string", enum: ["kontakt", "finansowanie", "udzialowiec", "vendor"] } },
        status: { type: "string", enum: ["idea", "w_trakcie", "loi", "closed"] },
      },
      additionalProperties: false,
    },
    section_j_value_for_cc: {
      type: "object",
      properties: {
        kontakty: { type: "string" },
        knowhow: { type: "string" },
        zasoby: { type: "string" },
      },
      additionalProperties: false,
    },
    section_k_engagement: {
      type: "object",
      properties: {
        mentoring: { type: "boolean" },
        mentoring_opis: { type: "string" },
        leadership: { type: "boolean" },
        leadership_opis: { type: "string" },
        edukacja: { type: "boolean" },
        edukacja_opis: { type: "string" },
        filantropia: { type: "boolean" },
        filantropia_opis: { type: "string" },
        integracja: { type: "boolean" },
        integracja_opis: { type: "string" },
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
        sukcesja: { type: "boolean" },
        sukcesja_opis: { type: "string" },
        zasady: { type: "string" },
        partner: {
          type: "object",
          properties: {
            imie: { type: "string" },
            wiek: { type: "number" },
            zajecie: { type: "string" },
          },
          additionalProperties: false,
        },
        dzieci: {
          type: "array",
          items: {
            type: "object",
            properties: {
              imie: { type: "string" },
              wiek: { type: "number" },
              zajecie: { type: "string" },
            },
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
    section_m_organizations: {
      type: "object",
      properties: {
        fundacje_csr: { type: "array", items: { type: "string" } },
        organizacje_branzowe: { type: "array", items: { type: "string" } },
        izby_handlowe: { type: "array", items: { type: "string" } },
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
        wizyta_cc: { type: "string" },
        doslanie_dokumentow: { type: "string" },
        email_podsumowanie: { type: "string" },
        ustalenia_koncowe: { type: "string" },
      },
      additionalProperties: false,
    },
    ai_notes: { type: "string" },
  },
  required: ["ai_notes"],
  additionalProperties: false,
};

function buildExistingDataContext(existingData: any): string {
  if (!existingData) return "";
  const filled: string[] = [];
  for (const [sectionKey, sectionVal] of Object.entries(existingData)) {
    if (!sectionKey.startsWith("section_") || !sectionVal || typeof sectionVal !== "object") continue;
    for (const [field, value] of Object.entries(sectionVal as Record<string, any>)) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value) && value.length === 0) continue;
      filled.push(`${sectionKey}.${field} = ${JSON.stringify(value)}`);
    }
  }
  if (filled.length === 0) return "";
  return `\n\nPOLA JUŻ UZUPEŁNIONE (NIE NADPISUJ, NIE ZMIENIAJ):\n${filled.join("\n")}`;
}

async function extractFromNote(note: string, contactName: string, companyName: string | null, existingData: any, apiKey: string) {
  const existingContext = buildExistingDataContext(existingData);

  const systemPrompt = `Jesteś ekspertem od analizy notatek ze spotkań biznesowych. 
Twoim zadaniem jest wyekstrahowanie ustrukturyzowanych danych z notatki i zmapowanie ich na sekcje formularza Business Interview.

Kontekst:
- Osoba: ${contactName}
- Firma: ${companyName || 'nieznana'}

ZASADY EKSTRAKCJI:
1. Wyciągaj TYLKO dane wyraźnie wspomniane lub możliwe do wywnioskowania z notatki.
2. NIE wymyślaj danych, których nie ma w notatce.
3. ${existingContext ? "Pola już uzupełnione (wymienione poniżej) NIE NADPISUJ." : "Uzupełniaj wszystkie pola, które możesz."}

ZASADY WNIOSKOWANIA:
- Jeśli notatka mówi o emeryturze rodziców, przekazaniu firmy, konstytucji rodzinnej → ustaw sukcesja=true i opisz w sukcesja_opis
- Członkowie rodziny wymienieni w kontekście biznesu → lista_wspolnikow (nazwa + relacja), partner, dzieci
- "siostra Monika" → lista_wspolnikow: [{nazwa: "Monika (siostra)", procent: 0}]
- Mapuj przychody na predefiniowane przedziały: do_10mln, 10_50mln, 50_100mln, 100_300mln, 300_500mln, 500mln_1mld, powyzej_1mld
  Np. "300 mln zł" → "300_500mln", "50 mln" → "50_100mln"
- Wyzwania biznesowe → czego_poszukuje (mapuj na enum: klienci, ekspansja, kapital, ma, inwestor, hr, optymalizacja, technologia)
  Np. "szuka sieci do przejęcia" → ["ma", "ekspansja"], "rekrutacja technologa" → ["hr"]
- Lokalizacje/miasta → miasto_bazowe, czeste_lokalizacje
- Branże → branza (opisowe) + branza_tagi (krótkie tagi: FMCG, food, agro, retail, tech, itp.)
- Jeśli firma ma wiele spółek/oddziałów → glowna_vs_holding=true, liczba_spolek
- Wnioskuj knowhow z opisu kompetencji i doświadczenia (section_j_value_for_cc)
- Wnioskuj zasoby z opisu infrastruktury (sklepy, hale, grunty itp.)
- "planowane M&A", "rozmowy o przejęciu" → section_h_investments.status = "w_trakcie"
- Opis wyzwań → top3_priorytety, najwieksze_wyzwanie
- horyzont_czasowy: "0-6" (pilne), "6-18" (średni), "18+" (długoterminowy)
- priorytet: "niski", "sredni", "wysoki"
${existingContext}

W polu ai_notes napisz:
1. Co udało się wyciągnąć i wywnioskować
2. Jakie pola wymagają weryfikacji z osobą
3. Czego brakuje i co warto dopytać`;

  const userContent = note
    ? `Notatka ze spotkania:\n\n${note}`
    : `Brak notatki. Uzupełnij formularz na podstawie kontekstu: osoba ${contactName}, firma ${companyName || 'nieznana'}. Wstaw ai_notes z informacją że dane wymagają weryfikacji.`;

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
        { role: "user", content: userContent },
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

async function searchPerplexityCompany(companyName: string, contactName: string, perplexityKey: string): Promise<string | null> {
  const query = `"${companyName}" Polska firma: NIP, strona www, właściciele, struktura grupy kapitałowej, spółki zależne, organizacje branżowe, izby handlowe, dane finansowe KRS, przychody, zatrudnienie, branża`;

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
            content: "Jesteś asystentem wyszukującym szczegółowe informacje biznesowe o polskich firmach. Podawaj fakty: NIP, KRS, strona www, właściciele, struktura grupy, przychody, branża, organizacje branżowe, izby handlowe. Jeśli nie znajdziesz informacji, napisz to wprost.",
          },
          { role: "user", content: query },
        ],
        search_recency_filter: "year",
      }),
    });

    if (!response.ok) {
      const status = response.status;
      console.error("Perplexity company search error:", status);
      if (status === 429) console.warn("Perplexity rate limited");
      if (status === 402) console.warn("Perplexity quota exceeded");
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.error("Perplexity company fetch error:", e);
    return null;
  }
}

async function searchPerplexityPerson(contactName: string, companyName: string | null, perplexityKey: string): Promise<string | null> {
  const companyPart = companyName ? ` "${companyName}"` : "";
  const query = `"${contactName}"${companyPart} Polska: aktywność publiczna, organizacje, stowarzyszenia, fundacje, hobby, zainteresowania, wywiady prasowe, nagrody, rodzina, wykształcenie`;

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
            content: "Jesteś asystentem wyszukującym informacje o polskich przedsiębiorcach. Szukaj: aktywność publiczna, członkostwo w organizacjach, stowarzyszeniach, izbach handlowych, fundacjach. Hobby, zainteresowania, wywiady prasowe, nagrody, informacje o rodzinie. Jeśli nie znajdziesz informacji, napisz to wprost.",
          },
          { role: "user", content: query },
        ],
        search_recency_filter: "year",
      }),
    });

    if (!response.ok) {
      console.error("Perplexity person search error:", response.status);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.error("Perplexity person fetch error:", e);
    return null;
  }
}

async function synthesize(extractedData: any, companyData: string | null, personData: string | null, contactName: string, companyName: string | null, existingData: any, apiKey: string) {
  if (!companyData && !personData) return extractedData;

  const existingContext = buildExistingDataContext(existingData);

  const perplexitySections: string[] = [];
  if (companyData) perplexitySections.push(`--- DANE O FIRMIE Z INTERNETU ---\n${companyData}`);
  if (personData) perplexitySections.push(`--- DANE O OSOBIE Z INTERNETU ---\n${personData}`);

  const systemPrompt = `Jesteś ekspertem od uzupełniania formularzy Business Interview.
Masz dane wyekstrahowane z notatki oraz dodatkowe informacje z internetu.

Twoim zadaniem jest UZUPEŁNIENIE brakujących pól w danych z notatki, korzystając z danych z internetu.

ZASADY:
1. NIE nadpisuj danych już wyekstrahowanych z notatki — mają priorytet
2. Dodawaj TYLKO sprawdzone informacje z internetu
3. Dla pól tablicowych — dołącz nowe elementy (nie duplikuj)
4. Mapuj przychody na enum: do_10mln, 10_50mln, 50_100mln, 100_300mln, 300_500mln, 500mln_1mld, powyzej_1mld
5. czego_poszukuje mapuj na enum: klienci, ekspansja, kapital, ma, inwestor, hr, optymalizacja, technologia
6. Organizacje branżowe → section_m_organizations.organizacje_branzowe
7. Izby handlowe → section_m_organizations.izby_handlowe
8. Stowarzyszenia → section_m_organizations.stowarzyszenia
9. Fundacje → section_m_organizations.fundacje_csr
10. Hobby/zainteresowania → section_l_personal.hobby
11. Informacje o rodzinie → section_l_personal.partner, section_l_personal.dzieci
12. NIP → section_a_basic.nip
13. Strona www → section_a_basic.www
${existingContext}

Osoba: ${contactName}
Firma: ${companyName || 'nieznana'}

Dane z notatki (JSON):
${JSON.stringify(extractedData, null, 2)}

${perplexitySections.join("\n\n")}

W ai_notes dodaj informację co zostało uzupełnione z internetu i co wymaga weryfikacji.`;

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

    if (!contactName) {
      return new Response(JSON.stringify({ error: "contactName is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`[bi-fill-from-note] Processing for ${contactName}, company: ${companyName || 'unknown'}, note length: ${note?.length || 0}`);

    // Step 1: Extract structured data from note
    console.log("[bi-fill-from-note] Step 1: Extracting from note...");
    const extractedData = await extractFromNote(note || "", contactName, companyName, existingData, LOVABLE_API_KEY);
    console.log("[bi-fill-from-note] Extracted sections:", Object.keys(extractedData).filter(k => k !== 'ai_notes'));

    // Step 2: Enrich with Perplexity (2 parallel queries)
    let companyData: string | null = null;
    let personData: string | null = null;

    if (PERPLEXITY_API_KEY) {
      console.log("[bi-fill-from-note] Step 2: Enriching with Perplexity (2 queries)...");
      const searchPromises: Promise<string | null>[] = [];

      if (companyName) {
        searchPromises.push(searchPerplexityCompany(companyName, contactName, PERPLEXITY_API_KEY));
      } else {
        searchPromises.push(Promise.resolve(null));
      }
      searchPromises.push(searchPerplexityPerson(contactName, companyName, PERPLEXITY_API_KEY));

      const [companyResult, personResult] = await Promise.all(searchPromises);
      companyData = companyResult;
      personData = personResult;

      if (companyData) console.log("[bi-fill-from-note] Company data received, length:", companyData.length);
      if (personData) console.log("[bi-fill-from-note] Person data received, length:", personData.length);
    } else {
      console.log("[bi-fill-from-note] Step 2: Skipping Perplexity (no API key)");
    }

    // Step 3: Synthesize
    let finalData = extractedData;
    if (companyData || personData) {
      console.log("[bi-fill-from-note] Step 3: Synthesizing...");
      finalData = await synthesize(extractedData, companyData, personData, contactName, companyName, existingData, LOVABLE_API_KEY);
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
