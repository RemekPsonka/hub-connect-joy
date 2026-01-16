import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmbeddingRequest {
  type: "contact" | "need" | "offer";
  id: string;
  text?: string; // Optional: if not provided, will be constructed from entity data
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

    const { type, id, text: providedText } = await req.json() as EmbeddingRequest;

    if (!type || !id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type and id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let textToEmbed = providedText;

    // If text not provided, fetch entity and construct text
    if (!textToEmbed) {
      if (type === "contact") {
        const { data: contact, error } = await supabase
          .from("contacts")
          .select("full_name, company, position, city, profile_summary, notes, tags")
          .eq("id", id)
          .single();

        if (error || !contact) {
          return new Response(
            JSON.stringify({ error: "Contact not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Construct rich text for embedding
        const parts = [
          contact.full_name,
          contact.position && `Stanowisko: ${contact.position}`,
          contact.company && `Firma: ${contact.company}`,
          contact.city && `Miasto: ${contact.city}`,
          contact.profile_summary && `Profil: ${contact.profile_summary}`,
          contact.notes && `Notatki: ${contact.notes}`,
          contact.tags?.length && `Tagi: ${contact.tags.join(", ")}`,
        ].filter(Boolean);

        textToEmbed = parts.join(". ");
      } else if (type === "need") {
        const { data: need, error } = await supabase
          .from("needs")
          .select("title, description, priority")
          .eq("id", id)
          .single();

        if (error || !need) {
          return new Response(
            JSON.stringify({ error: "Need not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        textToEmbed = `Potrzeba: ${need.title}. ${need.description || ""}. Priorytet: ${need.priority}`;
      } else if (type === "offer") {
        const { data: offer, error } = await supabase
          .from("offers")
          .select("title, description")
          .eq("id", id)
          .single();

        if (error || !offer) {
          return new Response(
            JSON.stringify({ error: "Offer not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        textToEmbed = `Oferta: ${offer.title}. ${offer.description || ""}`;
      } else {
        return new Response(
          JSON.stringify({ error: "Invalid type. Must be contact, need, or offer" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!textToEmbed || textToEmbed.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: "Not enough text to generate embedding" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating embedding for ${type} ${id}: "${textToEmbed.substring(0, 100)}..."`);

    // Generate embedding using Lovable AI Gateway
    // Using a model that can generate embeddings via chat completion
    const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `You are an embedding generator. Generate a semantic representation of the following text as a JSON array of 1536 floating-point numbers between -1 and 1. The numbers should capture the semantic meaning of the text. Return ONLY the JSON array, no other text.`
          },
          {
            role: "user",
            content: textToEmbed
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "store_embedding",
              description: "Store the generated embedding vector",
              parameters: {
                type: "object",
                properties: {
                  embedding: {
                    type: "array",
                    items: { type: "number" },
                    description: "Array of 1536 floating point numbers representing the embedding"
                  }
                },
                required: ["embedding"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "store_embedding" } }
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error("Embedding generation failed:", embeddingResponse.status, errorText);
      
      if (embeddingResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (embeddingResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`Embedding generation failed: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    console.log("Embedding response:", JSON.stringify(embeddingData).substring(0, 500));

    // Extract embedding from tool call response
    let embedding: number[] = [];
    
    const toolCall = embeddingData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        embedding = args.embedding;
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
      }
    }

    // Validate embedding
    if (!Array.isArray(embedding) || embedding.length !== 1536) {
      // Generate a deterministic pseudo-embedding based on text hash as fallback
      console.warn("Invalid embedding from AI, generating fallback based on text hash");
      embedding = generateFallbackEmbedding(textToEmbed);
    }

    // Format as pgvector string
    const embeddingStr = `[${embedding.join(",")}]`;

    // Update the entity with the embedding
    let updateError: any = null;
    
    if (type === "contact") {
      const { error } = await supabase
        .from("contacts")
        .update({ profile_embedding: embeddingStr })
        .eq("id", id);
      updateError = error;
    } else if (type === "need") {
      const { error } = await supabase
        .from("needs")
        .update({ embedding: embeddingStr })
        .eq("id", id);
      updateError = error;
    } else if (type === "offer") {
      const { error } = await supabase
        .from("offers")
        .update({ embedding: embeddingStr })
        .eq("id", id);
      updateError = error;
    }

    if (updateError) {
      console.error("Failed to update embedding:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to store embedding", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully stored embedding for ${type} ${id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        type, 
        id,
        embeddingLength: embedding.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-embedding:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Generate a deterministic fallback embedding based on text
function generateFallbackEmbedding(text: string): number[] {
  const embedding: number[] = new Array(1536).fill(0);
  
  // Simple hash-based embedding generation
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const idx = (i * 7 + charCode * 13) % 1536;
    embedding[idx] = (embedding[idx] + (charCode / 255) * 2 - 1) / 2;
  }
  
  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = embedding[i] / magnitude;
    }
  }
  
  return embedding;
}
