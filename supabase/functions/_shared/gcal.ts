// Sprint 14 — Shared Google Calendar helpers
// - AES-GCM encryption for refresh tokens (key derived from SERVICE_ROLE_KEY via HKDF)
// - getValidAccessToken: decrypt refresh_token → exchange for access_token
// - encryptRefreshToken / decryptRefreshToken
//
// Encryption format stored in DB:
//   refresh_token_encrypted = base64(ciphertext+tag)
//   refresh_token_iv        = base64(iv, 12 bytes)

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

// ─── Key derivation ─────────────────────────────────────────────────
let cachedKey: CryptoKey | null = null;

async function getEncryptionKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const seed = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!seed) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing — cannot derive gcal token key");

  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(seed),
    { name: "HKDF" },
    false,
    ["deriveKey"],
  );

  cachedKey = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: enc.encode("gcal-token-key-v1"),
      info: enc.encode("hub-connect-joy/gcal/refresh-token"),
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );

  return cachedKey;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function encryptRefreshToken(
  plain: string,
): Promise<{ ciphertext: string; iv: string }> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plain),
  );
  return {
    ciphertext: bytesToBase64(new Uint8Array(cipher)),
    iv: bytesToBase64(iv),
  };
}

export async function decryptRefreshToken(
  ciphertextB64: string,
  ivB64: string,
): Promise<string> {
  const key = await getEncryptionKey();
  const iv = base64ToBytes(ivB64);
  const cipher = base64ToBytes(ciphertextB64);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, cipher as BufferSource);
  return new TextDecoder().decode(plain);
}

// ─── Token row helpers ──────────────────────────────────────────────
export interface GCalTokenRow {
  id: string;
  tenant_id: string;
  director_id: string;
  refresh_token_encrypted: string | null;
  refresh_token_iv: string | null;
  deprecated_refresh_token_20260419: string | null;
  selected_calendars: string[] | null;
  scopes: string[] | null;
  connected_email: string | null;
}

/**
 * Returns plaintext refresh_token, transparently migrating legacy plaintext rows
 * to the encrypted columns on first read. Returns null if neither is present.
 */
export async function getRefreshToken(
  serviceClient: SupabaseClient,
  row: GCalTokenRow,
): Promise<string | null> {
  if (row.refresh_token_encrypted && row.refresh_token_iv) {
    return await decryptRefreshToken(row.refresh_token_encrypted, row.refresh_token_iv);
  }
  // Legacy migration path: encrypt-on-read
  const legacy = row.deprecated_refresh_token_20260419;
  if (legacy) {
    try {
      const enc = await encryptRefreshToken(legacy);
      await serviceClient
        .from("gcal_tokens")
        .update({
          refresh_token_encrypted: enc.ciphertext,
          refresh_token_iv: enc.iv,
        })
        .eq("id", row.id);
      return legacy;
    } catch (e) {
      console.error("Legacy refresh_token migration failed:", e);
      return legacy;
    }
  }
  return null;
}

/**
 * Exchange refresh_token → access_token. Returns null on invalid_grant
 * (in which case the token row should be deleted by the caller and the
 * user prompted to reconnect).
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ access_token: string; expires_in: number } | { error: string }> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) return { error: "google_oauth_misconfigured" };

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    return { error: data.error || "refresh_failed" };
  }
  return { access_token: data.access_token as string, expires_in: data.expires_in ?? 3600 };
}

/**
 * Convenience: load token row, decrypt refresh_token, exchange for access_token.
 * Returns null if not connected or on permanent failure (caller should jsonResponse).
 */
export async function getValidAccessToken(
  serviceClient: SupabaseClient,
  directorId: string,
): Promise<
  | { ok: true; accessToken: string; row: GCalTokenRow }
  | { ok: false; reason: "not_connected" | "invalid_grant" | "refresh_failed"; message: string }
> {
  const { data: row, error } = await serviceClient
    .from("gcal_tokens")
    .select(
      "id, tenant_id, director_id, refresh_token_encrypted, refresh_token_iv, deprecated_refresh_token_20260419, selected_calendars, scopes, connected_email",
    )
    .eq("director_id", directorId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, reason: "not_connected", message: "Połącz Google Calendar w ustawieniach." };
  }

  const typedRow = row as unknown as GCalTokenRow;
  const refresh = await getRefreshToken(serviceClient, typedRow);
  if (!refresh) {
    return { ok: false, reason: "not_connected", message: "Brak tokena odświeżania. Połącz ponownie." };
  }

  const result = await refreshAccessToken(refresh);
  if ("error" in result) {
    if (result.error === "invalid_grant") {
      await serviceClient.from("gcal_tokens").delete().eq("id", typedRow.id);
      return {
        ok: false,
        reason: "invalid_grant",
        message: "Dostęp do Google Calendar został cofnięty. Połącz ponownie w ustawieniach.",
      };
    }
    return { ok: false, reason: "refresh_failed", message: "Błąd odświeżania tokena Google." };
  }

  return { ok: true, accessToken: result.access_token, row: typedRow };
}

export const GCAL_WRITE_SCOPE = "https://www.googleapis.com/auth/calendar.events";
