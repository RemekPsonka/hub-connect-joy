import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MatchRequest {
  tenantId?: string;
  threshold?: number;
  limit?: number;
  needId?: string; // Optional: find matches for specific need
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get tenant from auth
    const authHeader = req.headers.get("Authorization");
    let tenantId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        const { data: director } = await supabase
          .from("directors")
          .select("tenant_id")
          .eq("user_id", user.id)
          .single();
        
        tenantId = director?.tenant_id ?? null;
      }
    }

    const body = await req.json().catch(() => ({})) as MatchRequest;
    tenantId = body.tenantId || tenantId;
    
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: "Tenant ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const threshold = body.threshold ?? 0.65;
    const limit = body.limit ?? 50;

    console.log(`Finding matches for tenant ${tenantId} with threshold ${threshold}`);

    // Call the database function
    const { data: matches, error } = await supabase.rpc("find_need_offer_matches", {
      p_tenant_id: tenantId,
      p_threshold: threshold,
      p_limit: limit,
    });

    if (error) {
      console.error("Error finding matches:", error);
      return new Response(
        JSON.stringify({ error: "Failed to find matches", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enrich matches with contact names
    const enrichedMatches = await Promise.all(
      (matches || []).map(async (match: any) => {
        const { data: needContact } = await supabase
          .from("contacts")
          .select("full_name, company")
          .eq("id", match.match_need_contact_id)
          .single();

        const { data: offerContact } = await supabase
          .from("contacts")
          .select("full_name, company")
          .eq("id", match.match_offer_contact_id)
          .single();

        return {
          needId: match.match_need_id,
          needTitle: match.match_need_title,
          needContact: needContact?.full_name || "Unknown",
          needCompany: needContact?.company,
          offerId: match.match_offer_id,
          offerTitle: match.match_offer_title,
          offerContact: offerContact?.full_name || "Unknown",
          offerCompany: offerContact?.company,
          similarity: match.similarity,
        };
      })
    );

    // Generate AI explanation for top matches
    if (enrichedMatches.length > 0) {
      const topMatches = enrichedMatches.slice(0, 5);
      
      const explanationResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: "Jesteś ekspertem od networkingu. Dla każdego dopasowania potrzeby do oferty, napisz krótkie (1-2 zdania) wyjaśnienie, dlaczego to połączenie ma sens biznesowy. Odpowiadaj po polsku."
            },
            {
              role: "user",
              content: `Wyjaśnij te dopasowania:\n${topMatches.map((m, i) => 
                `${i + 1}. Potrzeba: "${m.needTitle}" (${m.needContact}) ↔ Oferta: "${m.offerTitle}" (${m.offerContact})`
              ).join("\n")}`
            }
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "provide_explanations",
                description: "Provide explanations for each match",
                parameters: {
                  type: "object",
                  properties: {
                    explanations: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          index: { type: "number" },
                          explanation: { type: "string" }
                        },
                        required: ["index", "explanation"]
                      }
                    }
                  },
                  required: ["explanations"]
                }
              }
            }
          ],
          tool_choice: { type: "function", function: { name: "provide_explanations" } }
        }),
      });

      if (explanationResponse.ok) {
        const explanationData = await explanationResponse.json();
        const toolCall = explanationData.choices?.[0]?.message?.tool_calls?.[0];
        
        if (toolCall?.function?.arguments) {
          try {
            const { explanations } = JSON.parse(toolCall.function.arguments);
            explanations.forEach((exp: { index: number; explanation: string }) => {
              if (enrichedMatches[exp.index - 1]) {
                enrichedMatches[exp.index - 1].aiExplanation = exp.explanation;
              }
            });
          } catch (e) {
            console.warn("Failed to parse AI explanations:", e);
          }
        }
      }
    }

    console.log(`Found ${enrichedMatches.length} matches`);

    return new Response(
      JSON.stringify({ 
        matches: enrichedMatches,
        count: enrichedMatches.length,
        threshold,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in find-matches:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
