import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authorization
    const authResult = await verifyAuth(req, supabase);
    if (isAuthError(authResult)) {
      return unauthorizedResponse(authResult, corsHeaders);
    }

    console.log(`[generate-meeting-recommendations] Authorized user: ${authResult.user.id}, tenant: ${authResult.tenantId}`);

    const { meetingId, forContactIds } = await req.json();
    
    if (!meetingId || !forContactIds || forContactIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing meetingId or forContactIds' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all participants with their profiles
    const { data: participants, error: participantsError } = await supabase
      .from('meeting_participants')
      .select(`
        contact_id,
        is_member,
        contact:contacts(
          id,
          full_name,
          company,
          position,
          profile_summary,
          notes
        )
      `)
      .eq('meeting_id', meetingId);

    if (participantsError) throw participantsError;
    if (!participants || participants.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Za mało uczestników do generowania rekomendacji' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get tenant_id from any participant contact
    const { data: tenantData } = await supabase
      .from('contacts')
      .select('tenant_id')
      .eq('id', participants[0].contact_id)
      .single();
    
    const tenantId = tenantData?.tenant_id;

    // Get needs and offers for all participants
    const contactIds = participants.map(p => p.contact_id);
    
    const [needsResult, offersResult] = await Promise.all([
      supabase
        .from('needs')
        .select('id, title, description, contact_id')
        .in('contact_id', contactIds)
        .eq('status', 'active'),
      supabase
        .from('offers')
        .select('id, title, description, contact_id')
        .in('contact_id', contactIds)
        .eq('status', 'active')
    ]);

    const needs = needsResult.data || [];
    const offers = offersResult.data || [];

    // Build context for each participant
    const participantProfiles = participants.map((p: any) => {
      const contactNeeds = needs.filter((n: any) => n.contact_id === p.contact_id);
      const contactOffers = offers.filter((o: any) => o.contact_id === p.contact_id);
      const contact = p.contact as any;
      
      return {
        id: p.contact_id,
        name: contact?.full_name || 'Nieznany',
        company: contact?.company || '',
        position: contact?.position || '',
        profile: contact?.profile_summary || '',
        needs: contactNeeds.map((n: any) => n.title).join(', ') || 'Brak',
        offers: contactOffers.map((o: any) => o.title).join(', ') || 'Brak',
        isMember: p.is_member
      };
    });

    const allRecommendations: any[] = [];

    // Generate recommendations for each selected member
    for (const forContactId of forContactIds) {
      const forContact = participantProfiles.find(p => p.id === forContactId);
      if (!forContact) continue;

      const otherParticipants = participantProfiles.filter(p => p.id !== forContactId);
      
      if (otherParticipants.length === 0) continue;

      const prompt = `Jesteś ekspertem od networkingu biznesowego. Twoim zadaniem jest wybranie najlepszych osób do rozmowy 1x1 podczas spotkania networkingowego.

CZŁONEK KLUBU (dla którego szukamy rekomendacji):
Imię: ${forContact.name}
Firma: ${forContact.company}
Stanowisko: ${forContact.position}
Profil: ${forContact.profile}
Potrzeby: ${forContact.needs}
Oferty: ${forContact.offers}

INNI UCZESTNICY SPOTKANIA:
${otherParticipants.map((p, i) => `
${i + 1}. ${p.name} (${p.company})
   Stanowisko: ${p.position}
   Profil: ${p.profile}
   Potrzeby: ${p.needs}
   Oferty: ${p.offers}
`).join('\n')}

ZADANIE:
Wybierz maksymalnie 5 najlepszych osób do rozmowy dla ${forContact.name}.
Priorytetyzuj dopasowania na podstawie:
1. Potrzeby jednej osoby pasujące do ofert drugiej (need-offer match)
2. Komplementarne kompetencje i możliwości współpracy (synergy)
3. Wspólne branże lub zainteresowania biznesowe (networking)

Dla każdej rekomendacji podaj:
- Numer osoby z listy powyżej
- Uzasadnienie (2-3 zdania po polsku)
- Konkretne tematy do rozmowy (3 punkty)
- Typ dopasowania: need-offer, offer-need, synergy lub networking`;

      console.log(`Generating recommendations for ${forContact.name}...`);

      // Call Lovable AI with tool calling for structured output
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [{ role: 'user', content: prompt }],
          tools: [{
            type: 'function',
            function: {
              name: 'provide_recommendations',
              description: 'Zwraca listę rekomendowanych osób do rozmowy',
              parameters: {
                type: 'object',
                properties: {
                  recommendations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        participant_index: { 
                          type: 'number',
                          description: 'Numer osoby z listy (1-indexed)'
                        },
                        reasoning: { 
                          type: 'string',
                          description: 'Uzasadnienie rekomendacji (2-3 zdania po polsku)'
                        },
                        talking_points: { 
                          type: 'string',
                          description: 'Konkretne tematy do rozmowy (3 punkty oddzielone średnikami)'
                        },
                        match_type: { 
                          type: 'string',
                          enum: ['need-offer', 'offer-need', 'synergy', 'networking'],
                          description: 'Typ dopasowania'
                        }
                      },
                      required: ['participant_index', 'reasoning', 'talking_points', 'match_type']
                    },
                    maxItems: 5
                  }
                },
                required: ['recommendations']
              }
            }
          }],
          tool_choice: { type: 'function', function: { name: 'provide_recommendations' } }
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('AI API error:', aiResponse.status, errorText);
        
        // Fallback to random recommendations if AI fails
        const shuffled = [...otherParticipants].sort(() => Math.random() - 0.5).slice(0, 5);
        shuffled.forEach((p, index) => {
          allRecommendations.push({
            meeting_id: meetingId,
            for_contact_id: forContactId,
            recommended_contact_id: p.id,
            rank: index + 1,
            reasoning: 'Rekomendacja automatyczna - warto poznać innych uczestników spotkania.',
            talking_points: 'Zapytaj o aktualne projekty; Omów wyzwania branżowe; Poszukaj obszarów współpracy',
            match_type: 'networking',
            status: 'pending'
          });
        });
        continue;
      }

      const aiData = await aiResponse.json();
      console.log('AI response:', JSON.stringify(aiData, null, 2));

      // Parse tool call response
      let parsedRecs: any[] = [];
      try {
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          const args = JSON.parse(toolCall.function.arguments);
          parsedRecs = args.recommendations || [];
        }
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
      }

      // Convert AI recommendations to database format
      parsedRecs.forEach((rec: any, index: number) => {
        const participantIndex = rec.participant_index - 1; // Convert to 0-indexed
        if (participantIndex >= 0 && participantIndex < otherParticipants.length) {
          const recommendedContact = otherParticipants[participantIndex];
          allRecommendations.push({
            meeting_id: meetingId,
            for_contact_id: forContactId,
            recommended_contact_id: recommendedContact.id,
            rank: index + 1,
            reasoning: rec.reasoning || 'Potencjalna wartość biznesowa',
            talking_points: rec.talking_points || 'Omów aktualne projekty i wyzwania',
            match_type: rec.match_type || 'networking',
            status: 'pending'
          });
        }
      });

      // If no AI recommendations, add fallback
      if (parsedRecs.length === 0) {
        const shuffled = [...otherParticipants].sort(() => Math.random() - 0.5).slice(0, 3);
        shuffled.forEach((p, index) => {
          allRecommendations.push({
            meeting_id: meetingId,
            for_contact_id: forContactId,
            recommended_contact_id: p.id,
            rank: index + 1,
            reasoning: 'Warto poznać innych uczestników spotkania i nawiązać kontakt.',
            talking_points: 'Przedstaw się i opowiedz o swojej działalności; Zapytaj o aktualne wyzwania; Poszukaj punktów wspólnych',
            match_type: 'networking',
            status: 'pending'
          });
        });
      }
    }

    // Delete existing recommendations for these contacts
    const { error: deleteError } = await supabase
      .from('meeting_recommendations')
      .delete()
      .eq('meeting_id', meetingId)
      .in('for_contact_id', forContactIds);

    if (deleteError) {
      console.error('Error deleting old recommendations:', deleteError);
    }

    // Insert new recommendations
    if (allRecommendations.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('meeting_recommendations')
        .insert(allRecommendations)
        .select();

      if (insertError) throw insertError;

      // Update meeting flag
      await supabase
        .from('group_meetings')
        .update({ recommendations_generated: true })
        .eq('id', meetingId);

      console.log(`✓ Generated ${inserted?.length || 0} recommendations`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          count: inserted?.length || 0,
          recommendations: inserted 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, count: 0, recommendations: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating recommendations:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
