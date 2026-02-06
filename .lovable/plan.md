

# Sovra jako prawdziwy asystent — tool calling z akcjami CRM

## Problem

Sovra odpowiada "nie moge tworzyc zadan" bo system prompt jawnie zabrania jej wykonywania akcji, a Edge Function nie ma zdefiniowanych narzedzi (tools). Sovra jest teraz zwyklym czatem bez mozliwosci dzialania w systemie.

## Rozwiazanie

Dodajemy **tool calling** do Edge Function `sovra-chat`. Gemini bedzie moglo wywolywac funkcje (tworzenie zadan, zapisywanie notatek, zmiana statusow), a Edge Function wykona te operacje na bazie danych i zwroci wynik do AI, ktore nastepnie potwierdzi akcje uzytkownikowi w odpowiedzi.

## Co sie zmieni

| Zmiana | Plik |
|--------|------|
| Dodanie tool calling + executory | `supabase/functions/sovra-chat/index.ts` |
| Wyswietlanie akcji w czacie | `src/components/sovra/SovraMessages.tsx` |
| Typ wiadomosci z akcjami | `src/hooks/useSovraChat.ts` |

**Zaden nowy plik nie jest tworzony.** Zmieniamy tylko 3 istniejace pliki.

---

## Szczegoly techniczne

### 1. Edge Function — sovra-chat (glowne zmiany)

#### A) Nowy system prompt

Zamiana ograniczenia "NIE wykonujesz akcji" na instrukcje uzycia narzedzi:

```text
MOZLIWOSCI NARZEDZI:
- Mozesz TWORZYC zadania — uzyj narzedzia create_task
- Mozesz ZAPISYWAC notatki projektowe — uzyj narzedzia add_project_note
- Mozesz ZMIENIAC STATUS zadania — uzyj narzedzia update_task_status
- Mozesz ZMIENIAC STATUS projektu — uzyj narzedzia update_project_status

ZASADY UZYWANIA NARZEDZI:
- Kiedy user prosi o stworzenie zadania — STWORZ JE od razu, nie pytaj o potwierdzenie
- Kiedy user mowi "dodaj notatke do projektu X" — ZAPISZ JA
- Kiedy user mowi "zmien status na done" — ZMIEN od razu
- Po wykonaniu akcji — potwierdz co zrobiles krotkim komunikatem
- Mozesz wywolac wiele narzedzi naraz (np. 3 taski na raz)
- Jesli brakuje kluczowych danych do akcji (np. nie wiesz do ktorego projektu) — ZAPYTAJ usera
```

#### B) Definicja 4 narzedzi (tools array)

```text
1. create_task
   - title: string (wymagane)
   - description: string (opcjonalne)
   - priority: enum [low, medium, high, urgent] (default: medium)
   - due_date: string YYYY-MM-DD (opcjonalne)
   - project_id: string UUID (opcjonalne — jesli kontekst projektu aktywny, uzyj go)
   - status: enum [pending, in_progress] (default: pending)

2. add_project_note
   - project_id: string UUID (wymagane)
   - content: string (wymagane)

3. update_task_status
   - task_id: string UUID (wymagane)
   - status: enum [pending, in_progress, done, cancelled] (wymagane)

4. update_project_status
   - project_id: string UUID (wymagane)
   - status: enum [new, analysis, in_progress, waiting, done, cancelled] (wymagane)
```

#### C) Flow z tool calling (kluczowa zmiana architektury)

Obecny flow: request -> AI -> stream response -> save session

Nowy flow z petla tool calling:
```text
1. Wyslij wiadomosc do AI z tools
2. AI odpowiada z tool_calls LUB content
3. Jesli tool_calls:
   a) Wykonaj kazdy tool call na bazie danych (INSERT/UPDATE)
   b) Zbierz wyniki w tablicy tool results
   c) Dodaj assistant message (z tool_calls) + tool results do messages
   d) Wyslij PONOWNIE do AI (bez stream) z pelna historia
   e) AI generuje finalna odpowiedz tekstowa potwierdzajaca akcje
4. Streamuj finalna odpowiedz do klienta
5. Zapisz sesje z informacja o wykonanych akcjach
```

**Wazne:** Pierwszy call do AI jest **non-streaming** (bo musi zwrocic tool_calls JSON), dopiero finalny call po wykonaniu narzedzi jest **streaming**.

#### D) Funkcje executory (wewnatrz Edge Function)

```text
executeCreateTask(serviceClient, tenantId, directorId, args):
  - INSERT do tasks z: tenant_id, title, description, priority, due_date, project_id, 
    owner_id=directorId, assigned_to=directorId, status, visibility='private'
  - Zwraca: { success: true, task_id: uuid, title: string }

executeAddProjectNote(serviceClient, tenantId, directorId, args):
  - Weryfikacja: projekt nalezy do tenanta
  - INSERT do project_notes z: tenant_id, project_id, content, created_by=directorId, source='sovra_chat'
  - Zwraca: { success: true, note_id: uuid }

executeUpdateTaskStatus(serviceClient, tenantId, args):
  - Weryfikacja: task nalezy do tenanta
  - UPDATE tasks SET status=args.status WHERE id=args.task_id AND tenant_id=tenantId
  - Zwraca: { success: true, task_id, new_status }

executeUpdateProjectStatus(serviceClient, tenantId, args):
  - Weryfikacja: projekt nalezy do tenanta
  - UPDATE projects SET status=args.status WHERE id=args.project_id AND tenant_id=tenantId
  - Zwraca: { success: true, project_id, new_status }
```

Kazdy executor:
- Weryfikuje tenant_id (bezpieczenstwo — user nie moze modyfikowac cudzych danych)
- Uzywa service role client (RLS bypass)
- Zwraca wynik jako string JSON (tool result)
- Opakowuje w try/catch z fallbackiem

#### E) Aktualizacja zapisu sesji

Po zakonczeniu streamu:
- Zapisz `tasks_created` = liczba wywolanych create_task
- Zapisz `notes_created` = liczba wywolanych add_project_note
- Dodaj informacje o wykonanych akcjach do `metadata` sesji

#### F) Wyslanie informacji o akcjach do klienta

Przed streamem finalnej odpowiedzi, wyslij specjalny SSE event z listą wykonanych akcji:

```text
data: {"type":"tool_results","actions":[{"tool":"create_task","result":{"task_id":"...","title":"..."}}]}
```

Frontend rozpozna ten event i wyswietli "activity bubbles" w czacie.

### 2. Frontend — SovraMessages.tsx

Nowy typ wiadomosci: `tool_results`. Wyswietlany jako mini-kafelki miedzy wiadomosciami:

```text
+-------------------------------------------+
|  [CheckSquare] Utworzono zadanie:          |
|  "Przygotowac oferte dla ABC"             |
+-------------------------------------------+
|  [FileText] Zapisano notatke w projekcie  |
|  "Wieze obserwacyjne"                     |
+-------------------------------------------+
```

Styl: bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 rounded-lg px-3 py-2 text-xs — zwiezle, nie dominujace nad czatem.

Ikony:
- create_task -> CheckSquare + "Utworzono zadanie: [title]"
- add_project_note -> FileText + "Zapisano notatke w projekcie"
- update_task_status -> ArrowRight + "Zmieniono status zadania na: [status]"
- update_project_status -> FolderOpen + "Zmieniono status projektu na: [status]"

### 3. Frontend — useSovraChat.ts

Rozszerzenie typu `SovraMessage` o nowe pole:

```text
SovraMessage {
  role: 'user' | 'assistant' | 'tool_results'
  content: string
  timestamp: Date
  actions?: Array<{ tool: string, result: Record<string, unknown> }>
}
```

Parsing streamu — nowy handler dla `"type":"tool_results"` SSE event:
- Odczytaj listę akcji
- Wstaw wiadomosc typu `tool_results` przed finalna odpowiedzia assistant
- Invalidacja query cache dla `['tasks']`, `['project-notes']`, `['projects']` po zakonczeniu streamu (zeby inne widoki odswieza dane)

---

## Bezpieczenstwo

- Kazdy executor weryfikuje `tenant_id` — uzytkownik nie moze modyfikowac danych innego tenanta
- Uzycie service role client jest ok — juz tak dziala cala Edge Function
- Rate limit bez zmian (10/min) — zapobiega masowemu tworzeniu taskow
- Zod walidacja inputu bez zmian (max 2000 znakow)
- Executor nie tworzy danych w tabelach systemowych (auth, storage itp.)

## Co NIE zostanie zmienione

- Edge Function `sovra-debrief` — bez zmian (ma wlasny flow zatwierdzania taskow)
- Edge Function `sovra-morning-session` — bez zmian
- Istniejace hooki `useSovraSessions`, `useSovraDebrief` — bez zmian
- Komponenty `SovraDebrief`, `SovraMorningBrief`, `SovraSidebar`, `SovraWelcome`, `SovraInput` — bez zmian
- Strona `Sovra.tsx` — bez zmian
- Inne Edge Functions — bez zmian

