import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { analyticsData } = await req.json();

    if (!analyticsData) {
      throw new Error('Analytics data is required');
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { metrics, contactsByIndustry, networkHealth, topCategories } = analyticsData;

    const prompt = `Jesteś AI analitykiem danych networkingowych. Przeanalizuj poniższe statystyki i wygeneruj 3-5 kluczowych insights.

DANE:
- Łączna liczba kontaktów: ${metrics.totalContacts}
- Zmiana liczby kontaktów: ${metrics.contactsGrowth}%
- Aktywne potrzeby: ${metrics.activeNeeds}
- Wskaźnik realizacji potrzeb: ${metrics.needsFulfillmentRate}%
- Aktywne oferty: ${metrics.activeOffers}
- Spotkania: ${metrics.totalMeetings}
- Średnio spotkań na tydzień: ${metrics.avgMeetingsPerWeek}
- Zrealizowane połączenia: ${metrics.successfulMatches}
- Wskaźnik sukcesu dopasowań: ${metrics.matchSuccessRate}%

Kontakty wg firm (top 6):
${contactsByIndustry.map((c: any) => `- ${c.name}: ${c.value}`).join('\n')}

Top kategorie potrzeb:
${topCategories.map((c: any) => `- ${c.category}: ${c.matches}`).join('\n')}

Zdrowie sieci:
- Zdrowe relacje (<30 dni): ${networkHealth.healthyPercent}% (${networkHealth.healthy})
- Ostrzeżenie (30-90 dni): ${networkHealth.warningPercent}% (${networkHealth.warning})
- Krytyczne (>90 dni): ${networkHealth.criticalPercent}% (${networkHealth.critical})

Wygeneruj insights. Odpowiedz TYLKO jako JSON array (bez markdown backticks, bez komentarzy):
[
  {
    "title": "Krótki tytuł (max 50 znaków)",
    "description": "Szczegółowy opis insight (100-150 znaków)",
    "type": "positive" | "warning" | "opportunity"
  }
]

Szukaj:
- Trendów wzrostowych/spadkowych
- Niedoreprezentowanych kategorii (możliwości ekspansji)
- Problemów z utrzymaniem relacji
- Niewystarczająco wykorzystanych połączeń
- Silnych stron sieci

Tone: profesjonalny, konkretny, actionable. Język: polski.`;

    console.log('Generating AI insights...');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "You are a business analytics AI assistant. Always respond with valid JSON only, no markdown." 
          },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Rate limit exceeded. Please try again later.",
            insights: generateFallbackInsights(metrics, networkHealth)
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "Payment required",
            insights: generateFallbackInsights(metrics, networkHealth)
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';
    
    console.log('AI response content:', content);

    // Parse the JSON response
    let insights;
    try {
      // Clean up the response - remove markdown if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      insights = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      insights = generateFallbackInsights(metrics, networkHealth);
    }

    return new Response(
      JSON.stringify({ insights }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in generate-analytics-insights:", error);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        insights: [
          {
            title: "Błąd analizy",
            description: "Nie udało się wygenerować insights. Spróbuj ponownie później.",
            type: "warning"
          }
        ]
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateFallbackInsights(metrics: any, networkHealth: any) {
  const insights = [];

  if (metrics.contactsGrowth > 10) {
    insights.push({
      title: "Silny wzrost sieci",
      description: `Twoja sieć kontaktów rośnie o ${metrics.contactsGrowth}%. Świetny wynik!`,
      type: "positive"
    });
  } else if (metrics.contactsGrowth < 0) {
    insights.push({
      title: "Spadek liczby kontaktów",
      description: "Rozważ aktywniejsze networkowanie aby rozbudować sieć.",
      type: "warning"
    });
  }

  if (networkHealth.criticalPercent > 20) {
    insights.push({
      title: "Relacje wymagają uwagi",
      description: `${networkHealth.criticalPercent}% kontaktów nie miało kontaktu ponad 90 dni.`,
      type: "warning"
    });
  }

  if (metrics.matchSuccessRate > 70) {
    insights.push({
      title: "Wysokie dopasowanie",
      description: `Wskaźnik sukcesu dopasowań wynosi ${metrics.matchSuccessRate}%.`,
      type: "positive"
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: "Sieć stabilna",
      description: "Twoja sieć kontaktów działa poprawnie. Kontynuuj aktywność!",
      type: "positive"
    });
  }

  return insights;
}
