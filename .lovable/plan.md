
# Playwright E2E Testy -- konfiguracja i scenariusze krytycznych sciezek

## Podsumowanie

Konfiguracja Playwright E2E testow dla krytycznych sciezek uzytkownika: autentykacja, dashboard, kontakty, deals pipeline i Moj Dzien. Testy beda uruchamiane na preview URL projektu.

## Stan obecny

| Element | Status |
|---------|--------|
| `@playwright/test` | Zainstalowany (dependencies) |
| `playwright.config.ts` | Istnieje -- uzywa `lovable-agent-playwright-config` (nadpisujemy) |
| `playwright-fixture.ts` | Istnieje -- do usuniecia (nie jest potrzebny) |
| `e2e/` folder | Pusty -- trzeba stworzyc |
| package.json scripts | Brak e2e scripts |

## Wazne ustalenia z analizy kodu

| Element | Wartosc w kodzie |
|---------|-----------------|
| Redirect po login | `/` (nie `/dashboard`) -- Dashboard jest na route `/` |
| Placeholder email | `jan@przyklad.pl` |
| Placeholder haslo | Brak placeholdera (type=password, id=password) |
| Przycisk login | `Zaloguj sie` |
| Kontakty przycisk dodaj | `Dodaj kontakt` (otwiera AIImportContactsModal) |
| Deals przycisk dodaj | `Dodaj deal` |
| Create deal dialog title | `Nowy deal` |
| Create deal submit | `Utworz deal` |
| My Day greeting | `Dzien dobry, {firstName}!` |
| Sidebar links | Dashboard `/`, Moj Dzien `/my-day`, Kontakty `/contacts`, Deals `/deals` |
| Kanban tab | `Kanban` (tekst w TabsTrigger) |
| Tabela tab | `Tabela` (tekst w TabsTrigger) |
| Search placeholder (contacts) | `Szukaj po imieniu, firmie lub email...` |
| Search placeholder (deals) | `Szukaj po tytule...` |

## Nowe pliki (8)

| Plik | Opis |
|------|------|
| `playwright.config.ts` | Nadpisanie -- customowa konfiguracja z locale pl-PL |
| `e2e/helpers/auth.ts` | Login helper + TEST_USER credentials z env |
| `e2e/global-setup.ts` | Jednorazowy login + zapis storageState |
| `e2e/auth.spec.ts` | 3 testy: redirect, login success, login error |
| `e2e/dashboard.spec.ts` | 4 testy: StatCards, sidebar nav, Cmd+K, breadcrumbs |
| `e2e/contacts.spec.ts` | 4 testy: lista, create, search, cleanup |
| `e2e/deals.spec.ts` | 4 testy: statcards, create, search, kanban/tabela |
| `e2e/my-day.spec.ts` | 3 testy: greeting, task toggle, quick actions |

## Modyfikowane pliki (1)

| Plik | Zmiana |
|------|--------|
| `package.json` | Dodanie e2e scripts |

## Pliki do usuniecia (1)

| Plik | Powod |
|------|-------|
| `playwright-fixture.ts` | Re-exportuje z nieistniejacego pakietu; nie potrzebny |

## Szczegoly techniczne

### 1. playwright.config.ts -- nadpisanie

Kluczowe roznice vs obecny config:
- `testDir: './e2e'`
- `fullyParallel: false` + `workers: 1` (testy modyfikuja dane -- sekwencyjnie)
- `baseURL` z env lub domyslny localhost:5173
- `locale: 'pl-PL'`, `timezoneId: 'Europe/Warsaw'`
- `globalSetup: './e2e/global-setup.ts'`
- `storageState: './e2e/.auth/user.json'`
- Projekty: chromium + mobile (Pixel 5)
- `webServer.command: 'npm run dev'`
- Reporter: html (open never) + list
- Trace/screenshot/video only on failure

### 2. e2e/helpers/auth.ts

```text
TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'testpassword123'
}

login(page):
  1. goto('/login')
  2. waitForLoadState('networkidle')
  3. fill input#email (selektor po id -- pewniejszy niz placeholder)
  4. fill input#password
  5. click button "Zaloguj sie"
  6. waitForURL('**/', { timeout: 15000 })  -- Dashboard jest na "/"

loginAndSaveState(page, storagePath):
  1. login(page)
  2. page.context().storageState({ path: storagePath })
```

Uwaga: Dashboard jest na route `/` (nie `/dashboard`), wiec waitForURL uzywa `**/` z dodatkowym sprawdzeniem ze nie jestesmy na /login.

### 3. e2e/global-setup.ts

```text
1. Sprawdz env TEST_USER_EMAIL
2. Launch chromium
3. loginAndSaveState -> e2e/.auth/user.json
4. Close browser
```

Plik `e2e/.auth/` dodany do `.gitignore`.

### 4. auth.spec.ts (3 testy)

```text
test.use({ storageState: { cookies: [], origins: [] } })  -- clean state

1. "redirects unauthenticated to login"
   - goto('/')
   - expect URL contains /login

2. "login with valid credentials"
   - goto('/login')
   - fill email + password
   - click "Zaloguj sie"
   - expect URL = '/' (dashboard)

3. "login with invalid credentials shows error"
   - goto('/login')
   - fill wrong credentials
   - click "Zaloguj sie"
   - expect alert z tekstem bledow (Nieprawidlowy/blad)
```

### 5. dashboard.spec.ts (4 testy)

Uzywa saved storageState (zalogowany).

```text
1. "loads with StatCards"
   - goto('/')
   - waitForLoadState('networkidle')
   - expect "Kontakty" visible (StatCard label)
   - expect "Zadania w toku" visible

2. "sidebar navigation works"
   - goto('/')
   - click link "Kontakty" -> expect /contacts
   - click link "Projekty" -> expect /projects
   - click link "Deals" -> expect /deals
   - click link "Dashboard" -> expect /

3. "Cmd+K opens search palette"
   - goto('/')
   - keyboard press Meta+k
   - expect input placeholder "Szukaj" or "wpisz" visible
   - keyboard Escape

4. "breadcrumbs on subpages"
   - goto('/contacts')
   - expect "Kontakty" visible w breadcrumb
```

### 6. contacts.spec.ts (4 testy)

```text
UNIQUE_SUFFIX = Date.now().toString().slice(-6)
TEST_CONTACT = { firstName: 'E2E', lastName: 'Test{SUFFIX}', email: 'e2e.test{SUFFIX}@playwright.dev' }

1. "shows contacts list or empty state"
   - goto('/contacts')
   - expect tabela OR tekst "brak kontaktow"

2. "create new contact"
   - goto('/contacts')
   - click "Dodaj kontakt"
   - W dialogu ContactModal:
     - fill placeholder "Jan" (first_name) -> TEST_CONTACT.firstName
     - fill placeholder "Kowalski" (last_name) -> TEST_CONTACT.lastName
     - fill placeholder "jan@firma.pl" (email)
   - click "Zapisz" or "Dodaj"
   - expect toast z "utworzon|dodano|zapisano"

3. "search contacts"
   - goto('/contacts')
   - fill search placeholder "Szukaj po imieniu, firmie lub email..."
   - type TEST_CONTACT.lastName
   - wait 500ms (debounce)
   - expect TEST_CONTACT.lastName visible

4. "cleanup test contact"
   - search -> click contact -> usun -> potwierdz
   - Graceful: skip jesli nie znaleziono
```

### 7. deals.spec.ts (4 testy)

```text
UNIQUE_SUFFIX = Date.now().toString().slice(-6)
TEST_DEAL = { title: 'E2E Deal {SUFFIX}', value: '15000' }

1. "shows deals page with stats"
   - goto('/deals')
   - expect "Otwarte Deals" OR "Pipeline" OR "brak etapow"

2. "switch between kanban and table"
   - goto('/deals')
   - click tab "Tabela"
   - wait 1s
   - click tab "Kanban"
   - wait 1s

3. "create new deal" (jesli stages istnieja)
   - click "Dodaj deal"
   - Dialog: fill "Np. Wdrozenie systemu CRM" placeholder
   - fill value
   - click "Utworz deal"
   - expect toast success

4. "search deals"
   - fill "Szukaj po tytule..." -> TEST_DEAL.title
   - wait debounce
   - expect title visible
```

### 8. my-day.spec.ts (3 testy)

```text
1. "loads with greeting"
   - goto('/my-day')
   - waitForLoadState('networkidle')
   - expect "Dzien dobry" visible (timeout 10s -- data loading)

2. "shows task sections"
   - expect "Zadania na dzis" OR "Wszystko zrobione" visible

3. "quick actions visible"
   - expect "Nowe zadanie" visible
   - expect "Nowy kontakt" visible
```

### 9. package.json scripts

```text
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:headed": "playwright test --headed",
"test:e2e:report": "playwright show-report"
```

### 10. .gitignore

Dodac:
```text
e2e/.auth/
test-results/
playwright-report/
```

## Kolejnosc wykonania

```text
1. Nadpisz playwright.config.ts
2. Usun playwright-fixture.ts
3. Zaktualizuj package.json (scripts)
4. Zaktualizuj .gitignore
5. Stworz e2e/helpers/auth.ts
6. Stworz e2e/global-setup.ts
7. Stworz e2e/auth.spec.ts
8. Stworz e2e/dashboard.spec.ts
9. Stworz e2e/contacts.spec.ts
10. Stworz e2e/deals.spec.ts
11. Stworz e2e/my-day.spec.ts
```

## Czego NIE robimy

| Element | Powod |
|---------|-------|
| Modyfikacja kodu zrodlowego | Tylko testy + config |
| Dodanie data-testid | Selektory oparte na role/text/placeholder -- bardziej realistyczne |
| Testy mobilne (osobne pliki) | Playwright project "mobile" automatycznie uruchamia te same testy w viewport mobilnym |
| Testy Network/Pipeline/Matches | Admin-only pages -- poza scope E2E krytycznych sciezek |
| Testy AI Chat | Wymaga kluczy API -- niestabilne |

## Zabezpieczenia

- storageState z global-setup: login raz, reuse we wszystkich testach
- Clean state w auth.spec.ts (nadpisanie storageState na puste)
- Unikalne dane (timestamp suffix) -- idempotentne testy
- Cleanup w ostatnim tescie contacts -- sprtatanie danych
- waitForLoadState('networkidle') po kazdej nawigacji
- Graceful selektory: role + text + placeholder (nie data-testid)
- Timeout 15s na login redirect (wolne API)
- workers: 1 -- sekwencyjne wykonanie (shared data)
- Screenshots/video only on failure
