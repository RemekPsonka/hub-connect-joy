

# Kanban ofertowania z 6 etapami

## Cel
Zamiana obecnego widoku listy w zakladce "Ofertowanie" na widok Kanban z 6 kolumnami etapow procesu ofertowania.

## Nowa kolumna w bazie danych
Tabela `deal_team_contacts` nie posiada pola do sledzenia etapu ofertowania. Potrzebna jest nowa kolumna:

```sql
ALTER TABLE deal_team_contacts 
ADD COLUMN offering_stage text DEFAULT 'handshake';
```

Dopuszczalne wartosci: `handshake`, `power_of_attorney`, `preparation`, `negotiation`, `accepted`, `lost`

## Etapy Kanban

| # | ID | Etykieta | Kolor |
|---|-----|----------|-------|
| 1 | handshake | Handshake | blue |
| 2 | power_of_attorney | Pelnomocnictwo | indigo |
| 3 | preparation | Oferta w przygotowaniu | amber |
| 4 | negotiation | Negocjacje | orange |
| 5 | accepted | Akceptacja | green |
| 6 | lost | Przegrana | red |

## Zmiany w plikach

### 1. Migracja bazy danych
- Dodanie kolumny `offering_stage` (text, default `'handshake'`) do `deal_team_contacts`

### 2. `src/components/deals-team/OfferingTab.tsx`
- Zachowanie istniejacych kart KPI (w ofertowaniu, zaplanowane, oplacone, nadchodzace) i wykresu timeline na gorze
- Ponizej: nowy widok Kanban z 6 kolumnami
- Kontakty z `category = 'offering'` rozdzielone wg `offering_stage`
- Drag & drop miedzy kolumnami (natywny HTML drag, tak jak w `TasksKanban`)
- Kazda karta kontaktu wyswietla: imie, firme, wartosc, liczbe platnosci, nastepna platnosc
- Po kliknieciu karty - mozliwosc rozwijania szczegolow platnosci (zachowanie obecnej logiki `OfferingContactCard`)

### 3. `src/hooks/useDealsTeamContacts.ts`
- Rozszerzenie hooka `useUpdateTeamContact` o obsluge pola `offering_stage`
- Nowa mutacja lub rozszerzenie istniejacego `updateContact` o zmiane `offering_stage`

## Szczegoly techniczne
- Drag & drop: natywny HTML API (wzorzec z `TasksKanban` - `onDragStart`, `onDragOver`, `onDrop`)
- Przy upuszczeniu karty na nowa kolumne: wywolanie `updateContact.mutate({ offering_stage: newStage })`
- Kontakty wchodzace do ofertowania (zmiana `category` na `offering`) automatycznie dostaja `offering_stage = 'handshake'`
- Kolumna "Przegrana" moze opcjonalnie zmieniac `category` kontaktu na `lost` (do ustalenia)

## Przeplyw uzytkownika
1. Uzytkownik otwiera zakladke Ofertowanie
2. Widzi karty KPI i wykres timeline na gorze
3. Ponizej widzi Kanban z 6 kolumnami
4. Przeciaga kontakt miedzy kolumnami aby zmienic etap
5. Klika karte aby rozwinac szczegoly platnosci

