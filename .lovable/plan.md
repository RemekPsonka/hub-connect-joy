

# B-FIX.10 — Pill pokazuje liczby per typ zadania (spotkanie/telefon/oferta/mail)

## Problem

1. Pill na karcie pokazuje tylko jedną ikonę statusu + sumę otwartych zadań → user nie wie **czego** to zadania.
2. Pill jest mały (`h-5`) i ginie w prawym górnym rogu — gdy karta jest węższa, nie widać nawet liczby.

## Cel

Zamiast jednego pill-a — **rząd mini-pillów per typ zadania**, każdy z ikoną i liczbą otwartych zadań danego typu. Kolor pill-a odzwierciedla najgorszy status danego typu (overdue > today > active). Gdy nie ma zadań → fallback "+ Dodaj".

Przykład wizualny:
```
[📅 1] [📞 2] [📄 1]    ← spotkanie 1, telefon 2, oferta 1
```

## Decyzja: typowanie po tytule

`tasks.title` jest tworzony przez znane szablony w `ContactTasksSheet` ("Umówić spotkanie z…", "Zadzwonić do…", "Wysłać ofertę do…", "Wysłać maila do…"). Klasyfikujemy regex-em:
- `spotkanie|spotkać|umówić` → **meeting** (📅 CalendarIcon)
- `zadzwo|telefon|call` → **call** (📞 PhoneCall)
- `ofert` → **offer** (📄 FileText)
- `mail|e-mail|email` → **email** (✉️ Send)
- reszta → **other** (○ Circle)

## Zmiany

### 1. `src/hooks/useActiveTaskContacts.ts`
- Dodać `taskType: 'meeting'|'call'|'offer'|'email'|'other'` per zadanie (klasyfikacja w hooku).
- Rozszerzyć `TaskContactInfo` o `byType: Record<TaskType, { open: number; overdue: number; today: number; done: number; status: TaskStatus }>`.
- Helper `classifyTask(title)`.

### 2. `src/components/sgu/sales/TaskStatusPill.tsx` → przepisanie

Nowy kontrakt: zamiast jednego pill-a — komponent renderuje **rząd mini-chipów** per typ. Każdy chip:
- Ikona typu (Calendar/Phone/FileText/Send/Circle)
- Liczba otwartych (`open`) + opcjonalnie `+N✓` po prawej w tooltipie
- Kolor tła zależny od najgorszego statusu typu (czerwony/pomarańczowy/zielony)
- Klik → `onMoreClick` (otwiera Sheet)
- Tooltip: "Spotkania: 1 otwarte (1 dziś, 0 przeterminowane)"

Gdy `byType` jest puste → pojedynczy chip `+ Dodaj` jak teraz.

### 3. Layout w `UnifiedKanbanCard.tsx`

Aby chipy się mieściły i nie były ucięte:
- Header → `flex-col gap-1.5`: tytuł na górze, **rząd chipów + awatary** w nowym wierszu pod tytułem (`flex items-center gap-1 flex-wrap`).
- Wycofanie ze "shrink-0 absolute right" — teraz chipy są pełnoprawnym elementem karty, zawsze widoczne.

### 4. Mini-banner overdue (zostaje jak jest)

Bez zmian — i tak pokazuje **konkretny tytuł** najstarszego przeterminowanego.

## Pliki

| # | Plik | Akcja |
|---|---|---|
| 1 | `src/hooks/useActiveTaskContacts.ts` | EDIT — dodanie `classifyTask` + agregacja `byType` w `TaskContactInfo` |
| 2 | `src/components/sgu/sales/TaskStatusPill.tsx` | REWRITE — render rzędu mini-chipów per typ (z fallbackiem `+ Dodaj`) |
| 3 | `src/components/sgu/sales/UnifiedKanbanCard.tsx` | EDIT — przeniesienie pill-ów z prawego topu pod tytuł (flex-wrap, zawsze widoczne) |

## Weryfikacja

```bash
npx tsc --noEmit  # exit 0
```

Manual smoke (Artur Czepczyński):
- Po dodaniu spotkania → na karcie pojawia się chip `📅 1` z pomarańczowym tłem (today).
- Po dodaniu telefonu → drugi chip `📞 1`.
- Tooltip każdego chipa pokazuje rozbicie status × liczba.
- Chipy widoczne nawet w wąskim layoucie (flex-wrap pod tytułem).
- Klik dowolnego chipa → otwiera `ContactTasksSheet`.

## DoD

| Check | Stan |
|---|---|
| `byType` w `TaskContactInfo` | ✅ |
| Mini-chipy per typ z liczbami | ✅ |
| Kolor chip-a per najgorszy status typu | ✅ |
| Chipy zawsze widoczne (pod tytułem, flex-wrap) | ✅ |
| `tsc --noEmit` exit 0 | ✅ |

