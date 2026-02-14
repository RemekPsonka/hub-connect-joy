
# Sub-kanbany dla kategorii lejka: Audyt, Hot Lead, Top Lead

## Problem
1. W ContactTasksSheet statusy w lejku wyswietlaja sie nieprawidlowo - `offering_stage` (np. "Pelnomocnictwo") pokazuje sie tylko dla kategorii "offering", ale powinno byc widoczne tez jako sub-stage dla innych kategorii
2. Kategorie Audyt, Hot Lead i Top Lead nie maja wlasnych sub-kanbanow (Offering juz ma)
3. Nawigacja do sub-kanbanow powinna odbywac sie przez klikniecie naglowka kolumny, a nie przez gorne menu

## Rozwiazanie

### 1. Nowe sub-stage'e per kategoria

Reuse kolumny `offering_stage` (typ `text`, brak constraintow) jako generyczny sub-stage:

- **Offering** (bez zmian): handshake, power_of_attorney, preparation, negotiation, accepted, lost
- **Audit** (nowe): `audit_plan` (Do zaplanowania), `audit_scheduled` (Zaplanowany), `audit_done` (Odbyty)
- **Hot Lead** (nowe): `meeting_plan` (Zaplanowac spotkanie), `meeting_scheduled` (Spotkanie umowione), `meeting_done` (Spotkanie odbyte)
- **Top Lead** (nowe): `meeting_plan` (Zaplanowac spotkanie), `meeting_scheduled` (Spotkanie umowione), `meeting_done` (Spotkanie odbyte)

### 2. Zmiany w plikach

#### A. `src/types/dealTeam.ts`
- Rozszerzyc typ `OfferingStage` o nowe wartosci: `audit_plan`, `audit_scheduled`, `audit_done`, `meeting_plan`, `meeting_scheduled`, `meeting_done`
- Lub stworzyc nowy typ `SubStage` jako union istniejacych + nowych

#### B. Nowy komponent: `src/components/deals-team/SubKanbanView.tsx`
Generyczny komponent sub-kanbanu (wzorowany na `OfferingKanbanBoard`):
- Props: `contacts`, `teamId`, `stages` (tablica {id, label, icon, color}), `onContactClick`, `onBack`
- Przycisk "Wstecz" do powrotu do glownego Kanbana
- Drag & drop miedzy sub-kolumnami (update `offering_stage`)
- Karty kontaktow z nazwa, firma, aktywne zadanie

#### C. `src/components/deals-team/KanbanBoard.tsx`
- Dodac stan `drillDownCategory: DealCategory | null`
- Gdy `drillDownCategory` jest ustawiony, zamiast glownego Kanbana renderowac `SubKanbanView` z odpowiednimi stage'ami
- Przekazac prop `onHeaderClick` do `KanbanColumn` - klikniecie naglowka kolumny Offering/Audit/Hot/Top ustawia `drillDownCategory`
- Przycisk "Wstecz" w SubKanbanView wraca do glownego widoku (`setDrillDownCategory(null)`)

#### D. `src/components/deals-team/KanbanColumn.tsx`
- Dodac opcjonalny prop `onHeaderClick?: () => void`
- Naglowek kolumny staje sie klikalny (kursor pointer, hover effect) gdy `onHeaderClick` jest przekazany
- Wizualna wskazowka (np. ikona strzalki lub podkreslenie) ze naglowek jest klikalny

#### E. `src/components/deals-team/ContactTasksSheet.tsx`
- W sekcji "Status w lejku" pokazywac sub-stage badge dla WSZYSTKICH kategorii ktore maja sub-kanbany (offering, audit, hot, top), nie tylko dla offering
- Dodac mapowanie etykiet dla nowych sub-stage'ow

### 3. Konfiguracja sub-stage'ow

```text
OFFERING:
  handshake -> Handshake
  power_of_attorney -> Pelnomocnictwo
  preparation -> Oferta w przygotowaniu
  negotiation -> Negocjacje
  accepted -> Akceptacja
  lost -> Przegrana

AUDIT:
  audit_plan -> Do zaplanowania
  audit_scheduled -> Zaplanowany
  audit_done -> Odbyty

HOT LEAD:
  meeting_plan -> Zaplanowac spotkanie
  meeting_scheduled -> Spotkanie umowione
  meeting_done -> Spotkanie odbyte

TOP LEAD:
  meeting_plan -> Zaplanowac spotkanie
  meeting_scheduled -> Spotkanie umowione
  meeting_done -> Spotkanie odbyte
```

### 4. Przeplyw uzytkownika

1. Uzytkownik widzi glowny Kanban z kolumnami (Offering, Audit, Hot, Top, Lead, 10x, Cold, Lost)
2. Klika naglowek kolumny "AUDYT" -> glowny Kanban znika, pojawia sie sub-Kanban Audytu z 3 kolumnami
3. W sub-Kanbanie moze przeciagac kontakty miedzy sub-stage'ami
4. Klika "Wstecz" lub breadcrumb -> wraca do glownego Kanbana
5. W ContactTasksSheet w sekcji "Status w lejku" widzi badge z aktualnym sub-stage

### 5. Domyslne wartosci sub-stage

- Nowi kontakci w Audit: `audit_plan` (Do zaplanowania)
- Nowi kontakci w Hot/Top: `meeting_plan` (Zaplanowac spotkanie)
- Nowi kontakci w Offering: `handshake` (bez zmian)
- Zmiana kategorii na audit/hot/top resetuje `offering_stage` do odpowiedniej domyslnej wartosci

### 6. Pliki do zmiany

| Plik | Operacja |
|------|----------|
| `src/types/dealTeam.ts` | Edycja - rozszerzenie typu OfferingStage |
| `src/components/deals-team/SubKanbanView.tsx` | Nowy - generyczny sub-kanban |
| `src/components/deals-team/KanbanBoard.tsx` | Edycja - stan drillDown, onHeaderClick |
| `src/components/deals-team/KanbanColumn.tsx` | Edycja - klikalny naglowek |
| `src/components/deals-team/ContactTasksSheet.tsx` | Edycja - sub-stage badges dla wszystkich kategorii |
| `src/hooks/useDealsTeamContacts.ts` | Edycja - reset offering_stage przy zmianie kategorii |
