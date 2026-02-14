

# Redesign TaskDetailSheet w stylu Asana

## Cel
Przebudowa panelu szczegolowego zadania (`TaskDetailSheet`) na uklad inspirowany Asana (jak na screenshocie), z czytelnym formularzem metadanych, sekcja projektu, komentarzami na dole i przejrzystym ukladem.

## Obecny stan
Panel jest oparty na Sheet (480px boczny), z luznymi sekcjami oddzielonymi separatorami. Metadane (status, priorytet, termin, wlasciciel) sa rozproszone w badge'ach i malych elementach. Brak struktury "etykieta -> wartosc" jak w Asana.

## Planowane zmiany

### 1. Przebudowa layoutu `TaskDetailSheet.tsx`

Nowy uklad wzorowany na Asana:

```text
+-----------------------------------------------+
| [v Oznacz jako ukonczone]     [Edytuj] [Duplikuj] [Usun] [...] |
+-------------------------------------------------+
|                                                  |
|  Tytul zadania (edytowalny inline, duzy font)    |
|                                                  |
|  Osoba odpowiedzialna    [Avatar] Jan Kowalski   |
|  Data wykonania          [Kal] 15 marca 2026     |
|  Priorytet               [*] Wysoki              |
|  Status                  [O] W trakcie           |
|  Widocznosc              [Zespolowe]             |
|  Etykiety                [tag1] [tag2] [+]       |
|  Zaleznosci              Dodaj zaleznosci        |
|  Cyklicznosc             Co tydzien              |
|                                                  |
|  Projekty  1  [+]                                |
|  v Projekt ABC    Status: W trakcie              |
|                                                  |
|  Powiazane kontakty                              |
|  Jan Kowalski · Firma XYZ                        |
|                                                  |
|  ---- Subtaski (2/5) ========================    |
|  [x] Subtask 1                                   |
|  [ ] Subtask 2                                   |
|  [Dodaj subtask...]                              |
|                                                  |
|  ---- Opis ----                                  |
|  Tresc opisu zadania...                          |
|                                                  |
|  ---- Sledzenie czasu ----                       |
|  [Timer] Lacznie: 2h 30min                       |
|                                                  |
|  ---- Spotkania ----                             |
|  Spotkanie 15.03                                 |
|                                                  |
|  ---- Historia zmian ----                        |
|  Jan · Status: todo -> in_progress · 2h temu     |
|                                                  |
+--------------------------------------------------+
| [Avatar] Dodaj komentarz...              [Wyslij]|
+--------------------------------------------------+
|  Komentarze (3)                                  |
|  [AK] Adam · Swietnie! · 1h temu                |
+--------------------------------------------------+
```

### Kluczowe zmiany wizualne:

**A. Gora - Pasek akcji**
- Przycisk "Oznacz jako ukonczone" (z ptaszkiem) - wyrazny, po lewej
- Przyciski akcji (Edytuj, Duplikuj, Usun) - po prawej, ikony

**B. Tytul - duzy, edytowalny inline**
- Klikniecie zmienia na Input
- Font `text-xl font-semibold`

**C. Metadane - uklad tabelaryczny (etykieta : wartosc)**
- Kazdy wiersz: `label (140px, text-muted)` | `wartosc (klikalna do edycji)`
- Osoba odpowiedzialna - avatar + imie, klik otwiera dropdown
- Data wykonania - ikona kalendarza + data, klik otwiera DatePicker
- Priorytet - kolorowa kropka + nazwa, klik otwiera dropdown
- Status - ikona + nazwa, klik otwiera dropdown
- Widocznosc - badge
- Etykiety - tagi inline
- Zaleznosci - link "Dodaj zaleznosci"
- Cyklicznosc - jesli ustawiona

**D. Sekcja Projekty**
- Naglowek z liczba + przycisk [+]
- Lista projektow z nazwa i statusem

**E. Powiazane kontakty** - klikalne nazwy

**F. Opis** - edytowalny textarea, placeholder "Czego dotyczy to zadanie?"

**G. Subtaski** - bez zmian (DnD, progress bar)

**H. Komentarze** - przeniesione na dol, avatar + input "Dodaj komentarz" przyklejony na dole

**I. Cross-task workflow** - bez zmian w logice, tylko lepszy uklad

### 2. Poszerzenie panelu
- Sheet z `w-[480px]` na `w-[560px] sm:max-w-[560px]` - wiecej miejsca na metadane

### 3. Inline edit tytulu
- Nowy stan `editingTitle` + `titleValue`
- Klikniecie na tytul -> Input
- Enter/Blur -> zapis przez `useUpdateTask`
- Escape -> anuluj

### 4. Inline edit opisu
- Nowy stan `editingDescription`
- Klikniecie na opis -> Textarea
- Blur -> zapis

### 5. Inline zmiana priorytetu/statusu
- Dropdown bezposrednio w sekcji metadanych (zamiast badge'y)
- Uzycie istniejacych `STATUS_CONFIG` i `PRIORITY_CONFIG` z `UnifiedTaskRow`

## Pliki do edycji

| Plik | Operacja |
|---|---|
| `src/components/tasks/TaskDetailSheet.tsx` | Przebudowa layoutu - jedyny plik |

Zmiany dotycza wylacznie renderowania JSX i dodania stanow do inline edit. Wszystkie hooki (subtaski, komentarze, etykiety, zaleznosci, time tracker, activity log) pozostaja bez zmian - sa juz wyodrebnione jako osobne komponenty.

## Brak zmian w bazie danych
Wszystkie potrzebne dane sa juz pobierane. Nie potrzeba migracji.

