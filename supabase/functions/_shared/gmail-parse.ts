// Sprint 16 — Gmail message parser (RFC2822 from Gmail API payload)

export interface ParsedGmailMessage {
  from: string | null;
  to: string | null;
  cc: string | null;
  bcc: string | null;
  subject: string | null;
  date: string | null; // ISO
  body_plain: string | null;
  body_html: string | null;
  labels: string[];
  headers: Record<string, string>;
  thread_id: string | null;
  message_id: string;
  history_id: string | null;
  snippet: string | null;
  is_unread: boolean;
}

interface GmailHeader { name: string; value: string }
interface GmailPart {
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
}
interface GmailRawMessage {
  id: string;
  threadId?: string;
  historyId?: string;
  snippet?: string;
  labelIds?: string[];
  internalDate?: string;
  payload?: GmailPart;
}

function base64UrlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return "";
  }
}

function walkParts(part: GmailPart, plain: string[], html: string[]): void {
  if (!part) return;
  const mt = (part.mimeType || "").toLowerCase();
  if (part.body?.data) {
    if (mt === "text/plain") plain.push(base64UrlDecode(part.body.data));
    else if (mt === "text/html") html.push(base64UrlDecode(part.body.data));
  }
  if (Array.isArray(part.parts)) {
    for (const p of part.parts) walkParts(p, plain, html);
  }
}

function headerMap(headers?: GmailHeader[]): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) return out;
  for (const h of headers) out[h.name.toLowerCase()] = h.value;
  return out;
}

const MAX_BODY = 1_000_000; // 1MB cap to keep FTS sane

export function parseGmailMessage(raw: GmailRawMessage): ParsedGmailMessage {
  const headers = headerMap(raw.payload?.headers);
  const plain: string[] = [];
  const html: string[] = [];
  if (raw.payload) walkParts(raw.payload, plain, html);

  const dateHeader = headers["date"];
  const internal = raw.internalDate ? new Date(Number(raw.internalDate)).toISOString() : null;
  const date = dateHeader ? new Date(dateHeader).toISOString() : internal;

  let body_plain: string | null = plain.length ? plain.join("\n").slice(0, MAX_BODY) : null;
  const body_html: string | null = html.length ? html.join("\n").slice(0, MAX_BODY) : null;

  // Fallback: derive plain text from HTML if no text/plain part
  if (!body_plain && body_html) {
    body_plain = body_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_BODY);
  }

  return {
    from: headers["from"] ?? null,
    to: headers["to"] ?? null,
    cc: headers["cc"] ?? null,
    bcc: headers["bcc"] ?? null,
    subject: headers["subject"] ?? null,
    date,
    body_plain,
    body_html,
    labels: raw.labelIds ?? [],
    headers,
    thread_id: raw.threadId ?? null,
    message_id: raw.id,
    history_id: raw.historyId ?? null,
    snippet: raw.snippet ?? null,
    is_unread: (raw.labelIds ?? []).includes("UNREAD"),
  };
}

// Extract email address from "Name <user@example.com>" or raw email.
export function extractEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = value.match(/<([^>]+)>/);
  const addr = (m ? m[1] : value).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr) ? addr : null;
}

export function extractAllEmails(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((p) => extractEmail(p))
    .filter((e): e is string => !!e);
}
