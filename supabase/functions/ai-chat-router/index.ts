import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClassifyRequest {
  query: string;
}

interface ClassifyResponse {
  intent: 'simple' | 'network' | 'match' | 'briefing' | 'analysis';
  confidence: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json() as ClassifyRequest;

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const classifyPrompt = `Jesteś klasyfikatorem intencji użytkownika w aplikacji do zarządzania siecią kontaktów biznesowych.

Klasyfikuj pytanie do jednej z kategorii. Zwróć TYLKO jedno słowo w formacie JSON:

Kategorie:
- "simple" - proste pytania, ogólne rozmowy, pytania o pojedyncze kontakty, zadania, prośby o pomoc
- "network" - pytania o połączenia między ludźmi, kto kogo zna, szukanie ścieżki do osoby, wprowadzenia
- "match" - dopasowanie potrzeb do ofert, szukanie synergii biznesowych, kto potrzebuje czego
- "briefing" - przygotowanie do spotkania, analiza kontekstu wielu kontaktów, analiza branży
- "analysis" - analiza całej sieci, klastry branżowe, statystyki, trendy, kluczowi gracze

Przykłady:
- "Jakie mam zadania na dziś?" → simple
- "Kto mógłby znać prezesa Tauron?" → network  
- "Kto potrzebuje usług AI a kto je oferuje?" → match
- "Przygotuj mnie do spotkania z branżą medyczną" → briefing
- "Jakie klastry branżowe widzisz w mojej sieci?" → analysis
- "Pomóż mi napisać follow-up" → simple
- "Kto powinien poznać kogo?" → match
- "Znajdź mi drogę do Jana Kowalskiego" → network

Pytanie użytkownika: "${query}"

Odpowiedz TYLKO w formacie JSON: {"intent": "kategoria", "confidence": 0.9}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "user", content: classifyPrompt }
        ],
        temperature: 0.1,
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      // Fallback to simple if classification fails
      return new Response(
        JSON.stringify({ intent: 'simple', confidence: 0.5 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';
    
    console.log("AI classification response:", content);

    // Parse the JSON response
    let result: ClassifyResponse;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: try to find the intent keyword
        const lowerContent = content.toLowerCase();
        if (lowerContent.includes('network')) {
          result = { intent: 'network', confidence: 0.7 };
        } else if (lowerContent.includes('match')) {
          result = { intent: 'match', confidence: 0.7 };
        } else if (lowerContent.includes('briefing')) {
          result = { intent: 'briefing', confidence: 0.7 };
        } else if (lowerContent.includes('analysis')) {
          result = { intent: 'analysis', confidence: 0.7 };
        } else {
          result = { intent: 'simple', confidence: 0.6 };
        }
      }
    } catch (parseError) {
      console.error("Failed to parse classification response:", parseError);
      result = { intent: 'simple', confidence: 0.5 };
    }

    // Validate intent
    const validIntents = ['simple', 'network', 'match', 'briefing', 'analysis'];
    if (!validIntents.includes(result.intent)) {
      result.intent = 'simple';
      result.confidence = 0.5;
    }

    console.log("Final classification:", result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Classification error:", error);
    
    // Fallback to simple on any error
    return new Response(
      JSON.stringify({ intent: 'simple', confidence: 0.5 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
