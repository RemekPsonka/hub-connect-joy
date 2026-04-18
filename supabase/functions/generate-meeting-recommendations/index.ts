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

    // ──────────────────────────────────────────────
    // 1. Get all participants with contacts + prospect data
    // ──────────────────────────────────────────────
    const { data: participants, error: participantsError } = await supabase
      .from('meeting_participants')
      .select(`
        id, contact_id, is_member, is_new, prospect_id,
        contact:contacts(id, full_name, company, position, profile_summary, notes, tags, primary_group_id)
      `)
      .eq('meeting_id', meetingId);

    if (participantsError) throw participantsError;
    if (!participants || participants.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Za mało uczestników do generowania rekomendacji' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contactIds = participants.filter(p => p.contact_id).map(p => p.contact_id!);
    const prospectIds = participants.filter(p => p.prospect_id).map(p => p.prospect_id!);

    // ──────────────────────────────────────────────
    // 2. Fetch enrichment data in parallel
    // ──────────────────────────────────────────────
    const [
      needsResult,
      offersResult,
      biResult,
      prospectsResult,
      pastMeetingsResult,
    ] = await Promise.all([
      supabase.from('needs').select('id, title, description, contact_id').in('contact_id', contactIds).eq('status', 'active'),
      supabase.from('offers').select('id, title, description, contact_id').in('contact_id', contactIds).eq('status', 'active'),
      supabase.from('contact_bi')
        .select('contact_id, answers, ai_summary')
        .in('contact_id', contactIds),
      prospectIds.length > 0
        ? supabase.from('meeting_prospects').select('id, full_name, company, position, industry, ai_brief, prospecting_notes').in('id', prospectIds)
        : Promise.resolve({ data: [] }),
      supabase.from('one_on_one_meetings').select('contact_a_id, contact_b_id').or(
        contactIds.map(id => `contact_a_id.eq.${id},contact_b_id.eq.${id}`).join(',')
      ),
    ]);

    const needs = needsResult.data || [];
    const offers = offersResult.data || [];
    const biData = biResult.data || [];
    const prospectsData = (prospectsResult as any).data || [];
    const pastMeetings = pastMeetingsResult.data || [];

    // ──────────────────────────────────────────────
    // 3. Build meeting history map
    // ──────────────────────────────────────────────
    const meetingHistoryMap: Record<string, number> = {};
    pastMeetings.forEach((m: any) => {
      const key1 = `${m.contact_a_id}_${m.contact_b_id}`;
      const key2 = `${m.contact_b_id}_${m.contact_a_id}`;
      meetingHistoryMap[key1] = (meetingHistoryMap[key1] || 0) + 1;
      meetingHistoryMap[key2] = (meetingHistoryMap[key2] || 0) + 1;
    });

    // ──────────────────────────────────────────────
    // 4. Build prospect map by prospect_id
    // ──────────────────────────────────────────────
    const prospectMap: Record<string, any> = {};
    prospectsData.forEach((p: any) => { prospectMap[p.id] = p; });

    // BI data map by contact_id
    const biMap: Record<string, any> = {};
    biData.forEach((bi: any) => { biMap[bi.contact_id] = bi; });

    // ──────────────────────────────────────────────
    // 5. Build participant profiles
    // ──────────────────────────────────────────────
    const participantProfiles = participants.map((p: any) => {
      const contact = p.contact as any;
      const isProspect = !!p.prospect_id;
      const prospect = isProspect ? prospectMap[p.prospect_id] : null;
      const bi = contact ? biMap[p.contact_id] : null;
      const contactNeeds = needs.filter((n: any) => n.contact_id === p.contact_id);
      const contactOffers = offers.filter((o: any) => o.contact_id === p.contact_id);

      // For prospect without contact, use prospect data
      const name = contact?.full_name || prospect?.full_name || 'Nieznany';
      const company = contact?.company || prospect?.company || '';
      const position = contact?.position || prospect?.position || '';

      return {
        id: p.contact_id || `prospect_${p.prospect_id}`,
        participantId: p.id,
        name,
        company,
        position,
        profile: contact?.profile_summary || '',
        notes: contact?.notes || '',
        tags: contact?.tags || [],
        needs: contactNeeds.map((n: any) => n.title).join(', ') || 'Brak',
        offers: contactOffers.map((o: any) => o.title).join(', ') || 'Brak',
        isMember: !!p.is_member,
        isNew: !!p.is_new,
        isProspect,
        prospectId: p.prospect_id,
        contactId: p.contact_id,
        // BI data
        biNeeds: bi?.section_g_needs ? JSON.stringify(bi.section_g_needs) : null,
        biValue: bi?.section_j_value_for_cc ? JSON.stringify(bi.section_j_value_for_cc) : null,
        biStrategy: bi?.section_f_strategy ? JSON.stringify(bi.section_f_strategy) : null,
        biCompany: bi?.section_c_company_profile ? JSON.stringify(bi.section_c_company_profile) : null,
        biPersonal: bi?.section_l_personal ? JSON.stringify(bi.section_l_personal) : null,
        // Prospect AI brief
        aiBrief: prospect?.ai_brief || null,
        prospectingNotes: prospect?.prospecting_notes || null,
        industry: prospect?.industry || null,
        type: p.is_member ? 'CZŁONEK' : (isProspect ? 'PROSPECT' : 'GOŚĆ CC'),
      };
    });

    const allRecommendations: any[] = [];

    // ──────────────────────────────────────────────
    // 6. Generate recommendations for each selected contact
    // ──────────────────────────────────────────────
    for (const forContactId of forContactIds) {
      const forContact = participantProfiles.find(p => p.id === forContactId || p.contactId === forContactId);
      if (!forContact) continue;

      // Other participants (excluding the member themselves)
      const otherParticipants = participantProfiles.filter(p => 
        (p.id !== forContactId && p.contactId !== forContactId)
      );

      // Separate into categories for AI
      const prospects = otherParticipants.filter(p => p.isProspect);
      const guests = otherParticipants.filter(p => !p.isMember && !p.isProspect);
      const members = otherParticipants.filter(p => p.isMember);

      // Build meeting history text for this contact
      const historyLines: string[] = [];
      otherParticipants.forEach(other => {
        const key = `${forContactId}_${other.contactId || other.id}`;
        const count = meetingHistoryMap[key] || 0;
        if (count > 0) {
          historyLines.push(`- ${other.name}: spotkali się ${count}x`);
        }
      });

      // Build enriched profile for AI
      const buildParticipantDesc = (p: any, index: number) => {
        let desc = `${index + 1}. ${p.name} (${p.company || 'brak firmy'}) [${p.type}]
   Stanowisko: ${p.position || 'brak'}
   Profil: ${p.profile || 'brak'}
   Potrzeby: ${p.needs}
   Oferty: ${p.offers}`;
        if (p.aiBrief) {
          desc += `\n   AI BRIEF PROSPEKTA:\n   ${p.aiBrief.substring(0, 800)}`;
        }
        if (p.prospectingNotes) {
          desc += `\n   Notatki prospektingowe: ${p.prospectingNotes}`;
        }
        if (p.industry) {
          desc += `\n   Branża: ${p.industry}`;
        }
        return desc;
      };

      // Ordered: prospects first, then guests, then members
      const orderedOthers = [...prospects, ...guests, ...members];

      if (orderedOthers.length === 0) continue;

      const prompt = `Jesteś ekspertem od networkingu biznesowego. Twoim zadaniem jest wybranie najlepszych osób do rozmowy 1x1 podczas spotkania networkingowego.

CZŁONEK KLUBU (dla którego szukamy rekomendacji):
Imię: ${forContact.name}
Firma: ${forContact.company}
Stanowisko: ${forContact.position}
Profil: ${forContact.profile}
Notatki: ${forContact.notes || 'brak'}
Tagi: ${forContact.tags?.join(', ') || 'brak'}
Potrzeby: ${forContact.needs}
Oferty: ${forContact.offers}
${forContact.biNeeds ? `\nPOTRZEBY BIZNESOWE (z BI):\n${forContact.biNeeds}` : ''}
${forContact.biValue ? `\nWARTOŚĆ DLA SPOŁECZNOŚCI (z BI):\n${forContact.biValue}` : ''}
${forContact.biStrategy ? `\nSTRATEGIA FIRMY (z BI):\n${forContact.biStrategy}` : ''}
${forContact.biPersonal ? `\nINFORMACJE OSOBISTE (z BI):\n${forContact.biPersonal}` : ''}

ZASADY DOPASOWANIA:
1. PRIORYTET NAJWYŻSZY: Łącz z PROSPEKTAMI -- to najważniejsze spotkania!
2. PRIORYTET WYSOKI: Łącz z GOŚĆMI CC (nie-członkami)
3. ZAKAZANE: NIE rekomenduj spotkań z innymi CZŁONKAMI -- oni się już znają
4. Minimum 3, maksimum 5 rekomendacji
5. Unikaj par które już się spotkały (historia poniżej)
6. Uzasadnienie: 2-3 zdania po polsku, konkretne i merytoryczne

${historyLines.length > 0 ? `HISTORIA SPOTKAŃ 1:1 (unikaj powtórek!):\n${historyLines.join('\n')}` : 'Brak historii spotkań 1:1.'}

UCZESTNICY SPOTKANIA (uporządkowani wg priorytetu):
${orderedOthers.map((p, i) => buildParticipantDesc(p, i)).join('\n\n')}

ZADANIE:
Wybierz minimum 3, maksimum 5 najlepszych osób do rozmowy 1x1 dla ${forContact.name}.
Priorytetyzuj PROSPEKTÓW i GOŚCI CC. NIE rekomenduj CZŁONKÓW chyba że nie ma wystarczającej liczby prospektów/gości.
Podaj numer osoby z listy powyżej, uzasadnienie i tematy do rozmowy.`;

      console.log(`Generating recommendations for ${forContact.name} (${orderedOthers.length} candidates)...`);

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
              description: 'Zwraca listę rekomendowanych osób do rozmowy 1x1',
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
                    minItems: 3,
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
        // Fallback: prioritize prospects and guests
        const fallbackCandidates = [...prospects, ...guests].slice(0, 5);
        if (fallbackCandidates.length < 3) {
          fallbackCandidates.push(...members.slice(0, 3 - fallbackCandidates.length));
        }
        fallbackCandidates.slice(0, 5).forEach((p, index) => {
          allRecommendations.push({
            meeting_id: meetingId,
            for_contact_id: forContactId,
            recommended_contact_id: p.contactId || null,
            rank: index + 1,
            reasoning: 'Rekomendacja automatyczna -- warto poznać tego uczestnika spotkania.',
            talking_points: 'Zapytaj o aktualne projekty; Omów wyzwania branżowe; Poszukaj obszarów współpracy',
            match_type: 'networking',
            status: 'pending'
          });
        });
        continue;
      }

      const aiData = await aiResponse.json();
      console.log('AI response received for', forContact.name);

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
        const participantIndex = rec.participant_index - 1;
        if (participantIndex >= 0 && participantIndex < orderedOthers.length) {
          const recommendedParticipant = orderedOthers[participantIndex];
          allRecommendations.push({
            meeting_id: meetingId,
            for_contact_id: forContactId,
            recommended_contact_id: recommendedParticipant.contactId || null,
            rank: index + 1,
            reasoning: rec.reasoning || 'Potencjalna wartość biznesowa',
            talking_points: rec.talking_points || 'Omów aktualne projekty i wyzwania',
            match_type: rec.match_type || 'networking',
            status: 'pending'
          });
        }
      });

      // Fallback: ensure minimum 3 recommendations
      const currentRecs = allRecommendations.filter(r => r.for_contact_id === forContactId);
      if (currentRecs.length < 3) {
        const usedIds = new Set(currentRecs.map(r => r.recommended_contact_id));
        const remaining = [...prospects, ...guests, ...members]
          .filter(p => !usedIds.has(p.contactId) && !usedIds.has(p.id));
        const needed = 3 - currentRecs.length;
        remaining.slice(0, needed).forEach((p, index) => {
          allRecommendations.push({
            meeting_id: meetingId,
            for_contact_id: forContactId,
            recommended_contact_id: p.contactId || null,
            rank: currentRecs.length + index + 1,
            reasoning: 'Warto poznać tego uczestnika spotkania i nawiązać kontakt.',
            talking_points: 'Przedstaw się i opowiedz o swojej działalności; Zapytaj o aktualne wyzwania; Poszukaj punktów wspólnych',
            match_type: 'networking',
            status: 'pending'
          });
        });
      }
    }

    // ──────────────────────────────────────────────
    // 7. Save to database
    // ──────────────────────────────────────────────
    const { error: deleteError } = await supabase
      .from('meeting_recommendations')
      .delete()
      .eq('meeting_id', meetingId)
      .in('for_contact_id', forContactIds);

    if (deleteError) {
      console.error('Error deleting old recommendations:', deleteError);
    }

    // Filter out recommendations with null recommended_contact_id
    const validRecommendations = allRecommendations.filter(r => r.recommended_contact_id != null);

    if (validRecommendations.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('meeting_recommendations')
        .insert(validRecommendations)
        .select();

      if (insertError) throw insertError;

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
