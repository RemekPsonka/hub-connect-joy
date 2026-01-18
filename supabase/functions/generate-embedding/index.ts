import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse, verifyResourceAccess, accessDeniedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmbeddingRequest {
  type?: "contact" | "need" | "offer";
  id?: string;
  text?: string; // For direct text embedding (query mode)
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY is not configured. Please add it in Settings." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authorization
    const authResult = await verifyAuth(req, supabase);
    if (isAuthError(authResult)) {
      return unauthorizedResponse(authResult, corsHeaders);
    }

    console.log(`[generate-embedding] Authorized user: ${authResult.user.id}, tenant: ${authResult.tenantId}`);

    const { type, id, text: providedText } = await req.json() as EmbeddingRequest;

    // Query mode: just generate embedding for text and return it
    const isQueryMode = !type && !id && providedText;
    
    // Entity mode: generate and save embedding for an entity
    const isEntityMode = type && id;
    
    if (!isQueryMode && !isEntityMode) {
      return new Response(
        JSON.stringify({ error: "Provide either 'text' for query mode, or 'type' and 'id' for entity mode" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // In entity mode, verify the resource belongs to the user's tenant
    if (isEntityMode) {
      const tableName = type === "contact" ? "contacts" : type === "need" ? "needs" : "offers";
      const hasAccess = await verifyResourceAccess(supabase, tableName, id!, authResult.tenantId);
      if (!hasAccess) {
        return accessDeniedResponse(corsHeaders, `Access denied to ${type} ${id}`);
      }
    }

    let textToEmbed = providedText;

    // If in entity mode and text not provided, fetch entity and construct text
    if (isEntityMode && !textToEmbed) {
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

    console.log(`[OpenAI] Generating embedding for ${type || 'query'} ${id || ''}: "${textToEmbed.substring(0, 100)}..."`);

    // Call OpenAI Embeddings API (dedicated embedding model, NOT chat!)
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small", // Cheapest embedding model, 1536 dimensions
        input: textToEmbed.substring(0, 8000), // Limit to ~8K chars
        encoding_format: "float"
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error("OpenAI API error:", embeddingResponse.status, errorText);
      
      if (embeddingResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (embeddingResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: "Invalid OpenAI API key. Please check your configuration." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (embeddingResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "OpenAI payment required. Please check your OpenAI billing." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`OpenAI API failed: ${embeddingResponse.status} - ${errorText}`);
    }

    const embeddingData = await embeddingResponse.json();
    
    // Extract embedding from OpenAI response
    const embedding = embeddingData.data?.[0]?.embedding;
    
    if (!embedding || !Array.isArray(embedding) || embedding.length !== 1536) {
      console.error(`Invalid embedding from OpenAI: ${embedding?.length} dimensions (expected 1536)`);
      return new Response(
        JSON.stringify({ 
          error: "Invalid embedding received from OpenAI",
          details: `Got ${embedding?.length || 0} dimensions, expected 1536`
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✓ Generated valid 1536D embedding from OpenAI (model: text-embedding-3-small)`);

    // Format as pgvector string
    const embeddingStr = `[${embedding.join(",")}]`;

    // Query mode: just return the embedding without saving
    if (isQueryMode) {
      console.log(`Returning query embedding for: "${textToEmbed.substring(0, 50)}..."`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          embedding: embedding,
          embeddingLength: embedding.length,
          model: "text-embedding-3-small"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Entity mode: Update the entity with the embedding
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

    console.log(`✓ Saved OpenAI embedding for ${type} ${id}, size: ${embedding.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        type, 
        id,
        embeddingLength: embedding.length,
        model: "text-embedding-3-small"
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
