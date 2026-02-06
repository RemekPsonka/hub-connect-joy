

# Przebudowa strony Firma (CompanyDetail) na Split View

## Obecny stan

Strona `/companies/:id` ma prosty layout:
1. Breadcrumb
2. `CompanyProfileHeader` -- karta z logo, nazwa, branża, akcje (Edytuj, Analiza AI)
3. 3 taby: **Analiza AI** | **Grupa kapitałowa** | **Kontakty**

Analiza AI wewnątrz wyświetla `CompanyAnalysisViewer` z 10 sub-tabami (Profil, Finanse, Produkty itd.). Widok jest "płaski" -- cały ekran jest zajęty jednym panelem, brak kontekstowych informacji referencyjnych po boku.

## Nowy layout -- Split View (analogicznie do ContactDetail)

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  Breadcrumb: Dashboard > Firmy > {nazwa}                                │
│  CompanyProfileHeader (bez zmian -- logo, nazwa, branża, akcje)         │
└──────────────────────────────────────────────────────────────────────────┘

┌──── LEWA KOLUMNA (lg:w-[65%]) ──────────────────┐  ┌── PRAWA KOLUMNA (lg:w-[35%]) ──┐
│                                                   │  │                                 │
│  TABS (jednowarstwowe)                           │  │  DANE REJESTROWE (mini karta)   │
│  ┌─────────────────────────────────────────────┐ │  │  ┌─────────────────────────┐   │
│  │ [Źródła][Analiza AI][Struktura][Ubezp.]    │ │  │  │ NIP: 123-456-78-90      │   │
│  │ [Ekspozycja][DNA OC][Harmonogram]          │ │  │  │ KRS: 0000123456         │   │
│  │                                             │ │  │  │ REGON: 123456789        │   │
│  │ {zawartość aktywnego tabu}                  │ │  │  │ Forma: Sp. z o.o.       │   │
│  │                                             │ │  │  │ Adres: ul. Testowa 1    │   │
│  └─────────────────────────────────────────────┘ │  │  │ WWW: www.example.com    │   │
│                                                   │  │  └─────────────────────────┘   │
│                                                   │  │                                 │
│                                                   │  │  KONTAKTY (lista osób)         │
│                                                   │  │  ┌─────────────────────────┐   │
│                                                   │  │  │ 👤 Jan Kowalski         │   │
│                                                   │  │  │    Prezes zarządu        │   │
│                                                   │  │  │ 👤 Anna Nowak            │   │
│                                                   │  │  │    Dyrektor handlowy     │   │
│                                                   │  │  │ [→ Wszyscy kontakty]     │   │
│                                                   │  │  └─────────────────────────┘   │
│                                                   │  │                                 │
│                                                   │  │  SZYBKIE STATYSTYKI            │
│                                                   │  │  ┌─────────────────────────┐   │
│                                                   │  │  │ Pewność: 85%             │   │
│                                                   │  │  │ Źródła: 12               │   │
│                                                   │  │  │ Status: Pełna analiza    │   │
│                                                   │  │  │ Kontakty: 5              │   │
│                                                   │  │  │ Grupa kap.: 3 spółki     │   │
│                                                   │  │  │ Przychód: 12.5M PLN      │   │
│                                                   │  │  └─────────────────────────┘   │
│                                                   │  │                                 │
│                                                   │  │  NOTATKI FIRMY                 │
│                                                   │  │  ┌─────────────────────────┐   │
│                                                   │  │  │ Textarea auto-save       │   │
│                                                   │  │  │ max 2000 znaków          │   │
│                                                   │  │  └─────────────────────────┘   │
│                                                   │  │                                 │
└───────────────────────────────────────────────────┘  └─────────────────────────────────┘
```

### Na mobile (< lg): Jedna kolumna, taby na gorze, potem prawa kolumna pod spodem.

## Pliki do modyfikacji

| Plik | Akcja | Opis |
|------|-------|------|
| `src/pages/CompanyDetail.tsx` | MODYFIKACJA | Nowy split-view layout z lewą/prawą kolumną |
| `src/components/companies/CompanyRegistryCard.tsx` | NOWY | Mini karta danych rejestrowych (NIP/KRS/REGON/adres/www) |
| `src/components/companies/CompanyContactsMini.tsx` | NOWY | Kompaktowa lista osób z firmy (max 5 + "Pokaż wszystkie") |
| `src/components/companies/CompanyQuickStats.tsx` | NOWY | Statystyki: pewność, źródła, status analizy, kontakty, przychód |
| `src/components/companies/CompanyNotesPanel.tsx` | NOWY | Notatki firmy z auto-save (analogicznie do ContactNotesPanel) |

## Co sie NIE zmienia

- `CompanyProfileHeader.tsx` -- bez zmian, zostaje na gorze
- `CompanyFlatTabs.tsx` -- bez zmian, przechodzi do lewej kolumny
- `CompanyAnalysisViewer.tsx` -- bez zmian
- `CapitalGroupViewer.tsx` -- bez zmian
- `CompanyContactsList.tsx` -- bez zmian (pozostaje jako pelny widok w prawo-kolumnowym "Pokaż wszystkie")
- Wszystkie hooki -- bez zmian
- Istniejące moduly (insurance, structure, exposure, liability, renewal) -- bez zmian

## Sekcja techniczna

### 1. CompanyDetail.tsx -- nowy layout

```typescript
// Usunięcie 3 tabów (Analiza AI / Grupa kapitałowa / Kontakty)
// Zamiast tego: split view z CompanyFlatTabs w lewej kolumnie

<div className="container max-w-7xl py-6 space-y-6">
  <Breadcrumb ... />
  <CompanyProfileHeader company={company} />

  {/* SPLIT VIEW */}
  <div className="flex flex-col lg:flex-row gap-6">
    {/* LEWA KOLUMNA */}
    <div className="flex-1 lg:w-[65%] min-w-0">
      <CompanyFlatTabs
        company={company}
        onUpdateRevenue={...}
        isUpdatingRevenue={...}
        onRemoveGroupCompany={...}
      />
    </div>

    {/* PRAWA KOLUMNA -- sticky */}
    <aside className="lg:w-[35%] space-y-4 lg:sticky lg:top-4 lg:self-start">
      <CompanyRegistryCard company={company} />
      <CompanyContactsMini companyId={company.id} />
      <CompanyQuickStats company={company} />
      <CompanyNotesPanel company={company} />
    </aside>
  </div>
</div>
```

Kluczowa zmiana: Usunięcie wrapujących tabów `Analiza AI / Grupa kapitałowa / Kontakty`. `CompanyFlatTabs` juz zawiera tab "Źródła" (pipeline), "Struktura" (grupa kapitałowa), oraz wszystkie taby AI. Trzeba dodać nowy tab "Kontakty" wewnątrz `CompanyFlatTabs` aby nie stracic tej funkcjonalności.

### 2. CompanyFlatTabs.tsx -- dodanie tabu "Kontakty"

Dodanie jednego nowego tabu `contacts` do listy `tabs[]` z ikona `Users` i labelem `Kontakty`. Tab bedzie renderowac `CompanyContactsList` -- komponent juz istnieje.

### 3. CompanyRegistryCard.tsx (NOWY)

```typescript
// Mini karta z danymi rejestrowymi
// Wyswietla: NIP, KRS, REGON, forma prawna, adres, strona WWW
// Kompaktowy layout, klikalne linki (WWW otwiera w nowym tabie)
// Jezeli dane nie istnieja -- nie renderuj pustych pol
```

### 4. CompanyContactsMini.tsx (NOWY)

```typescript
// Kompaktowa lista max 5 osob z firmy
// Kazda osoba: Avatar + imie + stanowisko, link do /contacts/:id
// Jezeli > 5 osob: link "Pokaż wszystkich (n)"
// Uzywa istniejacego hooka useCompanyContacts
```

### 5. CompanyQuickStats.tsx (NOWY)

```typescript
// Siatka statystyk:
// - Pewność danych (confidence_score) -- badge kolorowy
// - Status analizy (completed / pending / brak)
// - Liczba kontaktów (z useCompanyContacts)
// - Przychód (revenue_amount / revenue_year)
// - Branża (industry)
// - Data ostatniej analizy
```

### 6. CompanyNotesPanel.tsx (NOWY)

```typescript
// Analogicznie do ContactNotesPanel:
// - Textarea z auto-save (debounce 1s)
// - Zapis do pola 'notes' w tabeli companies (lub dowolnego pola tekstowego)
// - Max 2000 znaków z licznikiem
// - Badge "Zapisano" / "Zapisywanie..."
// Uwaga: tabela companies moze nie miec pola 'notes' -- 
// jeśli nie istnieje, trzeba dodac migracje
```

### Sprawdzenie pola notes w tabeli companies

Przed implementacją trzeba sprawdzic czy tabela `companies` ma pole `notes`. Jesli nie -- zostanie dodana migracja SQL: `ALTER TABLE companies ADD COLUMN notes TEXT DEFAULT NULL`.

## Guardrails

- NIE usuwaj zadnych istniejacych komponentow -- tylko przenies je w nowe miejsce
- NIE modyfikuj hookow
- NIE modyfikuj Edge Functions
- ZACHOWAJ responsywność -- na mobile (< lg) jedna kolumna
- NIE lamij istniejacych route'ow
- CompanyFlatTabs zachowuje swoje 15 tabow + dodatkowy tab Kontakty
- Kontakty w prawej kolumnie to MINI wersja (max 5), pelna lista jest w nowym tabie CompanyFlatTabs

