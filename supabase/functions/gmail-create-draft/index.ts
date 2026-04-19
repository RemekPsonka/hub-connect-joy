// Sprint 15 — POST /gmail-create-draft
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "zod";
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";
import { createGmailDraft } from "../_shared/gmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(998),
  body: z.string().min(1),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  contact_id: z.string().uuid().optional(),
});

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const auth = await verifyAuth(req, serviceClient);
  if (isAuthError(auth)) return unauthorizedResponse(auth, corsHeaders);
  if (auth.userType !== "director" || !auth.directorId) {
    return jsonResponse({ error: "Director only" }, 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: "Validation error", details: parsed.error.flatten() }, 400);
  }

  const result = await createGmailDraft(serviceClient, auth.tenantId, auth.directorId, {
    to: parsed.data.to,
    subject: parsed.data.subject,
    body: parsed.data.body,
    cc: parsed.data.cc,
    bcc: parsed.data.bcc,
    contactId: parsed.data.contact_id ?? null,
  });

  if (!result.ok) return jsonResponse(result, 500);
  return jsonResponse(result);
});
