

# Audyt spojnosci etapow/kategorii zadan w systemie

## Zidentyfikowane zrodla konfiguracji

System posiada **5 niezaleznych miejsc**, gdzie definiowane sa etykiety i mapowania etapow. Kazde moze odbiegac od pozostalych.

---

## Porownanie konfiguracji

### 1. SUB_KANBAN_CONFIGS (SubKanbanView.tsx) -- ZRODLO PRAWDY dla sub-kanbanow kontaktow

```text
audit:     audit_plan ("Do zaplanowania") -> audit_scheduled ("Zaplanowany") -> audit_done ("Odbyty")
hot:       meeting_plan ("Zaplanowac spotkanie") -> meeting_scheduled ("Spotkanie umowione") -> meeting_done ("Spotkanie odbyte")
top:       meeting_plan ("Zaplanowac spotkanie") -> meeting_scheduled ("Spotkanie umowione") -> meeting_done ("Spotkanie odbyte")
offering:  handshake ("Handshake") -> power_of_attorney ("Pelnomocnictwo") -> preparation ("Przygotowanie") -> negotiation ("Negocjacje") -> accepted ("Zaakceptowano") -> lost ("Przegrano")
```

### 2. WORKFLOW_COLUMNS (MyTeamTasksView.tsx) -- Kanban zadan

```text
meeting_plan:       "Umow spotkanie"          <-- ROZNICA: SubKanban = "Zaplanowac spotkanie"
meeting_scheduled:  "Spotkanie umowione"      OK
meeting_done:       "Spotkanie odbyte"         OK
handshake:          "Handshake"                OK
power_of_attorney:  "Pelnomocnictwo"           OK
preparation:        "Przygotowanie"            OK
negotiation:        "Negocjacje"               OK
accepted:           "Zaakceptowano"            OK
audit_plan:         "Audyt - planowanie"       <-- ROZNICA: SubKanban = "Do zaplanowania"
audit_scheduled:    "Audyt zaplanowany"        <-- ROZNICA: SubKanban = "Zaplanowany"
audit_done:         "Audyt odbyty"             <-- ROZNICA: SubKanban = "Odbyty"
```
**Brak kolumny:** `offering.lost` ("Przegrano") -- istnieje w SubKanban, ale nie w WORKFLOW_COLUMNS

### 3. offeringStageLabels.ts -- Uzywane w badge'ach na kartach kontaktow

```text
handshake:          "Handshake"                OK
power_of_attorney:  "Pelnomocnictwo"           OK
preparation:        "Przygotowanie"            OK
negotiation:        "Negocjacje"               OK
accepted:           "Zaakceptowano"            OK
lost:               "Przegrano"                OK
audit_plan:         "Do zaplanowania"          <-- Zgadza sie z SubKanban, NIE z WORKFLOW_COLUMNS
audit_scheduled:    "Zaplanowany"              <-- Zgadza sie z SubKanban, NIE z WORKFLOW_COLUMNS
audit_done:         "Odbyty"                   <-- Zgadza sie z SubKanban, NIE z WORKFLOW_COLUMNS
meeting_plan:       "Zaplanowac spotkanie"     <-- Zgadza sie z SubKanban, NIE z WORKFLOW_COLUMNS
meeting_scheduled:  "Spotkanie umowione"       OK
meeting_done:       "Spotkanie odbyte"          OK
```

### 4. CATEGORY_OPTIONS (TaskDetailSheet.tsx) -- Dropdown w panelu bocznym

```text
hot -> "HOT LEAD"      OK
top -> "TOP LEAD"       OK
offering -> "OFERTOWANIE" OK
audit -> "AUDYT"        OK -- ikona: 📅 (powinno byc 🔍 lub inne?)
lead -> "LEAD"          OK
10x -> "10X"            OK
cold -> "COLD LEAD"     OK
client -> "KLIENT"      OK
lost -> "PRZEGRANE"     OK
```
Sub-etapy pobierane z SUB_KANBAN_CONFIGS -- **SPOJNE** (jedyna konfiguracja ktora korzysta z jednego zrodla)

### 5. KanbanColumnConfigPopover + KanbanBoard -- Glowny Kanban kontaktow

```text
Kolumny: offering, hot, audit, top, lead, tenx, cold, lost, prospecting
```
**Brak kolumny "client"** w KanbanBoard (klienci nie sa wyswietlani na Kanbanie kontaktow).
KanbanColumnConfigPopover nie uwzglednia "client" -- to moze byc swiadome.

---

## Podsumowanie niespojnosci

| # | Problem | Gdzie | Co poprawic |
|---|---------|-------|-------------|
| 1 | `meeting_plan` label | WORKFLOW_COLUMNS | "Umow spotkanie" vs "Zaplanowac spotkanie" |
| 2 | `audit_plan` label | WORKFLOW_COLUMNS | "Audyt - planowanie" vs "Do zaplanowania" |
| 3 | `audit_scheduled` label | WORKFLOW_COLUMNS | "Audyt zaplanowany" vs "Zaplanowany" |
| 4 | `audit_done` label | WORKFLOW_COLUMNS | "Audyt odbyty" vs "Odbyty" |
| 5 | Brak `offering.lost` | WORKFLOW_COLUMNS | Brakuje kolumny "Przegrano" w Kanbanie zadan |
| 6 | Ikona audytu | CATEGORY_OPTIONS (TaskDetailSheet) | Uzywa 📅 zamiast 📋 lub 🔍 |

---

## Plan naprawy

### Krok 1: Utworzyc jedno zrodlo prawdy -- `src/config/pipelineStages.ts`

Nowy plik eksportujacy pelna konfiguracje etapow:
- Kategorie glowne (hot, top, offering, audit, lead, 10x, cold, client, lost) z labelami, ikonami, kolorami
- Sub-etapy per kategoria (SUB_KANBAN_CONFIGS)
- Mapowanie workflow kolumn (WORKFLOW_COLUMNS)
- Domyslne etapy per kategoria

Wszystkie komponenty beda importowac z tego jednego pliku.

### Krok 2: Ujednolicic etykiety

Przyjac SUB_KANBAN_CONFIGS jako bazowe etykiety (bo sa bardziej opisowe w kontekscie Kanbana kontaktow), a WORKFLOW_COLUMNS dostosowac:
- `meeting_plan` -> "Zaplanowac spotkanie" (zamiast "Umow spotkanie")
- `audit_plan` -> "Do zaplanowania" (zamiast "Audyt - planowanie")
- `audit_scheduled` -> "Zaplanowany" (zamiast "Audyt zaplanowany")
- `audit_done` -> "Odbyty" (zamiast "Audyt odbyty")
- Dodac kolumne `offering_lost` -> "Przegrano" w WORKFLOW_COLUMNS

### Krok 3: Zaktualizowac importy

Pliki do zmiany:
- `src/components/deals-team/SubKanbanView.tsx` -- eksport SUB_KANBAN_CONFIGS przeniesiony do nowego pliku
- `src/components/deals-team/MyTeamTasksView.tsx` -- WORKFLOW_COLUMNS zastapione importem
- `src/components/tasks/TaskDetailSheet.tsx` -- CATEGORY_OPTIONS zastapione importem
- `src/utils/offeringStageLabels.ts` -- STAGE_LABELS zastapione importem
- `src/components/deals-team/KanbanColumnConfigPopover.tsx` -- COLUMN_LABELS zastapione importem

### Krok 4: Ujednolicic ikone audytu

W CATEGORY_OPTIONS (TaskDetailSheet): zmienic ikone audytu z 📅 na 📋 (spojna z SubKanban).

---

## Efekt koncowy

Jeden plik konfiguracyjny `pipelineStages.ts` jest jedynym zrodlem prawdy. Zmiana etykiety lub dodanie nowego etapu wymaga edycji tylko jednego pliku -- wszystkie widoki (Kanban kontaktow, Sub-kanban, Kanban zadan, TaskDetailSheet, badge'e) automatycznie sie aktualizuja.

