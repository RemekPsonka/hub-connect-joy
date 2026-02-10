

# Reorganizacja zakladek OSOBA / FIRMA

## Cel

Rozdzielic dane osobowe od firmowych. Widok OSOBA zawiera tylko informacje o relacji z osoba (Agent AI, spotkania, potrzeby, poszukiwani, zadania, historia). Widok FIRMA zawiera pelna karte firmy (CompanyView). W prawej kolumnie zostaja: notatki, zadania, mini-karta firmy, statystyki, siec LinkedIn i siec kontaktow.

## Zmiany w `src/pages/ContactDetail.tsx`

### Nowy uklad zakladek w widoku OSOBA

Zamiast obecnych 7 zakladek (Firma, Spotkania, Potrzeby, Profil AI, Siec, Poszukiwani, Wiecej), nowe zakladki:

1. **Spotkania** (BI + Konsultacje -- bez zmian, `MeetingsTab`)
2. **Potrzeby** (Potrzeby + Oferty -- `ContactNeedsOffersTab`)
3. **Poszukiwani** (`ContactWantedTab`)
4. **Profil AI** (Profil AI osoby -- bez zmian)
5. **Wiecej** (Zadania, Udzialy, Historia, Przeglad)

Usuniete z OSOBA:
- Zakladka **Firma** (przeniesiona calkowicie do widoku FIRMA)
- Zakladka **Siec** (przeniesiona do prawej kolumny)

### Nowa prawa kolumna

Kolejnosc elementow w prawej kolumnie (sticky):
1. Notatki (bez zmian, `ContactNotesPanel`)
2. Zadania (bez zmian, `ContactTasksPanel`)
3. Mini-karta firmy (bez zmian, `ContactCompanyCard`)
4. Statystyki (bez zmian, `ContactQuickStats`)
5. **Siec LinkedIn** (`LinkedInNetworkSection`) -- przeniesiona z zakladki Siec
6. **Siec kontaktow** (`ContactConnectionsSection`) -- przeniesiona z zakladki Siec

### Widok FIRMA

Bez zmian -- nadal renderuje `CompanyView`.

### Domyslna zakladka

Zmiana `getDefaultTab()`:
- Domyslna zakladka: `meetings` (zamiast `company`)
- Usunac `company` z listy validTabs
- Dodac `wanted` do validTabs (juz jest)

## Szczegoly techniczne

### Zmiany w TabsList

Obecne:
```text
Firma | Spotkania | Potrzeby | Profil AI | Siec | Poszukiwani | Wiecej
```

Nowe (5 zakladek zamiast 7):
```text
Spotkania | Potrzeby | Poszukiwani | Profil AI | Wiecej
```

Grid zmienia sie z `lg:grid-cols-7` na `lg:grid-cols-5`.

### Przeniesienie sieci do prawej kolumny

Komponenty `LinkedInNetworkSection` i `ContactConnectionsSection` przenoszone z `TabsContent value="network"` do prawej kolumny pod `ContactQuickStats`. Zachowuja te same propsy (`contactId`, `contactName`).

### Zakladka "Wiecej"

Obecna zakladka "Wiecej" zawiera Udzialy, Zadania, Historia, Przeglad. Bez zmian w jej zawartosci.

## Podsumowanie zmian

Modyfikowany jest tylko jeden plik: `src/pages/ContactDetail.tsx`. Zadne komponenty nie sa tworzone ani usuwane -- wszystko to przeniesienie istniejacych komponentow miedzy sekcjami.
