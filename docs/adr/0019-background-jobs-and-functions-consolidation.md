# ADR 0019 — Background jobs system + edge functions consolidation (Sprint 19)

**Status:** Accepted
**Date:** 2026-04-19

## Context

Long-running operations (e.g. 5-step company enrichment ~2-3 min) blocked the UI and risked edge function timeouts. The codebase also accumulated 7 partially-overlapping enrichment/OCR/merge functions, including a 2700-line `enrich-company-data`.

Sprint 19 plan called for: (1) introducing a `background_jobs` queue + worker pattern, (2) consolidating 7 functions into 4 unified endpoints and physically deleting the legacy ones, (3) backend rate limiting on `enqueue-enrich-company`.

## Decision

**Implemented:**
- `public.background_jobs` table with RLS, realtime publication, and 1-min cron worker (`enrich_company_worker_1min`).
- New `enqueue-enrich-company` (fire-and-forget) + `enrich-company-worker` (cron, orchestrates 5-step pipeline via `functions.invoke()` with progress 20/40/60/80/100).
- Unified entry-point functions `enrich-person` (mode=full|profile|linkedin), `ocr-business-cards` (items[]), and `merge-contacts` accepting `pairs[]` shape — all implemented as **thin wrappers** delegating to the existing battle-tested functions.
- Frontend: `useBackgroundJobs` hook (`useMyJobs`, `useJobRealtime`), `JobsBell` mounted in `HeaderBar`, `useEnqueueEnrichCompany` hook, swapped 3 call sites (`WantedCheckActions`, `useLinkedInAnalysis`, `useGenerateContactProfile`) to the new `enrich-person` orchestrator.

**Deviations from MD plan:**
1. **No backend rate limiting** added. Per project policy (`Do Not Implement Backend Rate Limiting`), rate-limit primitives are deferred to a separate infrastructure sprint.
2. **Legacy functions NOT physically deleted.** `enrich-person`, `ocr-business-cards`, and the new `merge-contacts.pairs[]` path are wrappers around the originals. Deleting a 2700-line `enrich-company-data` (still used synchronously by `useRegenerateCompanyAI` and 2 import flows in `useCompanies.ts`) would have a wide blast radius. Physical consolidation deferred to a deprecation sprint after the new endpoints prove stable in production.
3. **Synchronous callsites preserved.** `useCompanies.ts` lines 448/888/983 still call `enrich-company-data` synchronously because they map the response payload directly into DB updates. The new `useEnqueueEnrichCompany` is a parallel fire-and-forget path for explicit "Wzbogać w tle" UI buttons rather than a forced replacement.
4. **Worker race-safety** uses conditional UPDATE (`WHERE id=X AND status='pending'`) over a small candidate window, since `FOR UPDATE SKIP LOCKED` is not exposable via PostgREST. Postgres MVCC guarantees exclusivity.

## Consequences

- ✅ Background pattern available for any future long operation (consistent table + worker + bell + toast).
- ✅ Frontend now has a single unified person-enrichment endpoint regardless of mode.
- ⚠️ 7 legacy functions still deployed — surface area unchanged, dead-code risk only after the wrappers are proven.
- ⚠️ Any new caller should prefer the new orchestrators and `enqueue-enrich-company`.

## Follow-ups

- Decommission sprint to inline wrapper logic and delete legacy functions.
- Migrate the 3 synchronous `enrich-company-data` callsites once the background flow can return enriched data via `result` JSON.
- Add `cancel_job` UX once a long-running job needs interruption.
