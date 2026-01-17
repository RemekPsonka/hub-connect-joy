import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contact_id } = await req.json();

    if (!contact_id) {
      return new Response(
        JSON.stringify({ error: 'contact_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch contact with all related data
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select(`
        *,
        company:companies(*),
        primary_group:contact_groups(*)
      `)
      .eq('id', contact_id)
      .single();

    if (contactError || !contact) {
      console.error('Contact fetch error:', contactError);
      return new Response(
        JSON.stringify({ error: 'Contact not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch consultations
    const { data: consultations } = await supabase
      .from('consultations')
      .select('*')
      .eq('contact_id', contact_id)
      .order('scheduled_at', { ascending: false })
      .limit(10);

    // 3. Fetch needs
    const { data: needs } = await supabase
      .from('needs')
      .select('*')
      .eq('contact_id', contact_id);

    // 4. Fetch offers
    const { data: offers } = await supabase
      .from('offers')
      .select('*')
      .eq('contact_id', contact_id);

    // 5. Fetch tasks related to this contact
    const { data: taskContacts } = await supabase
      .from('task_contacts')
      .select('task_id, role, tasks(*)')
      .eq('contact_id', contact_id);

    // 6. Fetch connections
    const { data: connections } = await supabase
      .from('connections')
      .select(`
        *,
        contact_a:contacts!connections_contact_a_id_fkey(id, full_name, company, position),
        contact_b:contacts!connections_contact_b_id_fkey(id, full_name, company, position)
      `)
      .or(`contact_a_id.eq.${contact_id},contact_b_id.eq.${contact_id}`);

    // Build context for AI
    const consultationsSummary = (consultations || []).map(c => ({
      date: c.scheduled_at,
      status: c.status,
      notes: c.notes?.substring(0, 500),
      agenda: c.agenda,
      summary: c.ai_summary?.substring(0, 500)
    }));

    const connectionsSummary = (connections || []).map(c => {
      const otherContact = c.contact_a?.id === contact_id ? c.contact_b : c.contact_a;
      return {
        name: otherContact?.full_name,
        company: otherContact?.company,
        type: c.connection_type,
        strength: c.strength
      };
    }).filter(c => c.name);

    const prompt = `Jesteś ekspertem w budowaniu profili profesjonalnych kontaktów biznesowych.

## DANE KONTAKTU

**Podstawowe informacje:**
- Imię i nazwisko: ${contact.full_name}
- Stanowisko: ${contact.position || 'nieznane'}
- Firma: ${contact.company || contact.company?.name || 'nieznana'}
- Branża firmy: ${contact.company?.industry || 'nieznana'}
- Opis firmy: ${contact.company?.description || 'brak'}
- Email: ${contact.email || 'brak'}
- Miasto: ${contact.city || 'nieznane'}
- LinkedIn: ${contact.linkedin_url || 'brak'}
- Notatki: ${contact.notes || 'brak'}
- Siła relacji: ${contact.relationship_strength}/10
- Ostatni kontakt: ${contact.last_contact_date || 'nieznany'}

**Potrzeby (${needs?.length || 0}):**
${(needs || []).map(n => `- ${n.title}: ${n.description || ''} (priorytet: ${n.priority}, status: ${n.status})`).join('\n') || 'Brak zdefiniowanych potrzeb'}

**Oferty/Kompetencje (${offers?.length || 0}):**
${(offers || []).map(o => `- ${o.title}: ${o.description || ''} (status: ${o.status})`).join('\n') || 'Brak zdefiniowanych ofert'}

**Historia konsultacji (${consultations?.length || 0}):**
${consultationsSummary.map(c => `- ${c.date}: ${c.status} | Agenda: ${c.agenda || 'brak'} | Notatki: ${c.notes || 'brak'}`).join('\n') || 'Brak historii konsultacji'}

**Powiązania w sieci (${connections?.length || 0}):**
${connectionsSummary.map(c => `- ${c.name} (${c.company || 'brak firmy'}) - typ: ${c.type}, siła: ${c.strength}/10`).join('\n') || 'Brak powiązań'}

**Zadania powiązane (${taskContacts?.length || 0}):**
${(taskContacts || []).map((tc: any) => `- ${tc.tasks?.title || 'Bez tytułu'}: ${tc.tasks?.status || 'nieznany'} (rola: ${tc.role})`).join('\n') || 'Brak zadań'}

---

## ZADANIE

Na podstawie powyższych danych wygeneruj profil agenta AI dla tego kontaktu.

**Zwróć JSON w formacie:**
\`\`\`json
{
  "agent_persona": "Opis jak AI powinno 'myśleć' o tej osobie - jej styl, preferencje, co jest dla niej ważne (2-3 zdania)",
  "agent_profile": {
    "pain_points": ["lista problemów/wyzwań tej osoby"],
    "interests": ["zainteresowania biznesowe i osobiste"],
    "goals": ["cele biznesowe"],
    "communication_style": "jak preferuje komunikację",
    "decision_making": "jak podejmuje decyzje",
    "key_topics": ["tematy do poruszenia przy następnym spotkaniu"]
  },
  "insights": [
    {
      "text": "Konkretny insight/wniosek",
      "source": "skąd pochodzi (notatki/konsultacje/potrzeby/etc)",
      "importance": "high/medium/low"
    }
  ],
  "relationship_recommendations": ["jak budować relację z tą osobą"]
}
\`\`\`

Bądź konkretny i praktyczny. Jeśli brakuje danych, zaznacz to, ale nie wymyślaj.`;

    console.log('Calling AI Gateway to generate agent profile...');

    // Call Lovable AI Gateway
    const aiResponse = await fetch('https://ai.lovable.dev/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', errorText);
      return new Response(
        JSON.stringify({ error: 'AI service error', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';

    console.log('AI Response received, parsing...');

    // Extract JSON from response
    let agentData;
    try {
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                        aiContent.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiContent;
      agentData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      agentData = {
        agent_persona: `${contact.full_name} - kontakt biznesowy wymagający uzupełnienia danych`,
        agent_profile: {
          pain_points: [],
          interests: [],
          goals: [],
          communication_style: 'Do ustalenia',
          decision_making: 'Do ustalenia',
          key_topics: []
        },
        insights: [{
          text: 'Agent wymaga więcej danych do pełnej analizy',
          source: 'system',
          importance: 'high'
        }],
        relationship_recommendations: []
      };
    }

    // Upsert to contact_agent_memory
    const { data: savedAgent, error: saveError } = await supabase
      .from('contact_agent_memory')
      .upsert({
        tenant_id: contact.tenant_id,
        contact_id: contact_id,
        agent_persona: agentData.agent_persona,
        agent_profile: agentData.agent_profile,
        insights: agentData.insights || [],
        last_refresh_at: new Date().toISOString(),
        refresh_sources: {
          initialized_at: new Date().toISOString(),
          data_sources: ['contacts', 'consultations', 'needs', 'offers', 'tasks', 'connections']
        },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'contact_id'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Save error:', saveError);
      return new Response(
        JSON.stringify({ error: 'Failed to save agent', details: saveError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Contact Agent initialized successfully');

    return new Response(
      JSON.stringify({
        success: true,
        agent: savedAgent,
        relationship_recommendations: agentData.relationship_recommendations
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
