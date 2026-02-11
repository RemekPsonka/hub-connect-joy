import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fields that belong to the MAIN contact/company records, NOT BI
const CONTACT_COMPANY_SCHEMA = {
  type: "object",
  properties: {
    contact_updates: {
      type: "object",
      description: "Data to update on the main contact card (NOT BI). Only include if found.",
      properties: {
        email: { type: "string", description: "Email osobisty/biznesowy" },
        email_secondary: { type: "string", description: "Dodatkowy email" },
        phone: { type: "string", description: "Telefon główny" },
        phone_business: { type: "string", description: "Telefon biznesowy" },
        position: { type: "string", description: "Stanowisko/rola" },
        linkedin_url: { type: "string", description: "URL profilu LinkedIn" },
        city: { type: "string", description: "Miasto zamieszkania/bazowe" },
        address: { type: "string", description: "Adres" },
        tags: { type: "array", items: { type: "string" }, description: "Tagi branżowe: FMCG, food, tech, agro, retail itp." },
      },
      additionalProperties: false,
    },
    company_updates: {
      type: "object",
      description: "Data to update on the company record. Only include if found.",
      properties: {
        name: { type: "string", description: "Oficjalna nazwa firmy" },
        nip: { type: "string", description: "NIP firmy" },
        krs: { type: "string", description: "KRS firmy" },
        regon: { type: "string", description: "REGON firmy" },
        website: { type: "string", description: "Strona www firmy" },
        industry: { type: "string", description: "Branża firmy" },
        description: { type: "string", description: "Opis działalności firmy" },
        employee_count: { type: "string", description: "Liczba pracowników" },
        city: { type: "string", description: "Miasto siedziby firmy" },
        address: { type: "string", description: "Adres siedziby firmy" },
        phone: { type: "string", description: "Telefon firmowy" },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};

// BI-specific knowledge fields (NOT contact/company data)
const BI_SECTIONS_SCHEMA = {
  type: "object",
  properties: {
    // Contact & company updates go to main DB
    ...CONTACT_COMPANY_SCHEMA.properties,
    // BI-specific sections
    section_a_basic: {
      type: "object",
      description: "Kontekst spotkania - relacja, brief, źródło. NIE dane kontaktowe (email/telefon/NIP idą do contact_updates/company_updates).",
      properties: {
        branza: { type: "array", items: { type: "string" } },
        branza_tagi: { type: "array", items: { type: "string" } },
        zrodlo_kontaktu: { type: "string" },
        status_relacji: { type: "string", enum: ["nowy", "polecony", "powracajacy", "znajomy", "klient"] },
        sila_relacji: { type: "number" },
        rozważa_aplikacje_cc: { type: "string", enum: ["tak", "nie", "nie_wiem"] },
      },
      additionalProperties: false,
    },
    section_c_company_profile: {
      type: "object",
      description: "Profil firmy z perspektywy BI (wiedza ze spotkania). Dane rejestrowe (NIP, adres) idą do company_updates.",
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
            properties: { nazwa: { type: "string" }, procent: { type: "number" } },
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
          properties: { imie: { type: "string" }, wiek: { type: "number" }, zajecie: { type: "string" } },
          additionalProperties: false,
        },
        dzieci: {
          type: "array",
          items: {
            type: "object",
            properties: { imie: { type: "string" }, wiek: { type: "number" }, zajecie: { type: "string" } },
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

function buildExistingContactContext(contactData: any, companyData: any): string {
  const parts: string[] = [];
  if (contactData) {
    if (contactData.email) parts.push(`contact.email = "${contactData.email}"`);
    if (contactData.phone) parts.push(`contact.phone = "${contactData.phone}"`);
    if (contactData.position) parts.push(`contact.position = "${contactData.position}"`);
    if (contactData.city) parts.push(`contact.city = "${contactData.city}"`);
    if (contactData.linkedin_url) parts.push(`contact.linkedin_url = "${contactData.linkedin_url}"`);
    if (contactData.tags?.length) parts.push(`contact.tags = ${JSON.stringify(contactData.tags)}`);
  }
  if (companyData) {
    if (companyData.nip) parts.push(`company.nip = "${companyData.nip}"`);
    if (companyData.website) parts.push(`company.website = "${companyData.website}"`);
    if (companyData.industry) parts.push(`company.industry = "${companyData.industry}"`);
  }
  if (parts.length === 0) return "";
  return `\n\nDANE JUŻ W GŁÓWNEJ BAZIE (NIE NADPISUJ jeśli się nie zmieniły):\n${parts.join("\n")}`;
}

async function extractFromNote(note: string, contactName: string, companyName: string | null, existingData: any, contactContext: string, apiKey: string) {
  const existingContext = buildExistingDataContext(existingData);

  const systemPrompt = `Jesteś ekspertem od analizy notatek ze spotkań biznesowych. 
Twoim zadaniem jest wyekstrahowanie ustrukturyzowanych danych z notatki.

WAŻNA ZASADA ARCHITEKTURY:
- Dane KONTAKTOWE osoby (email, telefon, miasto, stanowisko, LinkedIn, tagi) → wpisz do "contact_updates"
- Dane FIRMOWE (NIP, KRS, REGON, www, adres firmy, branża, opis, liczba pracowników) → wpisz do "company_updates"  
- Dane WIEDZY ze spotkania (strategia, potrzeby, relacje, rodzina, hobby, zaangażowanie) → wpisz do sekcji BI (section_*)
- NIE duplikuj danych — email/telefon/NIP TYLKO w contact_updates/company_updates, NIGDY w sekcjach BI

Kontekst:
- Osoba: ${contactName}
- Firma: ${companyName || 'nieznana'}

ZASADY EKSTRAKCJI:
1. Wyciągaj TYLKO dane wyraźnie wspomniane lub możliwe do wywnioskowania z notatki.
2. NIE wymyślaj danych, których nie ma w notatce.
3. ${existingContext ? "Pola już uzupełnione (wymienione poniżej) NIE NADPISUJ." : "Uzupełniaj wszystkie pola, które możesz."}

ZASADY WNIOSKOWANIA:
- Jeśli notatka mówi o emeryturze rodziców, przekazaniu firmy → sukcesja=true + sukcesja_opis
- Członkowie rodziny w kontekście biznesu → lista_wspolnikow
- Mapuj przychody na enum: do_10mln, 10_50mln, 50_100mln, 100_300mln, 300_500mln, 500mln_1mld, powyzej_1mld
- Wyzwania → czego_poszukuje (enum: klienci, ekspansja, kapital, ma, inwestor, hr, optymalizacja, technologia)
- Lokalizacje/miasta osoby → contact_updates.city
- Lokalizacje/miasta firmy → company_updates.city
- Branże → contact_updates.tags (krótkie tagi: FMCG, food, agro, retail, tech)
- Stanowisko/rola → contact_updates.position (i tytul_rola w BI dla kontekstu relacji)
- Telefon/email → ZAWSZE do contact_updates, NIGDY do sekcji BI
- NIP/KRS/www → ZAWSZE do company_updates, NIGDY do sekcji BI
${existingContext}
${contactContext}

W polu ai_notes napisz:
1. Co udało się wyciągnąć i wywnioskować
2. Jakie pola wymagają weryfikacji
3. Czego brakuje i co warto dopytać
4. Jakie dane zostały zapisane do głównej karty kontaktu/firmy`;

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
          description: "Fill Business Interview sections and contact/company updates with extracted data",
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
  const query = `"${companyName}" Polska firma: NIP, strona www, właściciele, struktura grupy kapitałowej, spółki zależne, organizacje branżowe, izby handlowe, dane finansowe KRS, przychody, zatrudnienie, branża, adres siedziby, telefon`;

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
            content: "Jesteś asystentem wyszukującym szczegółowe informacje biznesowe o polskich firmach. Podawaj fakty: NIP, KRS, REGON, strona www, właściciele, struktura grupy, przychody, branża, organizacje branżowe, izby handlowe, adres siedziby, telefon firmowy, liczba pracowników. Jeśli nie znajdziesz informacji, napisz to wprost.",
          },
          { role: "user", content: query },
        ],
        search_recency_filter: "year",
      }),
    });

    if (!response.ok) {
      console.error("Perplexity company search error:", response.status);
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
  const query = `"${contactName}"${companyPart} Polska: email, LinkedIn, aktywność publiczna, organizacje, stowarzyszenia, fundacje, hobby, zainteresowania, wywiady prasowe, nagrody, rodzina, wykształcenie, miasto zamieszkania`;

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
            content: "Jesteś asystentem wyszukującym informacje o polskich przedsiębiorcach. Szukaj: email kontaktowy, profil LinkedIn, aktywność publiczna, członkostwo w organizacjach, stowarzyszeniach, izbach handlowych, fundacjach. Hobby, zainteresowania, wywiady prasowe, nagrody, informacje o rodzinie, miasto zamieszkania. Jeśli nie znajdziesz informacji, napisz to wprost.",
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

async function synthesize(extractedData: any, companyData: string | null, personData: string | null, contactName: string, companyName: string | null, existingData: any, contactContext: string, apiKey: string) {
  if (!companyData && !personData) return extractedData;

  const existingContext = buildExistingDataContext(existingData);

  const perplexitySections: string[] = [];
  if (companyData) perplexitySections.push(`--- DANE O FIRMIE Z INTERNETU ---\n${companyData}`);
  if (personData) perplexitySections.push(`--- DANE O OSOBIE Z INTERNETU ---\n${personData}`);

  const systemPrompt = `Jesteś ekspertem od uzupełniania formularzy Business Interview.
Masz dane wyekstrahowane z notatki oraz dodatkowe informacje z internetu.

WAŻNA ZASADA ARCHITEKTURY:
- Dane KONTAKTOWE osoby (email, telefon, miasto, stanowisko, LinkedIn, tagi) → "contact_updates"
- Dane FIRMOWE (NIP, KRS, REGON, www, adres, branża, opis, pracownicy) → "company_updates"
- Dane WIEDZY ze spotkania → sekcje BI (section_*)
- NIE duplikuj — NIP/email/telefon TYLKO w contact_updates/company_updates

ZASADY:
1. NIE nadpisuj danych już wyekstrahowanych z notatki — mają priorytet
2. Dodawaj TYLKO sprawdzone informacje z internetu
3. Dla pól tablicowych — dołącz nowe elementy (nie duplikuj)
4. Mapuj przychody na enum: do_10mln, 10_50mln, 50_100mln, 100_300mln, 300_500mln, 500mln_1mld, powyzej_1mld
5. czego_poszukuje mapuj na enum: klienci, ekspansja, kapital, ma, inwestor, hr, optymalizacja, technologia
6. Organizacje branżowe → section_m_organizations.organizacje_branzowe
7. Izby handlowe → section_m_organizations.izby_handlowe
8. Telefon/email osoby → contact_updates (nie BI)
9. NIP/www/adres firmy → company_updates (nie BI)
${existingContext}
${contactContext}

Osoba: ${contactName}
Firma: ${companyName || 'nieznana'}

Dane z notatki (JSON):
${JSON.stringify(extractedData, null, 2)}

${perplexitySections.join("\n\n")}

W ai_notes dodaj co zostało uzupełnione z internetu, co wymaga weryfikacji, i jakie dane trafiły do karty kontaktu/firmy.`;

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
          description: "Fill Business Interview sections and contact/company updates with merged data",
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

// Update contact record with extracted data (only non-empty, non-existing fields)
async function updateContactRecord(supabaseAdmin: any, contactId: string, contactUpdates: any, existingContact: any) {
  if (!contactUpdates || Object.keys(contactUpdates).length === 0) return;

  const updates: Record<string, any> = {};
  const allowedFields = ['email', 'email_secondary', 'phone', 'phone_business', 'position', 'linkedin_url', 'city', 'address', 'tags'];

  for (const field of allowedFields) {
    const newVal = contactUpdates[field];
    if (newVal === undefined || newVal === null || newVal === '') continue;

    const existingVal = existingContact?.[field];

    if (field === 'tags') {
      // Merge arrays
      const existingTags = existingVal || [];
      const newTags = (Array.isArray(newVal) ? newVal : []).filter((t: string) => !existingTags.includes(t));
      if (newTags.length > 0) {
        updates.tags = [...existingTags, ...newTags];
      }
    } else if (!existingVal) {
      // Only fill empty fields
      updates[field] = newVal;
    }
  }

  if (Object.keys(updates).length > 0) {
    console.log("[bi-fill-from-note] Updating contact record:", Object.keys(updates));
    const { error } = await supabaseAdmin
      .from('contacts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', contactId);
    if (error) console.error("[bi-fill-from-note] Contact update error:", error);
  }
}

// Update company record with extracted data
async function updateCompanyRecord(supabaseAdmin: any, companyIdParam: string | null, companyUpdates: any, tenantId: string, companyName: string | null) {
  if (!companyUpdates || Object.keys(companyUpdates).length === 0) return;
  let companyId = companyIdParam;
  
  // If no company_id, create company from name
  if (!companyId) {
    if (!companyName || !tenantId) {
      console.log("[bi-fill-from-note] No company_id and no companyName/tenantId, skipping company updates");
      return;
    }
    console.log("[bi-fill-from-note] No company_id, creating company from name:", companyName);
    
    const { data: newCompany, error: createError } = await supabaseAdmin
      .from('companies')
      .insert({
        name: companyName,
        tenant_id: tenantId,
        company_analysis_status: 'pending',
        website: companyUpdates.website || null,
        nip: companyUpdates.nip || null,
      })
      .select('id')
      .single();
    
    if (createError || !newCompany) {
      console.error("[bi-fill-from-note] Failed to create company:", createError);
      return;
    }
    
    // Assign company to contact - find contactId from the function context
    // We need to get contactId - it's passed via the outer scope
    const { data: contactsWithName } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('company', companyName)
      .is('company_id', null)
      .limit(10);
    
    if (contactsWithName && contactsWithName.length > 0) {
      await supabaseAdmin
        .from('contacts')
        .update({ company_id: newCompany.id })
        .in('id', contactsWithName.map((c: any) => c.id));
      console.log("[bi-fill-from-note] Assigned", contactsWithName.length, "contacts to new company");
    }
    
    companyId = newCompany.id;
  }

  // Get existing company data
  const { data: existingCompany } = await supabaseAdmin
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();

  const updates: Record<string, any> = {};
  const allowedFields = ['nip', 'krs', 'regon', 'website', 'industry', 'description', 'employee_count', 'city', 'address', 'phone'];

  for (const field of allowedFields) {
    const newVal = companyUpdates[field];
    if (newVal === undefined || newVal === null || newVal === '') continue;
    
    const existingVal = existingCompany?.[field];
    if (!existingVal) {
      updates[field] = newVal;
    }
  }

  if (Object.keys(updates).length > 0) {
    console.log("[bi-fill-from-note] Updating company record:", Object.keys(updates));
    const { error } = await supabaseAdmin
      .from('companies')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', companyId);
    if (error) console.error("[bi-fill-from-note] Company update error:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { note, contactName, companyName, existingData, contactId } = await req.json();

    if (!contactName) {
      return new Response(JSON.stringify({ error: "contactName is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    console.log(`[bi-fill-from-note] Processing for ${contactName}, company: ${companyName || 'unknown'}, note length: ${note?.length || 0}, contactId: ${contactId || 'none'}`);

    // Fetch existing contact & company data to build context
    let existingContact: any = null;
    let existingCompany: any = null;
    let contactContext = "";

    if (contactId) {
      const { data: contactData } = await supabaseAdmin
        .from('contacts')
        .select('*, companies(*)')
        .eq('id', contactId)
        .single();

      if (contactData) {
        existingContact = contactData;
        existingCompany = contactData.companies;
        contactContext = buildExistingContactContext(contactData, contactData.companies);
      }
    }

    // Step 1: Extract structured data from note
    console.log("[bi-fill-from-note] Step 1: Extracting from note...");
    const extractedData = await extractFromNote(note || "", contactName, companyName, existingData, contactContext, LOVABLE_API_KEY);
    console.log("[bi-fill-from-note] Extracted sections:", Object.keys(extractedData).filter(k => !['ai_notes', 'contact_updates', 'company_updates'].includes(k)));

    // Step 2: Enrich with Perplexity (2 parallel queries)
    let companySearchData: string | null = null;
    let personSearchData: string | null = null;

    if (PERPLEXITY_API_KEY) {
      console.log("[bi-fill-from-note] Step 2: Enriching with Perplexity...");
      const searchPromises: Promise<string | null>[] = [];

      if (companyName) {
        searchPromises.push(searchPerplexityCompany(companyName, contactName, PERPLEXITY_API_KEY));
      } else {
        searchPromises.push(Promise.resolve(null));
      }
      searchPromises.push(searchPerplexityPerson(contactName, companyName, PERPLEXITY_API_KEY));

      const [companyResult, personResult] = await Promise.all(searchPromises);
      companySearchData = companyResult;
      personSearchData = personResult;

      if (companySearchData) console.log("[bi-fill-from-note] Company data received, length:", companySearchData.length);
      if (personSearchData) console.log("[bi-fill-from-note] Person data received, length:", personSearchData.length);
    }

    // Step 3: Synthesize
    let finalData = extractedData;
    if (companySearchData || personSearchData) {
      console.log("[bi-fill-from-note] Step 3: Synthesizing...");
      finalData = await synthesize(extractedData, companySearchData, personSearchData, contactName, companyName, existingData, contactContext, LOVABLE_API_KEY);
    }

    // Step 4: Write contact/company updates to main DB
    if (contactId) {
      const contactUpdates = finalData.contact_updates;
      const companyUpdates = finalData.company_updates;

      await Promise.all([
        updateContactRecord(supabaseAdmin, contactId, contactUpdates, existingContact),
        updateCompanyRecord(supabaseAdmin, existingContact?.company_id, companyUpdates, existingContact?.tenant_id, companyName),
      ]);

      console.log("[bi-fill-from-note] Main DB updates completed");
    }

    // Step 5: Strip contact/company updates from BI data (they're in main DB now)
    const biData = { ...finalData };
    const appliedContactUpdates = biData.contact_updates || {};
    const appliedCompanyUpdates = biData.company_updates || {};
    delete biData.contact_updates;
    delete biData.company_updates;

    console.log("[bi-fill-from-note] Done. BI sections:", Object.keys(biData).filter(k => k !== 'ai_notes'));

    return new Response(JSON.stringify({ 
      success: true, 
      data: biData,
      mainDbUpdates: {
        contact: Object.keys(appliedContactUpdates),
        company: Object.keys(appliedCompanyUpdates),
      }
    }), {
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
