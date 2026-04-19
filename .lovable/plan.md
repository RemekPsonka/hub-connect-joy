
## Plan: Wymuś landing SGU dla użytkowników bez dostępu do CRM

### Problem
Obecny `PostLoginRedirect` przekierowuje do SGU tylko jeśli użytkownik ląduje na `/` lub `/login`. Dla SGU-only userów (Paweł, Adam — bez `directors`/`assistants`) — `/` jest chronione `DirectorGuard`, więc dostają redirect do `/login` albo pusty ekran. Dodatkowo redirect odpala się tylko raz per session (flag `sgu.post-login-redirect-done`), więc po wylogowaniu/odświeżeniu może nie zadziałać poprawnie.

### Rozwiązanie

**1. `src/components/auth/PostLoginRedirect.tsx`**
- Zmień warunek: zamiast „tylko z `/` lub `/login`" → przekieruj zawsze gdy SGU-only user trafi na trasę CRM (`/`, `/contacts*`, `/meetings*`, `/calendar` itd. — czyli cokolwiek poza `/sgu/*`, `/login`, `/forgot-password`, `/setup-sgu`).
- Dla SGU-only (rep/partner bez `director`/`isAssistant`/`isAdmin`/`isSuperadmin`) — twardy redirect na ich landing (rep → `?view=tasks`, partner → `?view=kanban`).
- Dla mieszanych (np. director + sgu) — zostaje obecna logika one-shot z `/` lub `/login`.
- Czyść flag `sgu.post-login-redirect-done` przy logout (dorzucę w `AuthContext.signOut` lub przy zmianie `user` na `null`).

**2. `src/components/auth/AuthGuard.tsx`** (sprawdzę najpierw — może wystarczy sam PostLoginRedirect)
- Jeśli `AuthGuard` po sukcesie sesji zostawia usera na trasie CRM, dorzucę tam fallback redirect dla SGU-only.

**3. `DirectorGuard` / `CRMOnlyGuard`** — sprawdzę co dziś robią dla SGU-only na `/`. Jeśli pokazują „brak dostępu" zamiast redirectu — zmienię na `<Navigate to="/sgu/...">`.

### Pliki
- `src/components/auth/PostLoginRedirect.tsx` (główna zmiana — usunięcie one-shot dla SGU-only, redirect z dowolnej CRM trasy)
- `src/contexts/AuthContext.tsx` (czyszczenie flag przy logout — do potwierdzenia po recon)
- ewentualnie `src/components/auth/DirectorGuard.tsx` (fallback redirect zamiast pustego stanu)

### Logika finalna
```
isSGUOnly = (isRep || isPartner) && !director && !isAssistant && !isAdmin && !isSuperadmin

if (isSGUOnly && !pathname.startsWith('/sgu') && pathname !== '/login') {
  navigate(isPartner ? '/sgu/pipeline?view=kanban' : '/sgu/pipeline?view=tasks', { replace: true })
}
```
Bez one-shot flagi dla SGU-only — zawsze egzekwuj. Dla mieszanych zostaje obecny one-shot z `/` lub `/login`.

### Recon przed wdrożeniem
Przed kodem przeczytam: `AuthContext.tsx`, `AuthGuard.tsx`, `DirectorGuard.tsx`, obecny `PostLoginRedirect.tsx`, `useSGUAccess.ts` — żeby potwierdzić źródła `isPartner`/`isRep` i flagi mieszanych ról.

### Smoke test
1. Login Paweł (sgu-only rep) → trafia na `/sgu/pipeline?view=tasks` niezależnie skąd próbuje wejść.
2. Login Adam (sgu-only partner) → `/sgu/pipeline?view=kanban`.
3. Login Remek (director + sgu) → zostaje na `/` (CRM landing), toggle do SGU działa ręcznie.
4. SGU-only user wpisuje ręcznie `/contacts` → redirect na swój landing SGU.

### Brak zmian DB. Build + lista plików po wdrożeniu.
