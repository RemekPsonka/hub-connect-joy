import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BodySchema = z.object({
  email: z.string().trim().email().max(255),
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(50).optional().nullable(),
  region: z.string().trim().max(100).optional().nullable(),
});

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://hub-connect-joy.lovable.app';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Brak autoryzacji' }, 401);
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) return json({ error: 'Nie można zweryfikować użytkownika' }, 401);

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Authorization: must be SGU partner, director, or superadmin (check via RPC executed as the caller)
    const { data: isPartner } = await supabaseUser.rpc('is_sgu_partner');
    const { data: directorId } = await supabaseUser.rpc('get_current_director_id');
    const { data: isSuperadmin } = await supabaseUser.rpc('is_superadmin');
    if (!isPartner && !directorId && !isSuperadmin) {
      return json({ error: 'Brak uprawnień do zapraszania przedstawicieli' }, 403);
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: 'Nieprawidłowe dane', details: parsed.error.flatten().fieldErrors }, 400);
    }
    const { email, first_name, last_name, phone, region } = parsed.data;

    // Resolve tenant_id of the inviter (use the executor of the request)
    const { data: tenantId, error: tenantErr } = await supabaseUser.rpc('get_current_tenant_id');
    if (tenantErr || !tenantId) {
      return json({ error: 'Brak kontekstu tenanta dla aktualnego użytkownika' }, 400);
    }

    // Resolve SGU team_id (optional)
    const { data: teamId } = await supabaseUser.rpc('get_sgu_team_id');

    const fullName = `${first_name} ${last_name}`.trim();
    const redirectTo = `${SITE_URL}/setup-sgu`;

    // Try to invite. If user already exists, fall back to listing and reusing.
    let userId: string | null = null;
    const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, role: 'sgu', first_name, last_name },
      redirectTo,
    });

    if (invited?.user) {
      userId = invited.user.id;
    } else if (inviteErr) {
      const msg = (inviteErr.message ?? '').toLowerCase();
      const isDup = msg.includes('already') || msg.includes('exists') || msg.includes('registered');
      if (!isDup) {
        console.error('inviteUserByEmail failed:', inviteErr.message);
        return json({ error: `Błąd zaproszenia: ${inviteErr.message}` }, 400);
      }

      // Look up existing user by email
      const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (listErr) {
        return json({ error: `Nie można znaleźć istniejącego użytkownika: ${listErr.message}` }, 500);
      }
      const existing = list?.users?.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase());
      if (!existing) {
        return json({ error: 'Użytkownik istnieje w systemie, ale nie znaleziono go po adresie email' }, 404);
      }
      userId = existing.id;
    }

    if (!userId) return json({ error: 'Nie udało się utworzyć ani zlokalizować użytkownika' }, 500);

    // Add SGU role (per tenant)
    const { error: roleErr } = await supabaseAdmin
      .from('user_roles')
      .upsert({ user_id: userId, tenant_id: tenantId, role: 'sgu' }, { onConflict: 'user_id,tenant_id,role' });
    if (roleErr && !`${roleErr.message}`.toLowerCase().includes('duplicate')) {
      console.error('user_roles insert failed:', roleErr.message);
    }

    // Create / upsert profile
    const { error: profErr } = await supabaseAdmin
      .from('sgu_representative_profiles')
      .upsert(
        {
          user_id: userId,
          tenant_id: tenantId,
          team_id: teamId ?? null,
          first_name,
          last_name,
          email,
          phone: phone ?? null,
          region: region ?? null,
          active: true,
          invited_by_user_id: user.id,
        },
        { onConflict: 'user_id' },
      );

    if (profErr) {
      console.error('profile upsert failed:', profErr.message);
      return json({ error: `Błąd zapisu profilu: ${profErr.message}` }, 500);
    }

    return json({ success: true, user_id: userId }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('sgu-invite-representative error:', msg);
    return json({ error: `Błąd serwera: ${msg}` }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
