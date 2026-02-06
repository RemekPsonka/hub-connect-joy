

# Google Calendar Backend Integration — OAuth Flow + Events API

## Overview

Create the backend infrastructure for Google Calendar integration: a database table for storing OAuth tokens and two Edge Functions (one for the OAuth authorization flow, one for fetching calendar events). No frontend changes in this step.

## Important: Secrets Required First

Before the Edge Functions can work, **4 secrets** must be configured:

- **GOOGLE_CLIENT_ID** — from Google Cloud Console (APIs & Services > Credentials > OAuth 2.0 Client ID)
- **GOOGLE_CLIENT_SECRET** — same location
- **GOOGLE_REDIRECT_URI** — the callback URL, will be: `https://smuaroosnsrqfjsbpxpa.supabase.co/functions/v1/gcal-auth?action=callback`
- **FRONTEND_URL** — the app URL to redirect back to after OAuth (e.g. `https://id-preview--93f778e7-e429-4fd2-9d6f-87734cbd5aca.lovable.app`)

These will be requested via the secrets tool before proceeding with function code.

## What Changes

| Change | File/Resource |
|--------|--------------|
| New table | `gcal_tokens` — stores OAuth access/refresh tokens per director |
| New Edge Function | `supabase/functions/gcal-auth/index.ts` — handles OAuth flow (get URL, callback, disconnect) |
| New Edge Function | `supabase/functions/gcal-events/index.ts` — fetches events from Google Calendar API |
| Modified config | `supabase/config.toml` — add entries for both new functions |

## Database: gcal_tokens Table

```text
gcal_tokens
├── id (uuid PK)
├── tenant_id (uuid FK → tenants, NOT NULL)
├── director_id (uuid FK → directors, NOT NULL)
├── access_token (text, NOT NULL)
├── refresh_token (text, NOT NULL)
├── expires_at (timestamptz, NOT NULL)
├── selected_calendars (jsonb, DEFAULT '[]')
├── connected_email (text)
├── created_at (timestamptz, DEFAULT now())
├── updated_at (timestamptz, DEFAULT now())
└── UNIQUE(tenant_id, director_id)
```

RLS policy: Directors can only access their own row, using `get_current_tenant_id()` and `get_current_director_id()` — same pattern as other tenant-scoped tables in the project.

## Edge Function 1: gcal-auth

### Critical: verify_jwt = false

The OAuth callback from Google arrives as a **GET request without any JWT**. Therefore `verify_jwt` **must be false** for this function. For the authenticated actions (`get-auth-url`, `disconnect`), the function manually calls `verifyAuth()` from the shared auth helper.

### Three Actions

**A) `get-auth-url` (POST, authenticated)**
- Validates JWT via `verifyAuth()`
- Generates a Google OAuth consent URL with:
  - `scope`: `calendar.readonly` + `calendar.events.readonly`
  - `access_type: offline` (to get a refresh token)
  - `prompt: consent` (force re-consent to always get refresh token)
  - `state`: JSON with `director_id` + `tenant_id`, encoded as base64 (verified on callback)
- Returns `{ auth_url: string }`

**B) `callback` (GET, unauthenticated — Google redirect)**
- Receives `code` and `state` from Google as query parameters
- Decodes `state` to get `director_id` and `tenant_id`
- Exchanges `code` for tokens via `POST https://oauth2.googleapis.com/token`
- Fetches user email from `https://www.googleapis.com/oauth2/v2/userinfo`
- Upserts tokens into `gcal_tokens` (using service role client)
- Redirects browser to `${FRONTEND_URL}/settings?gcal=connected`
- On error, redirects to `${FRONTEND_URL}/settings?gcal=error`

**C) `disconnect` (POST, authenticated)**
- Validates JWT via `verifyAuth()`
- Deletes the `gcal_tokens` row for the current director
- Returns `{ success: true }`

### Validation

Zod schema for POST requests:
```text
z.object({
  action: z.enum(['get-auth-url', 'disconnect'])
})
```

GET requests (callback) are validated by checking for `code` and `state` query params.

## Edge Function 2: gcal-events

### verify_jwt = false (with manual auth)

Following the project's existing pattern where all functions use `verify_jwt = false` with manual `verifyAuth()` calls.

### Flow

1. Validate request body with Zod (`time_min`, `time_max`, optional `calendar_ids`)
2. Authenticate via `verifyAuth()`
3. Fetch tokens from `gcal_tokens` for the current director
4. If no tokens found, return `{ error: 'not_connected', message: 'Polacz Google Calendar w ustawieniach' }`
5. Check if `expires_at` has passed — if so, auto-refresh:
   - `POST https://oauth2.googleapis.com/token` with `grant_type: refresh_token`
   - Update `access_token` and `expires_at` in database
   - If refresh fails with `invalid_grant`: delete token row, return `{ error: 'disconnected' }`
6. Fetch events from Google Calendar API for each calendar in `selected_calendars` (or `primary` if empty)
7. Merge, sort by `start.dateTime`, and return

### Response

```text
{
  events: GCalEvent[],
  calendars_synced: number
}
```

Where `GCalEvent`:
```text
{
  id: string,
  summary: string,
  description?: string,
  start: { dateTime: string, date?: string },
  end: { dateTime: string, date?: string },
  location?: string,
  calendar_id: string,
  calendar_name: string,
  color: string,
  htmlLink: string
}
```

## Security Measures

- Google tokens are **never sent to the frontend** — stored only in `gcal_tokens`
- RLS ensures directors can only see their own tokens
- The callback uses a `state` parameter (with director/tenant IDs) to prevent CSRF
- `invalid_grant` errors (user revoked access) are handled by auto-deleting the token and returning a clear error
- All authenticated endpoints use `verifyAuth()` from the shared helper

## config.toml Additions

Both functions use `verify_jwt = false` following the project's existing convention (all 47 functions currently use `verify_jwt = false` with manual auth in code):

```text
[functions.gcal-auth]
verify_jwt = false

[functions.gcal-events]
verify_jwt = false
```

## What is NOT Changed

- No frontend files created or modified
- No existing Edge Functions modified
- No existing database tables modified
- The `_shared/auth.ts` helper is used as-is

