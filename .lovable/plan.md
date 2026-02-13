

# Workflow lejka sprzedazowego -- Snooze + Zadania zespolowe

## Problem

1. **Zasmiecanie lejka**: Kontakt w HOT po spotkaniu, ale temat odlozony na 6 miesiecy (np. polisa konczy sie za 8 miesiecy) -- blokuje widok aktywnych spraw.
2. **Brak koordynacji zespolowej**: 3 osoby pracuja na tych samych kontaktach z roznymi zadaniami, brak widocznosci kto co robi i kiedy.

## Rozwiazanie

### Czesc 1: Mechanizm "Snooze" (Odlozenie kontaktu)

Kontakt w lejku dostaje opcje **"Odloz do [data]"** z powodem. Kontakt znika z glownego widoku Kanban, ale pozostaje w bazie z data automatycznego powrotu. System sam go "budzi" gdy nadejdzie czas.

**Jak to dziala:**
- Klikniesz na kontakt w HOT/TOP/LEAD -> w szczegolach pojawi sie przycisk "Odloz"
- Wybierasz date powrotu (np. za 3 miesiace) i wpisujesz krotki powod
- Kontakt znika z Kanbana, ale pojawia sie w nowej sekcji "Odlozone" (maly pasek nad Kanbanem z licznikiem)
- Gdy nadejdzie data -- kontakt automatycznie wraca do swojej kategorii i pojawia sie powiadomienie
- Mozesz tez recznie "obudzic" kontakt wczesniej

**Zmiany w bazie danych:**
- Nowe kolumny w `deal_team_contacts`:
  - `snoozed_until` (date) -- data powrotu
  - `snooze_reason` (text) -- powod odlozenia
  - `snoozed_from_category` (text) -- kategoria przed snooze (zeby wiedziec gdzie wrocic)

**Zmiany w UI:**
- Kanban filtruje kontakty: `snoozed_until IS NULL OR snoozed_until <= today`
- Nowy pasek "Odlozone (X)" nad Kanbanem -- klikniecie rozwija liste
- W DealContactDetailSheet: przycisk "Odloz" z dialogiem (data + powod)
- Badge na karcie jesli kontakt wlasnie "obudzil sie" (dzis = snoozed_until)

### Czesc 2: Zadania zespolowe per kontakt (rozbudowa istniejacego systemu)

Obecny system `deal_team_assignments` juz istnieje, ale nie jest w pelni wykorzystany. Rozbudujemy go:

**Widok "Moje zadania w lejku"** -- nowa zakladka obok Kanban/Tabela/Prospecting:
- Kazdy czlonek zespolu widzi SWOJE zadania ze wszystkich kontaktow
- Sortowane po dacie i priorytecie
- Szybkie akcje: oznacz jako zrobione, zmien termin, przekaz komus innemu

**Ulepszenia w DealContactDetailSheet:**
- Sekcja "Zadania operacyjne" (juz istnieje sekcja Zadania -- rozbudujemy o przypisanie do osoby)
- Przy tworzeniu zadania: wybor osoby z zespolu + termin
- Widocznosc kto ma jakie zadanie przy kontakcie

**Szybkie akcje na karcie Kanban:**
- Na kazdej karcie maly wskaznik: ikona osoby odpowiedzialnej + liczba otwartych zadan
- Kolor wskaznika: zielony (wszystko ok), czerwony (przeterminowane zadanie)

### Czesc 3: Automatyczne przypomnienia

- Trigger bazodanowy: codziennie sprawdza `snoozed_until` i "budzi" kontakty (ustawia `snoozed_until = NULL`)
- Kontakty z przeterminowanymi zadaniami automatycznie dostaja flage
- Na dashboardzie zespolu: widget "Wymagaja uwagi" (obudzone + przeterminowane zadania)

---

## Szczegoly techniczne

### Migracja SQL

```text
ALTER TABLE deal_team_contacts
  ADD COLUMN snoozed_until date,
  ADD COLUMN snooze_reason text,
  ADD COLUMN snoozed_from_category text;

-- Index na snooze dla szybkiego filtrowania
CREATE INDEX idx_deal_team_contacts_snoozed
  ON deal_team_contacts (snoozed_until)
  WHERE snoozed_until IS NOT NULL;
```

### Nowe/zmienione pliki

| Plik | Zmiana |
|------|--------|
| `src/components/deals-team/SnoozeDialog.tsx` | NOWY -- dialog odlozenia (data + powod) |
| `src/components/deals-team/SnoozedContactsBar.tsx` | NOWY -- pasek nad Kanbanem z lista odlozonych |
| `src/components/deals-team/SnoozedContactCard.tsx` | NOWY -- karta odlozonego kontaktu z opcja "Obudz" |
| `src/components/deals-team/MyTeamTasksView.tsx` | NOWY -- widok "Moje zadania" per czlonek |
| `src/components/deals-team/KanbanBoard.tsx` | Filtrowanie snoozed, dodanie SnoozedContactsBar |
| `src/components/deals-team/DealContactDetailSheet.tsx` | Przycisk "Odloz", rozbudowa sekcji zadan o przypisanie |
| `src/components/deals-team/HotLeadCard.tsx` (i inne karty) | Wskaznik zadan i osoby odpowiedzialnej |
| `src/hooks/useDealsTeamContacts.ts` | Logika snooze/unsnooze, filtr snoozed |
| `src/hooks/useDealsTeamAssignments.ts` | Nowy hook `useMyTeamAssignments` -- zadania per user |
| `src/types/dealTeam.ts` | Nowe pola w DealTeamContact |

### Flow przykladowy

```text
1. Pawel widzi "Jan Kowalski" w LEAD
2. Tworzy zadanie: "Zadzwonic i umowic spotkanie dla Adama" -> przypisuje do siebie, termin: piatek
3. Pawel dzwoni, umawia spotkanie -> oznacza zadanie jako zrobione
4. Przenosi kontakt do HOT (bo spotkanie umowione)
5. Adam spotyka sie -> zapisuje notatke: "polisa konczy sie za 8 mies., audyt za 6 mies."
6. Adam klika "Odloz" -> ustawia date za 5 miesiecy, powod: "Audyt przed odnowieniem polisy"
7. Kontakt znika z HOT, pojawia sie w pasku "Odlozone (1)"
8. Za 5 miesiecy: kontakt automatycznie wraca do HOT, zespol dostaje powiadomienie
9. Adam tworzy zadanie dla Lukasza: "Przygotuj oferte audytu" -> termin: 2 tygodnie
```

### Kolejnosc implementacji

1. Migracja SQL (nowe kolumny)
2. Typy + hooki (snooze/unsnooze, filtrowanie)
3. SnoozeDialog + SnoozedContactsBar
4. Integracja z KanbanBoard
5. Rozbudowa DealContactDetailSheet (snooze + zadania z przypisaniem)
6. MyTeamTasksView
7. Wskazniki na kartach Kanban

