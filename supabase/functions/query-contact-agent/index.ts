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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ============= AUTHORIZATION CHECK =============
    const authResult = await verifyAuth(req, supabase);
    if (isAuthError(authResult)) {
      return unauthorizedResponse(authResult, corsHeaders);
    }
    const { tenantId } = authResult;
    // ============= END AUTHORIZATION CHECK =============

    const { contact_id, question, session_id, conversation_history } = await req.json();

    if (!contact_id || !question) {
      return new Response(
        JSON.stringify({ error: 'contact_id and question are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============= RESOURCE ACCESS CHECK =============
    const hasAccess = await verifyResourceAccess(supabase, 'contacts', contact_id, tenantId);
    if (!hasAccess) {
      return accessDeniedResponse(corsHeaders, 'Access denied to this contact');
    }
    // ============= END RESOURCE ACCESS CHECK =============

    // Fetch agent memory
    const { data: agentMemory, error: agentError } = await supabase
      .from('contact_agent_memory')
      .select('*')
      .eq('contact_id', contact_id)
      .single();

    if (agentError || !agentMemory) {
      return new Response(
        JSON.stringify({ 
          error: 'Agent not initialized for this contact',
          suggestion: 'Call initialize-contact-agent first'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch fresh contact data with full company analysis
    const { data: contact } = await supabase
      .from('contacts')
      .select(`*, 
        company:companies(
          id, name, industry, website, description, 
          revenue, employees_count, growth_rate,
          ai_analysis, company_analysis_confidence
        ), 
        primary_group:contact_groups(*)`)
      .eq('id', contact_id)
      .single();

    // Fetch recent consultations
    const { data: consultations } = await supabase
      .from('consultations')
      .select('*')
      .eq('contact_id', contact_id)
      .order('scheduled_at', { ascending: false })
      .limit(10);

    // Fetch needs and offers
    const { data: needs } = await supabase.from('needs').select('*').eq('contact_id', contact_id);
    const { data: offers } = await supabase.from('offers').select('*').eq('contact_id', contact_id);
    const { data: taskContacts } = await supabase.from('task_contacts').select('task_id, role, tasks(*)').eq('contact_id', contact_id);
    const { data: biData } = await supabase.from('contact_bi_data').select('*').eq('contact_id', contact_id).maybeSingle();

    // Get conversation history
    let dbConversationHistory: Array<{role: string; content: string}> = [];
    if (session_id) {
      const { data: prevMessages } = await supabase
        .from('agent_conversations')
        .select('role, content')
        .eq('contact_id', contact_id)
        .eq('session_id', session_id)
        .order('created_at', { ascending: true })
        .limit(20);
      dbConversationHistory = prevMessages || [];
    }

    const fullHistory = [...dbConversationHistory, ...(conversation_history || [])];
    const conversationContext = fullHistory.length > 0 
      ? fullHistory.map((m: any) => `${m.role === 'user' ? 'DIRECTOR' : 'AGENT'}: ${m.content}`).join('\n')
      : 'Brak wcześniejszej rozmowy.';

    const profile = agentMemory.agent_profile || {};

    // Extract company data for query context
    const company = contact?.company as any;
    const aiAnalysis = company?.ai_analysis as any;
    
    // Build company context for query
    let companyContext = '';
    if (company) {
      companyContext = `
## DANE FIRMY: ${company.name || 'nieznana'}
- Branża: ${company.industry || 'nieznana'}
- Strona WWW: ${company.website || 'brak'}
- Opis: ${company.description?.substring(0, 200) || 'brak'}
- Przychody: ${company.revenue ? `${company.revenue} PLN` : 'nieznane'}
- Zatrudnienie: ${company.employees_count || 'nieznane'}`;

      if (aiAnalysis) {
        const products = aiAnalysis.products_and_services?.products || [];
        const services = aiAnalysis.products_and_services?.services || [];
        
        companyContext += `

## OFERTA FIRMY
### Produkty (${products.length}):
${products.slice(0, 5).map((p: any) => `- ${p.name || p}`).join('\n') || 'brak'}

### Usługi (${services.length}):
${services.slice(0, 5).map((s: any) => `- ${s.name || s}`).join('\n') || 'brak'}

### Model biznesowy: ${aiAnalysis.business_model?.type || 'nieznany'}
### Klienci: ${(aiAnalysis.clients_projects?.client_types || []).join(', ') || 'nieznani'}
### Konkurenci: ${(aiAnalysis.competition?.competitors || []).slice(0, 3).map((c: any) => c.name || c).join(', ') || 'nieznani'}
### Czego szuka firma: ${aiAnalysis.seeking?.clients?.substring(0, 100) || 'brak danych'}
### Możliwości współpracy: ${(aiAnalysis.collaboration?.opportunities || []).slice(0, 2).map((o: any) => o.area || o).join(', ') || 'brak'}`;
      }
    }

    const prompt = `Jesteś Contact Agent dla kontaktu: ${contact?.full_name}.

## DANE KONTAKTU
- Firma: ${company?.name || contact?.company || 'nieznana'}
- Stanowisko: ${contact?.position || 'nieznane'}
- Siła relacji: ${contact?.relationship_strength}/10
- Notatki: ${contact?.notes || 'Brak'}
- Pain points: ${(profile.pain_points || []).join(', ') || 'nieznane'}
- Cele: ${(profile.goals || []).join(', ') || 'nieznane'}
- Kontekst firmy: ${(profile as any).company_context || 'nieznany'}
${companyContext}

## POTRZEBY KONTAKTU (${needs?.length || 0})
${(needs || []).map(n => `- [${n.status}] ${n.title}`).join('\n') || 'Brak'}

## OFERTY KONTAKTU (${offers?.length || 0})
${(offers || []).map(o => `- [${o.status}] ${o.title}`).join('\n') || 'Brak'}

## KONTEKST ROZMOWY
${conversationContext}

## PYTANIE: "${question}"

Odpowiedz konkretnie i praktycznie. Uwzględnij kontekst OSOBY i jej FIRMY. 
Możesz zaproponować akcje (CREATE_TASK, ADD_NOTE, UPDATE_PROFILE, CREATE_NEED, CREATE_OFFER).

Zwróć JSON:
\`\`\`json
{
  "answer": "odpowiedź uwzględniająca kontekst osoby i firmy",
  "proposed_actions": [{"type": "TYP", "data": {...}, "reason": "..."}],
  "memory_update": {"new_insights": []}
}
\`\`\``;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: prompt }] })
    });

    if (!aiResponse.ok) {
      return new Response(JSON.stringify({ error: 'AI service error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';

    let response;
    try {
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || aiContent.match(/\{[\s\S]*\}/);
      response = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiContent);
    } catch {
      response = { answer: aiContent, proposed_actions: [], memory_update: { new_insights: [] } };
    }

    const currentSessionId = session_id || crypto.randomUUID();

    // Save conversation
    await supabase.from('agent_conversations').insert([
      { tenant_id: tenantId, contact_id, session_id: currentSessionId, role: 'user', content: question, extracted_data: {} },
      { tenant_id: tenantId, contact_id, session_id: currentSessionId, role: 'assistant', content: response.answer, extracted_data: { proposed_actions: response.proposed_actions || [] } }
    ]);

    return new Response(
      JSON.stringify({ success: true, session_id: currentSessionId, contact_name: contact?.full_name, ...response }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
