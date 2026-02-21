

# Dodanie opcji "Audyt" do dialogu Dalsze Działania

## Problem
W dialogu "Dalsze działania" (NextActionDialog) brakuje opcji przeniesienia kontaktu do kategorii AUDYT. Obecnie dostepne sa tylko: spotkanie, oferta, telefon, mail, odloz, klient, utracony -- ale nie ma mozliwosci awansu do etapu Audyt.

## Rozwiazanie

**Plik:** `src/components/deals-team/NextActionDialog.tsx`

Zmiany:
1. Dodac nowy `ActionType`: `'audit'`
2. Dodac opcje w `ACTION_OPTIONS`: "Audyt -- umowione spotkanie" z ikona i `needsDate: true`
3. Dodac nowy import ikony (`ClipboardCheck` lub uzyc istniejacego `CalendarIcon`)
4. W `handleSave` switch: ustawic `newCategory = 'audit'`, `newOfferingStage = 'audit_scheduled'`, tytul zadania np. "Audyt u {contactName} - {data}"
5. Zapisac `nextMeetingDate` (tak jak przy `meeting_scheduled`) -- wymaganie z zasad systemu: awans do AUDYT wymaga daty spotkania i osoby

Kolejnosc przyciskow w dialogu (zaktualizowana):
- Umow spotkanie
- Spotkanie umowione
- **Audyt (NOWY)**
- Wyslij oferte
- Zadzwon
- Wyslij mail
- Odloz (10x)
- Klient
- Utracony

Dialog bedzie mial 9 opcji (5 w pierwszej kolumnie, 4 w drugiej, lub grid 3-kolumnowy dla lepszego ukladu z 9 elementami).

## Szczegoly techniczne

W switch w `handleSave`:
```
case 'audit':
  newTitle = `Audyt u ${contactName} - ${format(dueDate, 'd MMM', { locale: pl })}`;
  newCategory = 'audit';
  newOfferingStage = 'audit_scheduled';
  // + zapis nextMeetingDate i next_meeting_with (assignedTo)
  break;
```

Przy zapisie kontaktu, jesli `selected === 'audit'`, nalezy dodatkowo ustawic:
- `contactUpdate.nextMeetingDate = dateStr`
- `contactUpdate.nextMeetingWith = assignedTo` (pole `next_meeting_with` w tabeli `deal_team_contacts`)

To spelnia wymaganie systemowe: awans do AUDYT wymaga daty spotkania i osoby odpowiedzialnej.
