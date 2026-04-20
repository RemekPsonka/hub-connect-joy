---
name: e2e-playwright-setup
description: Playwright E2E setup — helpers w e2e/, spec files w tests/e2e/, dnd-kit pointerDrag helper, data-testid na kanban
type: reference
---
Playwright skonfigurowany w `playwright.config.ts` (chromium + mobile, baseURL=localhost:5173).
- Helpery: `e2e/helpers/auth.ts` (login, loginAndSaveState), `e2e/helpers/sgu.ts` (loginAsPartner, gotoSGU), `e2e/helpers/dnd.ts` (pointerDrag).
- Spec files: `tests/e2e/**/*.spec.ts`.
- Storage state: `e2e/.auth/user.json` (zapisywany przez `e2e/global-setup.ts`).
- Credentials: env vars `TEST_USER_EMAIL` / `TEST_USER_PASSWORD`.
- dnd-kit: użyj `pointerDrag(page, source, target)` — Playwright `dragTo()` (HTML5) nie działa z pointer sensorami dnd-kit.
- Selektory testowe: `data-testid="kanban-card"`, `data-testid="column-{stageId}"` (OfferingKanbanBoard), `data-testid="stage-badge-{hot|top|cold}"` (TODO — dodać przy następnej iteracji).
- npm scripts: `test:e2e`, `test:e2e:ui`.
