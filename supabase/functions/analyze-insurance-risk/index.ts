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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Brak autoryzacji' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { company_id, action } = await req.json();

    if (!company_id) {
      return new Response(JSON.stringify({ error: 'Brak company_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Pobierz dane firmy
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', company_id)
      .single();

    if (companyError || !company) {
      return new Response(JSON.stringify({ error: 'Firma nie znaleziona' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Pobierz ocenę ryzyka
    const { data: assessment, error: assessmentError } = await supabase
      .from('insurance_risk_assessments')
      .select('*')
      .eq('company_id', company_id)
      .single();

    if (assessmentError || !assessment) {
      return new Response(JSON.stringify({ error: 'Brak oceny ryzyka' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'Brak klucza API' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Przygotuj kontekst
    const formatRevenue = (amount: number) => {
      if (!amount) return 'brak danych';
      if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)} mld PLN`;
      if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)} mln PLN`;
      return `${amount} PLN`;
    };

    const typyDzialalnosci = assessment.typy_dzialalnosci?.join(', ') || 'brak';
    const ryzykoMajatkowe = assessment.ryzyko_majatkowe || {};
    const ryzykoOC = assessment.ryzyko_oc || {};
    const ryzykoFlota = assessment.ryzyko_flota || {};
    const ryzykoSpecjalistyczne = assessment.ryzyko_specjalistyczne || {};
    const ryzykoPracownicy = assessment.ryzyko_pracownicy || {};

    let prompt = '';
    let systemPrompt = `Jesteś ekspertem ds. strategii ubezpieczeń korporacyjnych w Polsce. Odpowiadasz zawsze po polsku, krótko i konkretnie. Używasz profesjonalnego języka brokerskiego.`;

    if (action === 'analyze') {
      prompt = `Przeanalizuj profil ryzyka dla firmy:

FIRMA: ${company.name}
BRANŻA: ${company.industry || 'nieznana'}
PRZYCHODY: ${formatRevenue(company.revenue_amount)}
LOKALIZACJA: ${company.city || 'Polska'}

DNA OPERACYJNE: ${typyDzialalnosci}

MAJĄTEK:
- Status: ${ryzykoMajatkowe.status}
- Lokalizacje: ${ryzykoMajatkowe.liczba_lokalizacji || 'brak danych'}
- Własność: ${ryzykoMajatkowe.typ_wlasnosci || 'brak danych'}
- Suma majątek: ${ryzykoMajatkowe.suma_ubezp_majatek ? formatRevenue(ryzykoMajatkowe.suma_ubezp_majatek) : 'brak'}
- Materiały łatwopalne: ${ryzykoMajatkowe.materialy_latwopalne ? 'TAK' : 'NIE'}

OC:
- Status: ${ryzykoOC.status}
- OC produktowe: ${ryzykoOC.oc_produktowe ? 'TAK' : 'NIE'}
- Zakres terytorialny: ${ryzykoOC.zakres_terytorialny?.join(', ') || 'brak'}
- Jurysdykcja USA: ${ryzykoOC.jurysdykcja_usa ? 'TAK' : 'NIE'}

FLOTA:
- Status: ${ryzykoFlota.status}
- Pojazdy: ${ryzykoFlota.liczba_pojazdow || 'brak danych'}
- Cargo: ${ryzykoFlota.cargo_ubezpieczone ? 'ubezpieczone' : 'brak'}

SPECJALISTYCZNE:
- Cyber: ${ryzykoSpecjalistyczne.cyber_status}
- D&O: ${ryzykoSpecjalistyczne.do_status}
- CAR/EAR: ${ryzykoSpecjalistyczne.car_ear_status}

PRACOWNICY:
- Życie: ${ryzykoPracownicy.zycie_status}
- Zdrowie: ${ryzykoPracownicy.zdrowie_status}
- Podróże: ${ryzykoPracownicy.podroze_status}

ZADANIA:
1. Zidentyfikuj 3-5 kluczowych ryzyk specyficznych dla tego profilu
2. Wygeneruj 3-5 krytycznych pytań, które broker powinien zadać podczas spotkania
3. Wskaż zidentyfikowane luki (status "luka") i ich konsekwencje

Odpowiedz w formacie JSON:
{
  "analiza_kontekstu": "Krótki opis kluczowych ryzyk (max 200 słów)",
  "podpowiedzi": [
    {"id": "1", "wyzwalacz": "...", "wiadomosc": "...", "priorytet": "krytyczny|ostrzezenie|info", "domena": "..."},
    ...
  ]
}`;
    } else if (action === 'brief') {
      prompt = `Wygeneruj Brief Brokerski dla zespołu back-office:

FIRMA: ${company.name}
NIP: ${company.nip || 'brak'}
BRANŻA: ${company.industry || 'nieznana'}
PRZYCHODY: ${formatRevenue(company.revenue_amount)}
ZATRUDNIENIE: ${company.employee_count || 'brak danych'}
LOKALIZACJA: ${company.city || 'Polska'}

DNA OPERACYJNE: ${typyDzialalnosci}

MAJĄTEK:
- Status: ${ryzykoMajatkowe.status}
- Lokalizacje: ${ryzykoMajatkowe.liczba_lokalizacji || 'brak danych'}
- Własność: ${ryzykoMajatkowe.typ_wlasnosci || 'brak danych'}
- Suma majątek: ${ryzykoMajatkowe.suma_ubezp_majatek ? formatRevenue(ryzykoMajatkowe.suma_ubezp_majatek) : 'brak'}
- Suma BI: ${ryzykoMajatkowe.suma_ubezp_bi ? formatRevenue(ryzykoMajatkowe.suma_ubezp_bi) : 'brak'}
- Materiały łatwopalne: ${ryzykoMajatkowe.materialy_latwopalne ? 'TAK' : 'NIE'}
- Awaria maszyn: ${ryzykoMajatkowe.awaria_maszyn ? 'TAK' : 'NIE'}
- Uwagi: ${ryzykoMajatkowe.uwagi || 'brak'}

OC:
- Status: ${ryzykoOC.status}
- OC produktowe: ${ryzykoOC.oc_produktowe ? 'TAK' : 'NIE'}
- OC zawodowe: ${ryzykoOC.oc_zawodowe ? 'TAK' : 'NIE'}
- Zakres terytorialny: ${ryzykoOC.zakres_terytorialny?.join(', ') || 'brak'}
- Jurysdykcja USA: ${ryzykoOC.jurysdykcja_usa ? 'TAK - obroty USA: ' + (ryzykoOC.obroty_usa_procent || '?') + '%' : 'NIE'}
- Uwagi: ${ryzykoOC.uwagi || 'brak'}

FLOTA:
- Status: ${ryzykoFlota.status}
- Pojazdy: ${ryzykoFlota.liczba_pojazdow || 'brak danych'}
- Wartość floty: ${ryzykoFlota.wartosc_floty ? formatRevenue(ryzykoFlota.wartosc_floty) : 'brak'}
- Cargo: ${ryzykoFlota.cargo_ubezpieczone ? 'ubezpieczone' : 'brak'}
- CPM: ${ryzykoFlota.cpm_ubezpieczone ? 'ubezpieczone' : 'brak'}
- Uwagi: ${ryzykoFlota.uwagi || 'brak'}

SPECJALISTYCZNE:
- Cyber: ${ryzykoSpecjalistyczne.cyber_status} ${ryzykoSpecjalistyczne.cyber_suma ? '(' + formatRevenue(ryzykoSpecjalistyczne.cyber_suma) + ')' : ''}
- D&O: ${ryzykoSpecjalistyczne.do_status} ${ryzykoSpecjalistyczne.do_suma ? '(' + formatRevenue(ryzykoSpecjalistyczne.do_suma) + ')' : ''}
- CAR/EAR: ${ryzykoSpecjalistyczne.car_ear_status} ${ryzykoSpecjalistyczne.car_ear_projekty || ''}
- Uwagi: ${ryzykoSpecjalistyczne.uwagi || 'brak'}

PRACOWNICY:
- Życie: ${ryzykoPracownicy.zycie_status} ${ryzykoPracownicy.zycie_liczba_pracownikow ? '(' + ryzykoPracownicy.zycie_liczba_pracownikow + ' os.)' : ''}
- Zdrowie: ${ryzykoPracownicy.zdrowie_status} ${ryzykoPracownicy.zdrowie_typ_pakietu || ''}
- Podróże: ${ryzykoPracownicy.podroze_status}
- Uwagi: ${ryzykoPracownicy.uwagi || 'brak'}

Wygeneruj profesjonalny brief brokerski (max 500 słów) zawierający:
1. Podsumowanie profilu klienta
2. Zidentyfikowane luki w pokryciu
3. Rekomendowane produkty ubezpieczeniowe
4. Kluczowe pytania do wyjaśnienia przed quotowaniem
5. Sugerowane limity i franszyz

Odpowiedz w formacie JSON:
{
  "brief_brokerski": "Treść briefu..."
}`;
    } else {
      return new Response(JSON.stringify({ error: 'Nieznana akcja' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Wywołaj AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI error:', errorText);
      return new Response(JSON.stringify({ error: 'Błąd AI' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';

    // Parsuj JSON z odpowiedzi
    let parsedResult;
    try {
      // Wyciągnij JSON z odpowiedzi (może być otoczony markdown)
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Brak JSON w odpowiedzi');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      // Fallback - użyj surowej odpowiedzi
      if (action === 'analyze') {
        parsedResult = {
          analiza_kontekstu: aiContent,
          podpowiedzi: [],
        };
      } else {
        parsedResult = {
          brief_brokerski: aiContent,
        };
      }
    }

    // Zapisz wyniki do bazy
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (action === 'analyze') {
      updateData.ai_analiza_kontekstu = parsedResult.analiza_kontekstu;
      updateData.ai_podpowiedzi = parsedResult.podpowiedzi || [];
    } else if (action === 'brief') {
      updateData.ai_brief_brokerski = parsedResult.brief_brokerski;
    }

    await supabase
      .from('insurance_risk_assessments')
      .update(updateData)
      .eq('id', assessment.id);

    // Zwróć wynik
    const result: Record<string, unknown> = {};
    if (action === 'analyze') {
      result.ai_analiza_kontekstu = parsedResult.analiza_kontekstu;
      result.ai_podpowiedzi = parsedResult.podpowiedzi;
    } else if (action === 'brief') {
      result.ai_brief_brokerski = parsedResult.brief_brokerski;
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Błąd serwera';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
