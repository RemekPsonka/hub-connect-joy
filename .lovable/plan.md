
# Kanban zadaniowy oparty na workflow sprzedazowym

## Koncepcja

Zamiast prostego Kanbanu statusowego (Do zrobienia / W trakcie / Zakonczone), zastepujemy widok "Kanban" w zakladce **Zadania** pelnym widokiem workflow sprzedazowego. Kazde zadanie jest umieszczone w kolumnie odpowiadajacej aktualnemu krokowi workflow kontaktu (category + offering_stage).

## Kolumny workflow

Kolumny sa pogrupowane w sekcje logiczne:

```text
SPOTKANIA                  OFERTOWANIE                    AUDYT              ZAMKNIECIE
-----------               ---------------                -------            -----------
Umow spotkanie     -->    Handshake                      Zaplanowany        Klient (sukces)
Spotkanie umowione -->    Pelnomocnictwo                 Odbyty             Przegrane
Spotkanie odbyte   -->    Przygotowanie                                     Inne
                          Negocjacje
                          Zaakceptowano
```

Po "Spotkanie odbyte" uzytkownik musi wybrac sciezke (ofertowanie, audyt, 10x itd.) -- to juz realizuje NextActionDialog.

## Mapowanie: kontakt --> kolumna

Kazde zadanie jest powiazane z kontaktem przez `deal_team_contact_id`. Na podstawie `category` i `offering_stage` kontaktu okreslamy kolumne:

| Kontakt (category + stage)      | Kolumna workflow          |
|----------------------------------|---------------------------|
| hot/top + meeting_plan           | Umow spotkanie            |
| hot/top + meeting_scheduled      | Spotkanie umowione        |
| hot/top + meeting_done           | Spotkanie odbyte          |
| offering + handshake             | Handshake                 |
| offering + power_of_attorney     | Pelnomocnictwo            |
| offering + preparation           | Przygotowanie             |
| offering + negotiation           | Negocjacje                |
| offering + accepted              | Zaakceptowano             |
| audit + audit_plan               | Audyt - planowanie        |
| audit + audit_scheduled          | Audyt zaplanowany         |
| audit + audit_done               | Audyt odbyty              |
| lead / cold / 10x               | Inne                      |
| client                           | Klient                    |
| lost                             | Przegrane                 |

## Interakcje

- **Klikniecie w zadanie** --> otwiera TaskDetailSheet (panel boczny Asana-style)
- **Drag & drop miedzy kolumnami** --> uruchamia NextActionDialog z odpowiednim pre-selectem akcji (np. przeciagniecie do "Spotkanie umowione" automatycznie wybiera akcje "meeting_scheduled")
- **Prosta zmiana w ramach jednej sekcji** (np. Handshake -> Pelnomocnictwo) --> bezposrednia aktualizacja offering_stage bez dialogu
- **Zmiana miedzy sekcjami** (np. Spotkanie odbyte -> Handshake) --> dialog z potwierdzeniem zmiany kategorii

## Filtrowanie

Zachowane istniejace filtry:
- Filtr czlonkow zespolu (Wszyscy / Moje / konkretna osoba)
- Filtr statusu (Aktywne / Wszystkie)
- Filtr priorytetu
- Wyszukiwanie tekstowe
- Kolumna **Inne** dla zadan bez powiazania z kontaktem lub w kategoriach bez workflow

## Zmiany techniczne

### Plik: `src/components/deals-team/MyTeamTasksView.tsx`

1. **Nowy widok `viewMode === 'kanban'`** -- zastepuje obecny prosty grid statusowy
2. Dodac konfiguracje `WORKFLOW_COLUMNS` definiujaca kolumny, ikony, kolory i mapowanie z category+stage
3. Nowy `useMemo` do przypisania zadan do kolumn workflow na podstawie powiazanego kontaktu (dociagniecie `teamContacts` juz istnieje)
4. Drag & drop miedzy kolumnami z logika:
   - W ramach tej samej kategorii (np. offering stages) --> bezposredni update `offering_stage`
   - Miedzy kategoriami --> otwarcie NextActionDialog z pre-selectem
5. Kazda kolumna uzywa ScrollArea z kartami zadan (kontakt + tytul + data + priorytet)
6. Horizontalny scroll jak w SubKanbanView

### Plik: `src/hooks/useDealsTeamAssignments.ts`

Drobna zmiana w `useMyTeamAssignments` -- dolaczenie informacji o `category` i `offering_stage` kontaktu do kazdego zadania (dodanie tych pol do mapowania z `deal_team_contacts`).

### Bez zmian:
- NextActionDialog -- juz obsluguje wszystkie przejscia
- KanbanBoard (etapy kontaktow) -- zostaje bez zmian
- SubKanbanView -- zostaje bez zmian
- TaskDetailSheet -- zostaje bez zmian

## Efekt koncowy

Uzytkownik widzi pelny pipeline sprzedazowy z perspektywy **zadan** -- widzi ktore zadanie jest na jakim etapie workflow, moze przeciagac miedzy etapami, a system automatycznie synchronizuje etapy kontaktow. To uzupelnia istniejacy Kanban kontaktow (ktory pokazuje to samo z perspektywy **kontaktow**).
