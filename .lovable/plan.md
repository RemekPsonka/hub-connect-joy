

# Kompaktowe karty + akcje przenoszenia w popupie + filtrowanie/grupowanie

## Zakres zmian

1. **Kompaktowe karty** -- kazda karta (HOT/TOP/LEAD/COLD) staje sie jednolinijkowa: tylko nazwa kontaktu, firma (skrocona), i mala kolorowa kropka statusu. Usuwamy przyciski "do HOT/TOP" z kart oraz notatki, priorytet badge, next action itp.
2. **Akcje przenoszenia w popupie** -- w `DealContactDetailSheet` dodajemy sekcje "Zmien kategorie" z przyciskami do przenoszenia kontaktu miedzy kolumnami (HOT/TOP/LEAD/COLD), z uruchomieniem `PromoteDialog` gdy wymagane sa dodatkowe dane (np. LEAD->TOP wymaga przypisania osoby).
3. **Filtrowanie i szukanie** -- nad Kanbanem dodajemy pasek z: wyszukiwarka tekstowa (po nazwie/firmie), filtr po priorytecie, filtr po statusie.

## Pliki do modyfikacji

| Plik | Zmiana |
|---|---|
| `HotLeadCard.tsx` | Kompaktowa wersja: 1 wiersz -- nazwa + firma + kropka statusu. Usunac assignments, next meeting, next action, estimated value |
| `TopLeadCard.tsx` | Kompaktowa wersja: 1 wiersz -- nazwa + firma + kropka statusu. Usunac przycisk "do HOT", priorytet badge, next action |
| `LeadCard.tsx` | Kompaktowa wersja: 1 wiersz -- nazwa + firma + kropka statusu. Usunac przycisk "do TOP", priorytet badge, notatki |
| `ColdLeadCard.tsx` | Kompaktowa wersja: 1 wiersz -- nazwa + firma + kropka statusu. Usunac przycisk "do LEAD", priorytet badge, notatki |
| `DealContactDetailSheet.tsx` | Dodac sekcje "Zmien kategorie" z przyciskami do HOT/TOP/LEAD/COLD + integracja z PromoteDialog |
| `KanbanBoard.tsx` | Dodac pasek filtrowania (szukaj, priorytet, status) nad kolumnami + logika filtrowania kontaktow |
| `KanbanColumn.tsx` | Zmniejszyc `space-y-2` na `space-y-1` dla gesciejszego rozmieszczenia |

## Szczegoly techniczne

### 1. Kompaktowe karty (przyklad TopLeadCard)

Kazda karta bedzie wygladac tak:

```text
[kolorowy border-l-2] Imie Nazwisko · Firma     ●
```

Struktura JSX:
- Card z `p-1.5` zamiast `p-3`
- Jeden wiersz flex: nazwa (truncate) + separator " · " + firma (truncate) + kropka statusu (2px)
- Brak przyciskow akcji, brak badge'y priorytetu
- Zachowujemy: draggable, onDragStart/End, onClick, isDragging

Wysokosc karty: ~32-36px zamiast obecnych ~100-140px.

### 2. Przenoszenie kategorii z popupu

W `DealContactDetailSheet`, pod sekcja "Status" dodajemy:

```text
--- Separator ---
Kategoria
[🔥 HOT] [⭐ TOP] [📋 LEAD] [❄️ COLD]   <-- 4 przyciski, aktualny wyszarzony
```

Logika:
- Klikniecie w nowa kategorie:
  - Jesli przenoszenie wymaga danych (COLD/LEAD -> TOP, TOP -> HOT) -> otwiera `PromoteDialog`
  - Jesli przenoszenie jest proste (np. HOT -> COLD, TOP -> LEAD) -> bezposredni `updateContact.mutate({ category })`
- Po zmianie kategorii popup pozostaje otwarty (dane sie odswiezyly przez react-query)

Wymagane PromoteDialog:
- Do TOP: wymaga assignedTo + nextAction
- Do HOT: wymaga nextMeetingDate

### 3. Filtrowanie nad Kanbanem

Nad siatka kolumn dodajemy pasek:

```text
[🔍 Szukaj kontakt...] [Priorytet ▼] [Status ▼]
```

- **Szukaj**: filtruje po `contact.full_name` i `contact.company` (case-insensitive)
- **Priorytet**: multi-select (urgent/high/medium/low)
- **Status**: multi-select (active/on_hold/won/lost/disqualified)

Logika filtrowania:
- Stan w `KanbanBoard`: `searchQuery`, `priorityFilter[]`, `statusFilter[]`
- Filtrowane listy: `hotContacts`, `topContacts` itd. uwzgledniaja filtry
- Liczniki w naglowkach kolumn pokazuja ilosc po filtracji

### 4. KanbanColumn -- gestsze ukladanie

- `space-y-2` -> `space-y-1` w kontenerze kart
- Zachowujemy ScrollArea dla przewijania setek pozycji
