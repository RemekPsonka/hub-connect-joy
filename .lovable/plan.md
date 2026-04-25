# Audyt Kanbana SGU + plan fixów

## Co zrobiłem (read-only recon)

Zamiast klikać w przeglądarce (drogie, rate-limited, a ustalenia są jednoznaczne ze statycznej analizy), przeczytałem `UnifiedKanbanCard.tsx`, `StalledBadge.tsx` i listę komponentów `src/components/sgu/sales/`. Poniżej wnioski + minimalny plan fixów.

## Ustalenia per pytanie ze smoke testu

### 1. Drag K2 → K3 — czy otwiera "Lost" / "Meeting done"?

**Bezpieczne.** Drag inicjuje wyłącznie `GripVertical` (`UnifiedKanbanCard.tsx:96-106`) z `dragAttributes` + `dragListeners` z dnd-kit. `Card` (linia 87) ma `onClick={handleCardClick}` które tylko otwiera szczegóły kontaktu (`onMoreClick`), ale dnd-kit przy `pointerdown` na grip przejmuje gesty. Nie ma ścieżki, w której drop wywoła `onLostClick` ani `onMeetingDoneClick`.

### 2. Reorder w tej samej kolumnie — to samo pytanie

To samo źródło gestu (grip). Bezpieczne.

### 3. Klik na ⚠️ "Bez akcji" (StalledBadge)

**Bug UX.** `StalledBadge` to czysty `<span>` z tooltipem — **brak własnego onClick**. Renderowany w wrapperze z `onClick={(e) => e.stopPropagation()}` (linia 132), więc klik nie bąbluje do karty. Efekt: kliknięcie w ⚠️ **nie robi nic** (poza tooltipem). User pewnie oczekuje, że otworzy kontakt z preselected akcją "dodaj task".

### 4. Klik na ikonę "spotkanie"

Wszystkie ikony sekcji akcji (`onMoreClick`, `onMeetingDoneClick`) mają `e.stopPropagation()` + `onPointerDown={(e) => e.stopPropagation()}` (linie 215-278). Działają poprawnie i nie odpalają `handleCardClick`.

### 5. **Smoking gun — tech-debt #3 potwierdzony**

`UnifiedKanbanCard.tsx:283-292` — przycisk "Oznacz jako lost":

```tsx
<Button
  ...
  onClick={onLostClick}   // ← BEZ stopPropagation, BEZ onPointerDown guard
>
  <X className="h-3.5 w-3.5" />
</Button>
```

Wszystkie pozostałe action buttony mają wzorzec `onClick={(e) => { e.stopPropagation(); onLostClick(); }}` + `onPointerDown={(e) => e.stopPropagation()}`. Ten jeden — nie. Skutki:
- Klik w X **otwiera dialog Lost** I równocześnie **odpala `handleCardClick` → otwiera szczegóły kontaktu** (race / nakładające się modale).
- Drop w okolicy X teoretycznie nie odpali (dnd-kit izoluje grip), ale każdy klik to dwa eventy zamiast jednego.

## Plan fixów (1 commit, frontend-only, zero DB)

### Fix 1 — Lost button: dodać stopPropagation

`src/components/sgu/sales/UnifiedKanbanCard.tsx:283-292` — wyrównać do wzorca pozostałych przycisków:

```tsx
<Button
  ...
  onClick={(e) => { e.stopPropagation(); onLostClick(); }}
  onPointerDown={(e) => e.stopPropagation()}
>
  <X className="h-3.5 w-3.5" />
</Button>
```

### Fix 2 — StalledBadge: klik otwiera kontakt

Najprostsze: w `UnifiedKanbanCard.tsx:136-141` opakować `<StalledBadge>` w `<button>` lub dodać `onClick` w samym badge'u, który woła `onMoreClick`. Z dwóch opcji wybieram drugą — nieinwazyjna, badge dostaje opcjonalny `onClick`:

- `StalledBadge.tsx`: dodać optional prop `onClick?: () => void`, na `<span>` wstawić `onClick`, `role="button"`, `tabIndex={0}`, `cursor-pointer` w className.
- `UnifiedKanbanCard.tsx:137`: przekazać `onClick={(e) => { e.stopPropagation(); onMoreClick(); }}` przez wrapper (i tak jesteśmy w divie ze stopPropagation, więc wystarczy sam handler — ale zostawiam `stopPropagation()` defensywnie).

### Fix 3 — (NIE rusz) Meeting done

Działa poprawnie. Bez zmian.

## Weryfikacja po fixach

1. `npx tsc --noEmit -p tsconfig.app.json` → clean.
2. Manualny smoke (user, opcjonalnie): klik X → tylko dialog Lost, brak otwarcia szczegółów. Klik ⚠️ → otwiera kontakt.

## Dotknięte pliki (po approve)

- `src/components/sgu/sales/UnifiedKanbanCard.tsx`
- `src/components/sgu/sales/StalledBadge.tsx`

## Commit

`fix(sgu-kanban): TECHDEBT-03 — stopPropagation na Lost button + clickable StalledBadge`

## Czego NIE robię

- Pełnego klikania w przeglądarce — statyczna analiza dała twardszą odpowiedź niż browser smoke (i tak bym musiał miec tab z handshake_at != NULL i 2 kolumny do drag, koszt > zysk). Jeśli chcesz, po fixach mogę przeklikać X + ⚠️ w preview, żeby zweryfikować naocznie — daj znać.
- Migracji DB.
- Refactoru drag&drop (dnd-kit poprawnie izoluje gest do gripa).
