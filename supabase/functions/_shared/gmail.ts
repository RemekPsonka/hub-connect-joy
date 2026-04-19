// Sprint 15 — Shared Gmail helpers
// - RFC2822 message builder with UTF-8 subject encoding
// - URL-safe base64 for Gmail API
// - sendGmailMessage / createGmailDraft callable from edge functions OR sovra-confirm

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { getValidAccessToken } from "./gcal.ts";

export interface EmailParams {
  to: string;
  subject: string;
  body: string; // plain text
  cc?: string;
  bcc?: string;
  fromEmail?: string; // resolved from gcal_tokens.connected_email
  fromName?: string;
  inReplyTo?: string;
}

export interface OutboxParams extends EmailParams {
  contactId?: string | null;
}

// ─── RFC2822 builders ──────────────────────────────────────────────
export function base64UrlEncode(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function encodeUtf8Subject(subject: string): string {
  // RFC 2047 encoded-word for UTF-8
  const isAscii = /^[\x20-\x7E]*$/.test(subject);
  if (isAscii) return subject;
  const b64 = base64UrlEncode(subject)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  return `=?UTF-8?B?${b64}?=`;
}

function formatFromHeader(email: string, name?: string): string {
  if (!name) return email;
  const safeName = /^[\x20-\x7E]*$/.test(name) ? `"${name.replace(/"/g, "")}"` : `=?UTF-8?B?${btoa(unescape(encodeURIComponent(name)))}?=`;
  return `${safeName} <${email}>`;
}

export function buildRfc2822(params: EmailParams): string {
  const headers: string[] = [];
  if (params.fromEmail) headers.push(`From: ${formatFromHeader(params.fromEmail, params.fromName)}`);
  headers.push(`To: ${params.to}`);
  if (params.cc) headers.push(`Cc: ${params.cc}`);
  if (params.bcc) headers.push(`Bcc: ${params.bcc}`);
  headers.push(`Subject: ${encodeUtf8Subject(params.subject)}`);
  if (params.inReplyTo) {
    headers.push(`In-Reply-To: ${params.inReplyTo}`);
    headers.push(`References: ${params.inReplyTo}`);
  }
  headers.push("MIME-Version: 1.0");
  headers.push('Content-Type: text/plain; charset="UTF-8"');
  headers.push("Content-Transfer-Encoding: 8bit");
  return headers.join("\r\n") + "\r\n\r\n" + params.body;
}

// ─── Send / Draft ──────────────────────────────────────────────────
export interface GmailSendResult {
  ok: true;
  outbox_id: string;
  gmail_message_id: string;
  gmail_thread_id?: string;
}

export interface GmailDraftResult {
  ok: true;
  outbox_id: string;
  gmail_draft_id: string;
}

export type GmailResult =
  | GmailSendResult
  | GmailDraftResult
  | { ok: false; error: string; outbox_id?: string };

async function insertOutbox(
  serviceClient: SupabaseClient,
  tenantId: string,
  directorId: string,
  params: OutboxParams,
  status: "sending" | "draft",
): Promise<string> {
  const { data, error } = await serviceClient
    .from("gmail_outbox")
    .insert({
      tenant_id: tenantId,
      director_id: directorId,
      contact_id: params.contactId ?? null,
      to: params.to,
      cc: params.cc ?? null,
      bcc: params.bcc ?? null,
      subject: params.subject,
      body_plain: params.body,
      status,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`outbox insert failed: ${error?.message}`);
  return data.id as string;
}

async function logAudit(
  serviceClient: SupabaseClient,
  tenantId: string,
  directorId: string,
  contactId: string | null | undefined,
  action: "email_sent" | "email_drafted",
  meta: Record<string, unknown>,
) {
  await serviceClient.from("audit_log").insert({
    tenant_id: tenantId,
    actor_id: directorId,
    entity_type: "contact",
    entity_id: contactId ?? null,
    action,
    metadata: meta,
  });
}

export async function sendGmailMessage(
  serviceClient: SupabaseClient,
  tenantId: string,
  directorId: string,
  params: OutboxParams,
): Promise<GmailResult> {
  const tok = await getValidAccessToken(serviceClient, directorId);
  if (!tok.ok) return { ok: false, error: tok.message };

  const fromEmail = tok.row.connected_email ?? undefined;
  const outboxId = await insertOutbox(serviceClient, tenantId, directorId, params, "sending");

  try {
    const raw = base64UrlEncode(buildRfc2822({ ...params, fromEmail }));
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tok.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || `Gmail API ${res.status}`;
      await serviceClient
        .from("gmail_outbox")
        .update({ status: "failed", error: msg })
        .eq("id", outboxId);
      return { ok: false, error: msg, outbox_id: outboxId };
    }

    await serviceClient
      .from("gmail_outbox")
      .update({
        status: "sent",
        gmail_message_id: data.id,
        gmail_thread_id: data.threadId ?? null,
        sent_at: new Date().toISOString(),
      })
      .eq("id", outboxId);

    await logAudit(serviceClient, tenantId, directorId, params.contactId, "email_sent", {
      to: params.to,
      subject: params.subject,
      gmail_message_id: data.id,
    });

    return {
      ok: true,
      outbox_id: outboxId,
      gmail_message_id: data.id,
      gmail_thread_id: data.threadId,
    };
  } catch (e) {
    const msg = (e as Error).message;
    await serviceClient
      .from("gmail_outbox")
      .update({ status: "failed", error: msg })
      .eq("id", outboxId);
    return { ok: false, error: msg, outbox_id: outboxId };
  }
}

export async function createGmailDraft(
  serviceClient: SupabaseClient,
  tenantId: string,
  directorId: string,
  params: OutboxParams,
): Promise<GmailResult> {
  const tok = await getValidAccessToken(serviceClient, directorId);
  if (!tok.ok) return { ok: false, error: tok.message };

  const fromEmail = tok.row.connected_email ?? undefined;
  const outboxId = await insertOutbox(serviceClient, tenantId, directorId, params, "draft");

  try {
    const raw = base64UrlEncode(buildRfc2822({ ...params, fromEmail }));
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tok.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: { raw } }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || `Gmail API ${res.status}`;
      await serviceClient
        .from("gmail_outbox")
        .update({ status: "failed", error: msg })
        .eq("id", outboxId);
      return { ok: false, error: msg, outbox_id: outboxId };
    }

    await serviceClient
      .from("gmail_outbox")
      .update({
        gmail_draft_id: data.id,
        gmail_message_id: data.message?.id ?? null,
        gmail_thread_id: data.message?.threadId ?? null,
      })
      .eq("id", outboxId);

    await logAudit(serviceClient, tenantId, directorId, params.contactId, "email_drafted", {
      to: params.to,
      subject: params.subject,
      gmail_draft_id: data.id,
    });

    return { ok: true, outbox_id: outboxId, gmail_draft_id: data.id };
  } catch (e) {
    const msg = (e as Error).message;
    await serviceClient
      .from("gmail_outbox")
      .update({ status: "failed", error: msg })
      .eq("id", outboxId);
    return { ok: false, error: msg, outbox_id: outboxId };
  }
}

export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
export const GMAIL_COMPOSE_SCOPE = "https://www.googleapis.com/auth/gmail.compose";
export const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
