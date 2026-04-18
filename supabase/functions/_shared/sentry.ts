// Sprint 10 — Lekki Sentry client dla edge functions (bez SDK npm).
// Parsuje DSN i wysyła event do /store endpointu. No-op gdy DSN brak.

interface ParsedDsn {
  protocol: string;
  publicKey: string;
  host: string;
  projectId: string;
}

let cachedDsn: ParsedDsn | null | undefined = undefined;

function parseDsn(): ParsedDsn | null {
  if (cachedDsn !== undefined) return cachedDsn;
  const raw = Deno.env.get('SENTRY_DSN_EDGE');
  if (!raw) {
    cachedDsn = null;
    return null;
  }
  try {
    // DSN format: https://<publicKey>@<host>/<projectId>
    const url = new URL(raw);
    const projectId = url.pathname.replace(/^\//, '');
    if (!url.username || !projectId) {
      cachedDsn = null;
      return null;
    }
    cachedDsn = {
      protocol: url.protocol.replace(':', ''),
      publicKey: url.username,
      host: url.host,
      projectId,
    };
    return cachedDsn;
  } catch (_e) {
    cachedDsn = null;
    return null;
  }
}

export interface SentryContext {
  function_name?: string;
  request_id?: string;
  user_id?: string;
  tenant_id?: string;
  extra?: Record<string, unknown>;
  tags?: Record<string, string>;
}

/**
 * Send error to Sentry. Fire-and-forget, never throws.
 * No-op if SENTRY_DSN_EDGE is not configured.
 */
export function captureException(err: unknown, ctx: SentryContext = {}): void {
  const dsn = parseDsn();
  if (!dsn) return;

  const message = err instanceof Error ? err.message : String(err);
  const stacktrace = err instanceof Error && err.stack ? err.stack : undefined;
  const errType = err instanceof Error ? err.name : 'Error';

  const event = {
    event_id: crypto.randomUUID().replace(/-/g, ''),
    timestamp: Date.now() / 1000,
    platform: 'javascript',
    level: 'error',
    server_name: ctx.function_name ?? 'edge-function',
    environment: Deno.env.get('SUPABASE_ENV') ?? 'production',
    tags: {
      runtime: 'deno-edge',
      ...(ctx.function_name ? { function: ctx.function_name } : {}),
      ...(ctx.tags ?? {}),
    },
    user: ctx.user_id ? { id: ctx.user_id } : undefined,
    extra: {
      ...(ctx.request_id ? { request_id: ctx.request_id } : {}),
      ...(ctx.tenant_id ? { tenant_id: ctx.tenant_id } : {}),
      ...(ctx.extra ?? {}),
    },
    exception: {
      values: [
        {
          type: errType,
          value: message,
          ...(stacktrace
            ? {
                stacktrace: {
                  frames: stacktrace
                    .split('\n')
                    .slice(1, 11)
                    .map((line) => ({ filename: line.trim() })),
                },
              }
            : {}),
        },
      ],
    },
  };

  const url = `${dsn.protocol}://${dsn.host}/api/${dsn.projectId}/store/`;
  const auth = [
    `Sentry sentry_version=7`,
    `sentry_client=lovable-edge/1.0`,
    `sentry_key=${dsn.publicKey}`,
  ].join(', ');

  // Fire-and-forget; nie blokuje response
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sentry-Auth': auth,
    },
    body: JSON.stringify(event),
  }).catch((e) => {
    console.error('[sentry] failed to send event:', e);
  });
}
