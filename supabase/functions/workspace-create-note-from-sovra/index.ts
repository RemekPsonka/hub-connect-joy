import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const auth = await verifyAuth(req, supabase);
    if (isAuthError(auth)) return unauthorizedResponse(auth, corsHeaders);
    if (auth.userType !== 'director' || !auth.directorId) {
      return new Response(JSON.stringify({ error: 'Tylko dyrektor może eksportować notatki' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const conversationId: string | undefined = body?.conversation_id;
    const customTitle: string | undefined = body?.title;
    if (!conversationId) {
      return new Response(JSON.stringify({ error: 'conversation_id wymagane' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify conversation belongs to user's tenant
    const { data: conv, error: convErr } = await supabase
      .from('ai_conversations')
      .select('id, title, tenant_id')
      .eq('id', conversationId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle();
    if (convErr || !conv) {
      return new Response(JSON.stringify({ error: 'Konwersacja nie znaleziona' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: messages, error: msgErr } = await supabase
      .from('ai_messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (msgErr) throw msgErr;

    const title = customTitle || conv.title || 'Eksport z Sovry';

    // Build tiptap doc
    const content: any[] = [
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: title }] },
    ];
    for (const m of messages ?? []) {
      const roleLabel = m.role === 'user' ? '👤 Ty' : m.role === 'assistant' ? '🤖 Sovra' : m.role;
      content.push({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: roleLabel }] });
      const text = String(m.content || '').trim();
      if (text) {
        for (const para of text.split(/\n\n+/)) {
          content.push({ type: 'paragraph', content: [{ type: 'text', text: para }] });
        }
      }
    }

    const blocks = { type: 'doc', content };

    const { data: note, error: noteErr } = await supabase
      .from('workspace_notes')
      .insert({
        actor_id: auth.directorId,
        tenant_id: auth.tenantId,
        title,
        blocks,
      })
      .select('id')
      .single();
    if (noteErr) throw noteErr;

    return new Response(JSON.stringify({ note_id: note.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('workspace-create-note-from-sovra error', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
