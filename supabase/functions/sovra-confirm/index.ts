// Sprint 05 — Sovra confirm/cancel pending actions
// POST /sovra-confirm { pending_action_id, decision: 'confirm'|'cancel' }
// JWT REQUIRED (default verify_jwt=true). Ownership check po actor_id+tenant_id.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyAuth, isAuthError, unauthorizedResponse } from '../_shared/auth.ts';
import { captureException } from '../_shared/sentry.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface RequestBody {
  pending_action_id: string;
  decision: 'confirm' | 'cancel';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const auth = await verifyAuth(req, supabase);
  if (isAuthError(auth)) return unauthorizedResponse(auth, corsHeaders);
  if (auth.userType !== 'director' || !auth.directorId) {
    return new Response(JSON.stringify({ error: 'Director only' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!body.pending_action_id || !['confirm', 'cancel'].includes(body.decision)) {
    return new Response(JSON.stringify({ error: 'pending_action_id and decision required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Fetch pending action
  const { data: pa, error: paErr } = await supabase
    .from('sovra_pending_actions')
    .select('*')
    .eq('id', body.pending_action_id)
    .maybeSingle();

  if (paErr || !pa) {
    return new Response(JSON.stringify({ error: 'Pending action not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Ownership check (kluczowe!)
  if (pa.actor_id !== auth.directorId || pa.tenant_id !== auth.tenantId) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (pa.status !== 'pending') {
    return new Response(JSON.stringify({ error: `Action already ${pa.status}` }), {
      status: 409,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (new Date(pa.expires_at) < new Date()) {
    await supabase
      .from('sovra_pending_actions')
      .update({ status: 'expired' })
      .eq('id', pa.id);
    return new Response(JSON.stringify({ error: 'Action expired' }), {
      status: 409,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ============ CANCEL ============
  if (body.decision === 'cancel') {
    await supabase
      .from('sovra_pending_actions')
      .update({ status: 'cancelled', confirmed_at: new Date().toISOString() })
      .eq('id', pa.id);

    await supabase.from('ai_messages').insert({
      conversation_id: pa.conversation_id,
      role: 'tool',
      content: JSON.stringify({ status: 'cancelled', tool: pa.tool }),
      tool_results: { name: pa.tool, status: 'cancelled' },
    });

    return new Response(JSON.stringify({ ok: true, status: 'cancelled' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ============ CONFIRM — execute ============
  const args = pa.args as Record<string, unknown>;
  const meta = (pa.metadata as { integration_ready?: boolean }) ?? {};
  let result: Record<string, unknown> = {};
  let execError: string | null = null;

  try {
    if (meta.integration_ready === false) {
      // STUB tools (draft_email, create_calendar_event) — no-op confirm
      result = { ok: true, integration_ready: false, note: 'Akcja zatwierdzona, ale integracja jeszcze nieaktywna.' };
    } else {
      switch (pa.tool) {
        case 'create_contact': {
          const { data, error } = await supabase
            .from('contacts')
            .insert({
              tenant_id: pa.tenant_id,
              director_id: pa.actor_id,
              full_name: String(args.full_name ?? ''),
              email: args.email ? String(args.email) : null,
              phone: args.phone ? String(args.phone) : null,
              company: args.company ? String(args.company) : null,
              position: args.position ? String(args.position) : null,
              notes: args.notes ? String(args.notes) : null,
              source: 'sovra',
            })
            .select('id, full_name')
            .single();
          if (error) throw new Error(error.message);
          result = { contact_id: data.id, title: data.full_name };
          break;
        }
        case 'create_task': {
          if (!args.contact_id) throw new Error('contact_id required');
          const contactId = String(args.contact_id);
          const { data, error } = await supabase
            .from('tasks')
            .insert({
              tenant_id: pa.tenant_id,
              owner_id: pa.actor_id,
              title: String(args.title ?? ''),
              description: args.description ? String(args.description) : null,
              due_date: args.due_date ? String(args.due_date) : null,
              priority: args.priority ? String(args.priority) : 'medium',
              status: 'todo',
              task_type: 'standard',
              visibility: 'private',
            })
            .select('id, title')
            .single();
          if (error) throw new Error(error.message);
          const { error: linkErr } = await supabase
            .from('task_contacts')
            .insert({ task_id: data.id, contact_id: contactId, role: 'primary' });
          if (linkErr) {
            await supabase.from('tasks').delete().eq('id', data.id);
            throw new Error(`Failed to link contact: ${linkErr.message}`);
          }
          result = { task_id: data.id, title: data.title, contact_id: contactId };
          break;
        }
        case 'create_note': {
          const contactId = String(args.contact_id);
          const note = String(args.note ?? '');
          const { data: c, error: ferr } = await supabase
            .from('contacts')
            .select('notes')
            .eq('id', contactId)
            .eq('tenant_id', pa.tenant_id)
            .maybeSingle();
          if (ferr || !c) throw new Error('Kontakt nie znaleziony');
          const stamp = new Date().toLocaleString('pl-PL');
          const newNotes = (c.notes ? c.notes + '\n\n' : '') + `[Sovra ${stamp}] ${note}`;
          const { error: uerr } = await supabase
            .from('contacts')
            .update({ notes: newNotes })
            .eq('id', contactId);
          if (uerr) throw new Error(uerr.message);
          result = { contact_id: contactId, appended: true };
          break;
        }
        case 'update_deal_stage': {
          const dealId = String(args.deal_id);
          const newCat = String(args.new_category);
          const { data, error } = await supabase
            .from('deal_team_contacts')
            .update({ category: newCat })
            .eq('id', dealId)
            .eq('tenant_id', pa.tenant_id)
            .select('id, category')
            .single();
          if (error) throw new Error(error.message);
          result = { deal_id: data.id, new_category: data.category };
          break;
        }
        case 'fill_bi_from_notes': {
          const contactId = String(args.contact_id);
          const { data: contact, error: cErr } = await supabase
            .from('contacts')
            .select('id, full_name, company, position, notes, tenant_id')
            .eq('id', contactId)
            .eq('tenant_id', pa.tenant_id)
            .maybeSingle();
          if (cErr || !contact) throw new Error('Kontakt nie znaleziony');

          const { data: consultations } = await supabase
            .from('consultations')
            .select('scheduled_at, notes, ai_summary, agenda')
            .eq('contact_id', contactId)
            .order('scheduled_at', { ascending: false })
            .limit(10);

          const BI_QUESTIONS = [
            { id: 'business_focus', label: 'Czym zajmuje się biznes kontaktu?' },
            { id: 'top_priority', label: 'Główny priorytet biznesowy na najbliższe 12 miesięcy' },
            { id: 'how_can_we_help', label: 'W czym możemy pomóc?' },
          ];

          const consultationText = (consultations ?? [])
            .map((c) => `- ${c.scheduled_at}: ${[c.agenda, c.notes, c.ai_summary].filter(Boolean).join(' | ')}`)
            .join('\n') || '(brak)';

          const sysPrompt = `Jesteś asystentem doradcy. Na podstawie notatek i konsultacji wypełnij ankietę BI dla kontaktu.
Zwróć WYŁĄCZNIE czysty JSON (bez markdown, bez komentarzy) w formacie:
{"answers": {"<question_id>": "<odpowiedź lub null>"}, "summary": "<2-3 zdania podsumowania>"}

Pytania (użyj dokładnie tych id):
${BI_QUESTIONS.map((q) => `- ${q.id}: ${q.label}`).join('\n')}`;

          const userPrompt = `Kontakt: ${contact.full_name}${contact.position ? `, ${contact.position}` : ''}${contact.company ? ` @ ${contact.company}` : ''}

NOTATKI:
${contact.notes || '(brak)'}

KONSULTACJE (najnowsze):
${consultationText}`;

          const lovableKey = Deno.env.get('LOVABLE_API_KEY');
          if (!lovableKey) throw new Error('LOVABLE_API_KEY missing');

          const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${lovableKey}` },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: sysPrompt },
                { role: 'user', content: userPrompt },
              ],
            }),
          });
          if (!aiResp.ok) throw new Error(`AI gateway error: ${aiResp.status}`);
          const aiJson = await aiResp.json();
          const content: string = aiJson.choices?.[0]?.message?.content ?? '';

          let parsed: { answers?: Record<string, unknown>; summary?: string } = {};
          try {
            const m = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
            parsed = JSON.parse(m ? (m[1] || m[0]) : content);
          } catch {
            parsed = { answers: {}, summary: content.slice(0, 800) };
          }

          const { error: upErr } = await supabase
            .from('contact_bi')
            .upsert({
              contact_id: contactId,
              tenant_id: pa.tenant_id,
              answers: parsed.answers ?? {},
              ai_summary: parsed.summary ?? null,
              filled_by_ai: true,
              last_filled_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          if (upErr) throw new Error(upErr.message);

          result = { contact_id: contactId, filled: true, fields_count: Object.keys(parsed.answers ?? {}).length };
          break;
        }
        case 'create_calendar_event': {
          // Sprint 14: real GCal write via gcal-push-event
          const start = String(args.start ?? '');
          const end = String(args.end ?? args.start ?? '');
          if (!args.title || !start) {
            throw new Error('title i start są wymagane');
          }
          const payload: Record<string, unknown> = {
            summary: String(args.title),
            start,
            end,
          };
          if (args.description) payload.description = String(args.description);

          const { data: pushData, error: pushErr } = await supabase.functions.invoke('gcal-push-event', {
            body: payload,
            headers: { Authorization: req.headers.get('Authorization') ?? '' },
          });
          if (pushErr) throw new Error(pushErr.message);
          if (pushData?.error) {
            throw new Error(pushData.message || pushData.error);
          }
          result = { event_id: pushData.event_id, html_link: pushData.html_link, summary: pushData.summary };
          break;
        }
        default:
          execError = `Tool ${pa.tool} nie jest obsługiwany przez confirm.`;
      }
    }
  } catch (e) {
    execError = (e as Error).message;
    captureException(e, {
      function_name: 'sovra-confirm',
      user_id: auth.user.id,
      tenant_id: auth.tenantId,
      extra: { tool: pa.tool, pending_action_id: pa.id },
    });
  }

  const finalStatus = execError ? 'failed' : 'confirmed';
  await supabase
    .from('sovra_pending_actions')
    .update({
      status: finalStatus,
      result: execError ? null : result,
      error: execError,
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', pa.id);

  await supabase.from('ai_messages').insert({
    conversation_id: pa.conversation_id,
    role: 'tool',
    content: JSON.stringify({ status: finalStatus, tool: pa.tool, ...(execError ? { error: execError } : { result }) }),
    tool_results: {
      name: pa.tool,
      status: finalStatus,
      ...(execError ? { error: execError } : { result }),
    },
  });

  if (execError) {
    return new Response(JSON.stringify({ ok: false, error: execError }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, status: finalStatus, result }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
