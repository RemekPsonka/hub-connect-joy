import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Brak autoryzacji' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Nieautoryzowany' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { contact_id, pasted_content, contact_name } = await req.json();

    if (!contact_id || !pasted_content) {
      return new Response(JSON.stringify({ error: 'Brak wymaganych danych' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get tenant_id from directors or assistants
    const { data: director } = await supabase
      .from('directors')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    const { data: assistant } = await supabase
      .from('assistants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    const tenant_id = director?.tenant_id || assistant?.tenant_id;
    if (!tenant_id) {
      return new Response(JSON.stringify({ error: 'Nie znaleziono tenanta' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call AI to parse the LinkedIn data
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'Brak klucza API' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `Jesteś ekspertem od analizy danych z LinkedIn. Przeanalizuj wklejone dane i wyodrębnij informacje.

KONTEKST:
Analizujesz dane dla osoby: ${contact_name || 'Nieznany'}

ZADANIA:
1. Jeśli widzisz profil głównej osoby (${contact_name || 'tej osoby'}) - wyodrębnij:
   - career_history: lista obiektów { company, position, start_date, end_date, description }
   - education: lista obiektów { school, degree, field, start_date, end_date }
   - skills: lista stringów
   - summary: krótkie podsumowanie profilu
   - about: sekcja "O mnie" jeśli jest

2. Jeśli widzisz listę kontaktów/połączeń/znajomych - wyodrębnij TYLKO osoby z 1. stopnia znajomości:
   
   DODAJ tylko osoby oznaczone jako "1st" (first-degree connections / bezpośredni znajomi)
   
   IGNORUJ I NIE DODAWAJ:
   - Osoby z "2nd" (znajomi znajomych)
   - Osoby z "3rd" (dalsze połączenia)
   - Sekcje "People you may know" / "Osoby, które możesz znać"
   - Sekcje "People also viewed" / "Inni użytkownicy oglądali"
   - Sugestie, reklamy i sponsorowane treści
   - Osoby bez wyraźnego oznaczenia "1st" - jeśli stopień znajomości nie jest określony, NIE DODAWAJ
   
   Dla każdej osoby z 1. stopnia znajomości wyodrębnij:
   - full_name: imię i nazwisko
   - company: obecna firma (bez "Sp. z o.o.", "S.A." itp.)
   - position: obecne stanowisko
   - linkedin_url: URL profilu jeśli widoczny

WAŻNE:
- Dane mogą zawierać oba typy informacji lub tylko jeden
- Normalizuj nazwy firm (usuwaj "Sp. z o.o.", "S.A.", "Ltd.", "Inc." na końcu)
- Stanowiska i nazwy pozostaw w oryginalnym języku
- Jeśli nie możesz określić jakiejś wartości, ustaw null
- Nie wymyślaj danych - tylko to co widzisz we wklejonym tekście
- KRYTYCZNE: Dodawaj TYLKO pewne kontakty pierwszego stopnia (1st degree)

ZWRÓĆ JSON w formacie:
{
  "profile_updates": {
    "career_history": [...],
    "education": [...],
    "skills": [...],
    "summary": "...",
    "about": "..."
  },
  "network_contacts": [
    { "full_name": "...", "company": "...", "position": "...", "linkedin_url": "..." }
  ]
}

Jeśli brak danych dla sekcji lub brak kontaktów 1. stopnia, zwróć pustą tablicę [] lub null.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Przeanalizuj poniższe dane skopiowane z LinkedIn:\n\n${pasted_content}` }
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Przekroczono limit zapytań AI. Spróbuj ponownie za chwilę.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Brak środków na koncie AI. Doładuj konto.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'Błąd analizy AI' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      return new Response(JSON.stringify({ error: 'Brak odpowiedzi od AI' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse AI response - handle markdown code blocks
    let parsedResult;
    try {
      let jsonStr = aiContent;
      // Remove markdown code blocks if present
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      parsedResult = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError, aiContent);
      return new Response(JSON.stringify({ error: 'Błąd parsowania odpowiedzi AI' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { profile_updates, network_contacts } = parsedResult;

    // Update contact's linkedin_data if profile updates exist
    if (profile_updates && Object.keys(profile_updates).some(k => profile_updates[k])) {
      // Get existing linkedin_data
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('linkedin_data')
        .eq('id', contact_id)
        .single();

      const existingData = existingContact?.linkedin_data || {};

      // Merge data incrementally
      const mergedData = {
        career_history: [
          ...(existingData.career_history || []),
          ...(profile_updates.career_history || [])
        ].filter((item, index, self) => 
          index === self.findIndex(t => 
            t.company === item.company && t.position === item.position
          )
        ),
        education: [
          ...(existingData.education || []),
          ...(profile_updates.education || [])
        ].filter((item, index, self) => 
          index === self.findIndex(t => 
            t.school === item.school && t.degree === item.degree
          )
        ),
        skills: [...new Set([
          ...(existingData.skills || []),
          ...(profile_updates.skills || [])
        ])],
        summary: profile_updates.summary || existingData.summary,
        about: profile_updates.about || existingData.about,
        last_updated: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('contacts')
        .update({ linkedin_data: mergedData })
        .eq('id', contact_id);

      if (updateError) {
        console.error("Error updating contact linkedin_data:", updateError);
      }
    }

    // Add network contacts (with deduplication)
    let addedContacts = 0;
    let skippedContacts = 0;

    if (network_contacts && network_contacts.length > 0) {
      // Get existing network contacts for this source
      const { data: existingNetworkContacts } = await supabase
        .from('linkedin_network_contacts')
        .select('full_name, company')
        .eq('source_contact_id', contact_id);

      const existingSet = new Set(
        (existingNetworkContacts || []).map((c: { full_name?: string; company?: string }) => 
          `${c.full_name?.toLowerCase()}-${c.company?.toLowerCase()}`
        )
      );

      interface NetworkContact {
        full_name: string;
        company?: string;
        position?: string;
        linkedin_url?: string;
      }

      const newContacts = (network_contacts as NetworkContact[]).filter((c: NetworkContact) => {
        const key = `${c.full_name?.toLowerCase()}-${c.company?.toLowerCase()}`;
        return c.full_name && !existingSet.has(key);
      });

      skippedContacts = network_contacts.length - newContacts.length;

      if (newContacts.length > 0) {
        const contactsToInsert = newContacts.map((c: NetworkContact) => ({
          tenant_id,
          source_contact_id: contact_id,
          full_name: c.full_name,
          company: c.company,
          position: c.position,
          linkedin_url: c.linkedin_url,
        }));

        const { error: insertError, data: insertedData } = await supabase
          .from('linkedin_network_contacts')
          .insert(contactsToInsert)
          .select();

        if (insertError) {
          console.error("Error inserting network contacts:", insertError);
        } else {
          addedContacts = insertedData?.length || 0;
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      profile_updated: !!(profile_updates && Object.keys(profile_updates).some(k => profile_updates[k])),
      network_contacts_added: addedContacts,
      network_contacts_skipped: skippedContacts,
      profile_updates,
      network_contacts
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in parse-linkedin-network:", error);
    const errorMessage = error instanceof Error ? error.message : 'Wystąpił błąd';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
