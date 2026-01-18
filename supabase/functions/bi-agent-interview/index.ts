import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse, verifyResourceAccess, accessDeniedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // ============= AUTHORIZATION CHECK =============
    const authResult = await verifyAuth(req, supabase);
    if (isAuthError(authResult)) {
      return unauthorizedResponse(authResult, corsHeaders);
    }
    const { tenantId } = authResult;
    // ============= END AUTHORIZATION CHECK =============

    const { contactId, sessionId, userMessage } = await req.json();

    if (!contactId || !userMessage) {
      return new Response(JSON.stringify({ error: 'Missing contactId or userMessage' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ============= RESOURCE ACCESS CHECK =============
    const hasAccess = await verifyResourceAccess(supabase, 'contacts', contactId, tenantId);
    if (!hasAccess) {
      return accessDeniedResponse(corsHeaders, 'Access denied to this contact');
    }
    // ============= END RESOURCE ACCESS CHECK =============

    console.log(`BI Interview for contact ${contactId} in tenant ${tenantId}`);

    const { data: contact } = await supabase.from('contacts').select('*, companies(*)').eq('id', contactId).single();
    if (!contact) {
      return new Response(JSON.stringify({ error: 'Contact not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get or create BI data
    let { data: biData } = await supabase.from('contact_bi_data').select('*').eq('contact_id', contactId).single();
    if (!biData) {
      const { data: newBiData } = await supabase.from('contact_bi_data').insert({ contact_id: contactId, tenant_id: tenantId, bi_profile: {}, bi_status: 'incomplete', completeness_score: 0.0 }).select().single();
      biData = newBiData;
    }

    // Get or create session
    let session: any = null;
    if (sessionId) {
      const { data: existingSession } = await supabase.from('bi_interview_sessions').select('*').eq('id', sessionId).single();
      session = existingSession;
    }
    if (!session) {
      const { data: newSession } = await supabase.from('bi_interview_sessions').insert({ contact_bi_id: biData?.id, session_type: 'initial', status: 'in_progress', conversation_log: [] }).select().single();
      session = newSession;
    }

    // Handle special signals
    const endSignals = ['koniec', 'kończymy', 'wystarczy', 'stop'];
    const isEndingRequest = userMessage !== 'START_INTERVIEW' && endSignals.some(s => userMessage.toLowerCase().includes(s));

    if (isEndingRequest) {
      await supabase.from('bi_interview_sessions').update({ status: 'paused', conversation_log: [...(session.conversation_log || []), { speaker: 'user', message: userMessage }, { speaker: 'agent', message: 'OK, wstrzymano.' }] }).eq('id', session.id);
      return new Response(JSON.stringify({ success: true, agent_message: 'OK, wstrzymano.', status: 'paused', session_id: session.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Simple AI-based BI interview
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const prompt = `Prowadzisz wywiad BI z: ${contact.full_name}\nFirma: ${contact.company || contact.companies?.name}\nZebrane dane: ${JSON.stringify(biData?.bi_profile || {})}\n\nWiadomość: "${userMessage}"\n\nWyciągnij dane i zadaj następne pytanie. Zwróć JSON: {"response": "odpowiedź i pytanie", "extracted_data": {"pole": "wartość"}, "next_field": "nazwa_pola"}`;

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: prompt }] })
    });

    if (!aiResp.ok) {
      return new Response(JSON.stringify({ error: 'AI service error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiData = await aiResp.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    let result;
    try {
      const m = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      result = JSON.parse(m ? (m[1] || m[0]) : content);
    } catch { result = { response: content, extracted_data: {}, next_field: null }; }

    // Update BI profile
    if (result.extracted_data && Object.keys(result.extracted_data).length > 0) {
      const updatedProfile = { ...(biData?.bi_profile || {}), ...result.extracted_data };
      await supabase.from('contact_bi_data').update({ bi_profile: updatedProfile, updated_at: new Date().toISOString() }).eq('id', biData?.id);
    }

    // Update session
    await supabase.from('bi_interview_sessions').update({
      conversation_log: [...(session.conversation_log || []), { speaker: 'user', message: userMessage }, { speaker: 'agent', message: result.response }],
      questions_asked: (session.questions_asked || 0) + 1
    }).eq('id', session.id);

    return new Response(
      JSON.stringify({ success: true, agent_message: result.response, extracted_data: result.extracted_data, status: 'in_progress', session_id: session.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
