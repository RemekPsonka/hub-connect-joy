

# Stałe przyciski akcji w bocznym panelu kontaktu

## Cel
Przyciski z dialogu "Dalsze działania" (Umów spotkanie, Spotkanie umówione, Audyt, Wyślij ofertę, Zadzwoń, Wyślij mail, Odłóż, Klient, Utracony) mają być **na stałe widoczne** w panelu bocznym kontaktu (`ContactTasksSheet`) — niezależnie od tego, czy kontakt ma aktywne zadanie.

## Problem
Obecnie te akcje są dostępne tylko w dialogu `NextActionDialog`, który otwiera się **dopiero po ukończeniu zadania**. Kontakty bez zadań (np. Marek Świątkowski) nie mają jak zmienić statusu / dodać akcji.

## Rozwiązanie

### Plik: `src/components/deals-team/ContactTasksSheet.tsx`

Dodać sekcję **"Akcje"** na górze zakładki "Przegląd" (zawsze widoczna), zawierającą siatkę 3×3 przycisków identycznych jak w `NextActionDialog`:

```text
┌─ Akcje ──────────────────────────────────────┐
│ [📅 Umów spotkanie] [🤝 Umówione] [📋 Audyt]  │
│ [📄 Wyślij ofertę] [📞 Zadzwoń]   [✉️ Mail]   │
│ [🌙 Odłóż]         [👤 Klient]    [✖ Utracony]│
└──────────────────────────────────────────────┘
```

**Logika każdego przycisku:**
- Reuse handlerów z `NextActionDialog` — wyekstrahować je do hooka `useContactActions(contactId)` lub wywołać dialog programowo
- **Umów / Umówione / Audyt / Oferta / Zadzwoń / Mail** → tworzą / aktualizują zadanie + zmieniają kategorię/etap kontaktu
- **Klient** → otwiera `ConvertToClientDialog` (dane finansowe)
- **Audyt** → otwiera mini-prompt na datę + osobę (constraint: `next_meeting_date`, `next_meeting_with`)
- **Odłóż** → otwiera `SnoozeDialog`
- **Utracony** → bezpośredni update kategorii na `lost`

**Stan wizualny:**
- Aktualna kategoria/etap kontaktu — przycisk podświetlony (np. ring + bg)
- Pozostałe — neutralne

### Plik: `src/components/deals-team/MyTeamTasksView.tsx`

W handlerze drop Kanban: jeśli `targetColumn === 'client'` → otwórz `ConvertToClientDialog` zamiast bezpośredniego update (zapobiega obejściu walidacji finansowej).

## Pliki do modyfikacji
1. **`src/components/deals-team/ContactTasksSheet.tsx`** — nowa sekcja "Akcje" z siatką 9 przycisków
2. **`src/components/deals-team/NextActionDialog.tsx`** — wyekstrahować logikę akcji do współdzielonego hooka / utility
3. **`src/components/deals-team/MyTeamTasksView.tsx`** — przechwycenie drop na `client`

## Reuse
- `ConvertToClientDialog` — bez zmian
- `SnoozeDialog` — bez zmian
- Logika z `NextActionDialog` — wyekstrahowana do hooka, dialog dalej używa tego samego kodu

