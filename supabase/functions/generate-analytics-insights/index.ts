import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsMetrics {
  totalContacts?: number;
  contactsGrowth?: number;
  activeNeeds?: number;
  needsFulfillmentRate?: number;
  totalMeetings?: number;
  avgMeetingsPerWeek?: number;
  successfulMatches?: number;
  matchSuccessRate?: number;
  activeOffers?: number;
}

interface NetworkHealth {
  healthy?: number;
  healthyPercent?: number;
  warning?: number;
  warningPercent?: number;
  critical?: number;
  criticalPercent?: number;
}

interface IndustryData {
  name: string;
  value: number;
}

interface CategoryData {
  category: string;
  matches: number;
}

interface AIInsight {
  title: string;
  description: string;
  type: 'positive' | 'warning' | 'opportunity' | 'info';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authorization
    const authResult = await verifyAuth(req, supabase);
    if (isAuthError(authResult)) {
      return unauthorizedResponse(authResult, corsHeaders);
    }

    console.log(`[generate-analytics-insights] Authorized user: ${authResult.user.id}, tenant: ${authResult.tenantId}`);

    const body = await req.json();
    
    // Support both direct fields and nested analyticsData
    const analyticsData = body.analyticsData || body;
    const { metrics, contactsByIndustry, networkHealth, topCategories } = analyticsData as {
      metrics?: AnalyticsMetrics;
      contactsByIndustry?: IndustryData[];
      networkHealth?: NetworkHealth;
      topCategories?: CategoryData[];
    };

    // Validate minimum required data - return helpful default insights if no data
    if (!metrics || typeof metrics.totalContacts !== 'number' || metrics.totalContacts === 0) {
      console.warn('Incomplete or empty analytics data, returning default insights');
      return new Response(
        JSON.stringify({
          insights: [
            {
              title: "Rozpocznij budowanie sieci",
              description: "Dodaj pierwsze kontakty aby otrzymać inteligentne insights od AI. System przeanalizuje Twoje relacje i zaproponuje konkretne działania.",
              type: "info"
            }
          ] as AIInsight[]
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({
          insights: generateFallbackInsights(metrics, networkHealth)
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build AI prompt with safe access to potentially undefined data
    const industryList = (contactsByIndustry || [])
      .map((c: IndustryData) => `- ${c.name}: ${c.value}`)
      .join('\n') || 'Brak danych o firmach';

    const categoryList = (topCategories || [])
      .map((c: CategoryData) => `- ${c.category}: ${c.matches}`)
      .join('\n') || 'Brak danych o kategoriach';

    const prompt = `Jesteś AI analitykiem danych networkingowych. Przeanalizuj poniższe statystyki i wygeneruj 3-5 kluczowych insights.

DANE:
- Łączna liczba kontaktów: ${metrics.totalContacts || 0}
- Zmiana liczby kontaktów: ${metrics.contactsGrowth || 0}%
- Aktywne potrzeby: ${metrics.activeNeeds || 0}
- Wskaźnik realizacji potrzeb: ${metrics.needsFulfillmentRate || 0}%
- Aktywne oferty: ${metrics.activeOffers || 0}
- Spotkania: ${metrics.totalMeetings || 0}
- Średnio spotkań na tydzień: ${metrics.avgMeetingsPerWeek || 0}
- Zrealizowane połączenia: ${metrics.successfulMatches || 0}
- Wskaźnik sukcesu dopasowań: ${metrics.matchSuccessRate || 0}%

Kontakty wg firm (top 6):
${industryList}

Top kategorie potrzeb:
${categoryList}

${networkHealth ? `Zdrowie sieci:
- Zdrowe relacje (<30 dni): ${networkHealth.healthyPercent || 0}% (${networkHealth.healthy || 0})
- Ostrzeżenie (30-90 dni): ${networkHealth.warningPercent || 0}% (${networkHealth.warning || 0})
- Krytyczne (>90 dni): ${networkHealth.criticalPercent || 0}% (${networkHealth.critical || 0})` : ''}

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

      if (response.status === 429 || response.status === 402) {
        return new Response(
          JSON.stringify({ 
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
    let insights: AIInsight[];
    try {
      // Clean up the response - remove markdown if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      insights = JSON.parse(cleanContent);
      
      // Validate insights structure
      if (!Array.isArray(insights) || insights.length === 0) {
        throw new Error('Invalid insights format');
      }
      
      // Ensure all insights have required fields
      insights = insights.map(insight => ({
        title: insight.title || 'Insight',
        description: insight.description || '',
        type: ['positive', 'warning', 'opportunity', 'info'].includes(insight.type) 
          ? insight.type 
          : 'info'
      }));
      
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
        insights: [
          {
            title: "Analiza w trakcie",
            description: "Trwa przetwarzanie danych. Spróbuj odświeżyć za chwilę lub dodaj więcej kontaktów.",
            type: "info"
          }
        ]
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateFallbackInsights(metrics: AnalyticsMetrics, networkHealth?: NetworkHealth): AIInsight[] {
  const insights: AIInsight[] = [];

  // Analyze contacts growth
  if (metrics.contactsGrowth !== undefined) {
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
  }

  // Analyze network health
  if (networkHealth) {
    const criticalPercent = networkHealth.criticalPercent || 0;
    if (criticalPercent > 20) {
      insights.push({
        title: "Relacje wymagają uwagi",
        description: `${criticalPercent}% kontaktów nie miało kontaktu ponad 90 dni.`,
        type: "warning"
      });
    }
  }

  // Analyze match success rate
  if (metrics.matchSuccessRate !== undefined && metrics.matchSuccessRate > 70) {
    insights.push({
      title: "Wysokie dopasowanie",
      description: `Wskaźnik sukcesu dopasowań wynosi ${metrics.matchSuccessRate}%.`,
      type: "positive"
    });
  }
  
  // Opportunity insight
  if (metrics.activeNeeds !== undefined && metrics.activeNeeds > 5 && 
      (metrics.matchSuccessRate === undefined || metrics.matchSuccessRate < 30)) {
    insights.push({
      title: "Potencjał dopasowań",
      description: "Masz aktywne potrzeby bez dopasowań. Rozważ poszerzenie opisu lub dodanie tagów.",
      type: "opportunity"
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
