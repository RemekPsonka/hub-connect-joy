import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "zod";
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";
import { encryptRefreshToken, GCAL_WRITE_SCOPE } from "../_shared/gcal.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PostSchema = z.object({
  action: z.enum(["get-auth-url", "disconnect"]),
});

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events.readonly",
  GCAL_WRITE_SCOPE, // Sprint 14: write access
  // Sprint 15 — Gmail
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function redirectResponse(url: string) {
  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, Location: url },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey) as any;

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  const redirectUri = Deno.env.get("GOOGLE_REDIRECT_URI")!;
  const frontendUrl = Deno.env.get("FRONTEND_URL")!;

  try {
    if (req.method === "GET") {
      return await handleCallback(req, serviceClient, clientId, clientSecret, redirectUri, frontendUrl);
    }

    if (req.method === "POST") {
      const body = await req.json();
      const parsed = PostSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse(
          { error: "Validation error", details: parsed.error.format() },
          400,
        );
      }

      const auth = await verifyAuth(req, serviceClient);
      if (isAuthError(auth)) {
        return unauthorizedResponse(auth, corsHeaders);
      }

      if (auth.userType !== "director" || !auth.directorId) {
        return jsonResponse({ error: "Only directors can manage Google Calendar" }, 403);
      }

      switch (parsed.data.action) {
        case "get-auth-url":
          return handleGetAuthUrl(auth.directorId, auth.tenantId, clientId, redirectUri);
        case "disconnect":
          return await handleDisconnect(auth.directorId, auth.tenantId, serviceClient);
        default:
          return jsonResponse({ error: "Unknown action" }, 400);
      }
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error) {
    console.error("gcal-auth error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

function handleGetAuthUrl(
  directorId: string,
  tenantId: string,
  clientId: string,
  redirectUri: string,
) {
  const state = btoa(JSON.stringify({ director_id: directorId, tenant_id: tenantId }));

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return jsonResponse({ auth_url: `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}` });
}

async function handleCallback(
  req: Request,
  serviceClient: ReturnType<typeof createClient>,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  frontendUrl: string,
) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    console.error("Google OAuth error:", error);
    return redirectResponse(`${frontendUrl}/settings?gcal=error&reason=${encodeURIComponent(error)}`);
  }

  if (!code || !stateParam) {
    return redirectResponse(`${frontendUrl}/settings?gcal=error&reason=missing_params`);
  }

  let directorId: string;
  let tenantId: string;

  try {
    const stateData = JSON.parse(atob(stateParam));
    directorId = stateData.director_id;
    tenantId = stateData.tenant_id;
    if (!directorId || !tenantId) throw new Error("Invalid state data");
  } catch {
    return redirectResponse(`${frontendUrl}/settings?gcal=error&reason=invalid_state`);
  }

  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token || !tokenData.refresh_token) {
      console.error("Token exchange failed:", tokenData);
      return redirectResponse(`${frontendUrl}/settings?gcal=error&reason=token_exchange`);
    }

    let connectedEmail: string | null = null;
    try {
      const userInfoRes = await fetch(GOOGLE_USERINFO_ENDPOINT, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (userInfoRes.ok) {
        const userInfo = await userInfoRes.json();
        connectedEmail = userInfo.email || null;
      }
    } catch (e) {
      console.warn("Failed to fetch user info:", e);
    }

    // Sprint 14: encrypt refresh_token before storage
    const enc = await encryptRefreshToken(tokenData.refresh_token);
    const grantedScopes = typeof tokenData.scope === "string"
      ? (tokenData.scope as string).split(" ").filter(Boolean)
      : [];

    const { error: upsertError } = await serviceClient
      .from("gcal_tokens")
      .upsert(
        ({
          tenant_id: tenantId,
          director_id: directorId,
          refresh_token_encrypted: enc.ciphertext,
          refresh_token_iv: enc.iv,
          scopes: grantedScopes,
          connected_email: connectedEmail,
          // expires_at kept as legacy column; we always re-refresh on demand
          expires_at: new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }) as never,
        { onConflict: "tenant_id,director_id" },
      );

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return redirectResponse(`${frontendUrl}/settings?gcal=error&reason=db_error`);
    }

    return redirectResponse(`${frontendUrl}/settings?gcal=connected`);
  } catch (e) {
    console.error("Callback processing error:", e);
    return redirectResponse(`${frontendUrl}/settings?gcal=error&reason=unknown`);
  }
}

async function handleDisconnect(
  directorId: string,
  tenantId: string,
  serviceClient: ReturnType<typeof createClient>,
) {
  const { error } = await serviceClient
    .from("gcal_tokens")
    .delete()
    .eq("director_id", directorId)
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("Disconnect error:", error);
    return jsonResponse({ error: "Failed to disconnect" }, 500);
  }

  // Also clear cached events
  await serviceClient.from("gcal_events").delete().eq("director_id", directorId);

  return jsonResponse({ success: true });
}
