const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fileBase64, fileName, mimeType } = await req.json();

    if (!fileBase64 || !fileName) {
      return new Response(JSON.stringify({ error: "Missing fileBase64 or fileName" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Analyze this document which is a list of meeting/conference attendees or participants.
Extract ALL people mentioned with the following information for each person:
- full_name (required) - first and last name
- company - company/organization name
- position - job title/position
- industry - industry/sector (infer from company if not stated)

Return a JSON array of objects. Example:
[
  {"full_name": "Jan Kowalski", "company": "ABC Sp. z o.o.", "position": "CEO", "industry": "IT"},
  {"full_name": "Anna Nowak", "company": "XYZ S.A.", "position": "Dyrektor", "industry": "Finanse"}
]

Rules:
- Extract EVERY person you can find in the document
- If a field is unknown, set it to null
- Return ONLY the JSON array, no other text
- Names should be in their original language
- Be thorough - scan every page/section`;

    // Use Lovable AI gateway (Gemini)
    const aiResponse = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat-router`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType || "application/pdf"};base64,${fileBase64}`,
                },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 8000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI response error:", errorText);
      return new Response(
        JSON.stringify({ error: "AI processing failed", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Parse JSON from AI response
    let people: Array<{
      full_name: string;
      company: string | null;
      position: string | null;
      industry: string | null;
    }> = [];

    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        people = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", raw: content }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and clean
    people = people
      .filter((p) => p.full_name && typeof p.full_name === "string" && p.full_name.trim().length > 0)
      .map((p) => ({
        full_name: p.full_name.trim(),
        company: p.company?.trim() || null,
        position: p.position?.trim() || null,
        industry: p.industry?.trim() || null,
      }));

    return new Response(JSON.stringify({ people, count: people.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("parse-meeting-list error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
