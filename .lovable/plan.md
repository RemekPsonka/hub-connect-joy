
## Plan: Rozbudowa Modułu Ryzyka o Domenę Ubezpieczeń Finansowych

### Cel
Dodać nową domenę ryzyka "Ubezpieczenia Finansowe" obejmującą gwarancje ubezpieczeniowe, kredyty kupieckie (trade credit insurance), ochronę należności i inne produkty finansowe. Ta domena jest kluczowa dla firm handlowych, produkcyjnych i budowlanych.

---

## Zakres Nowej Domeny

### Ubezpieczenia Finansowe - Podkategorie:

| Produkt | Opis | Kto potrzebuje |
|---------|------|----------------|
| **Gwarancje kontraktowe** | Wadium, należyte wykonanie, usunięcie wad | Firmy budowlane, wykonawcy |
| **Gwarancje celne i podatkowe** | Zabezpieczenie należności celnych/VAT | Import/eksport |
| **Kredyt kupiecki** | Ochrona należności handlowych (trade credit) | Handel, produkcja, usługi B2B |
| **Faktoring z ubezpieczeniem** | Ochrona należności faktoringowych | Firmy z odroczonym terminem płatności |
| **Wierzytelności sporne** | Koszty dochodzenia roszczeń | Wszystkie branże B2B |

---

## Zmiany Techniczne

### 1. Rozszerzenie typów (`src/components/insurance/types.ts`)

```typescript
// Nowa domena - Ubezpieczenia Finansowe
export interface RyzykoFinansowe {
  // Gwarancje kontraktowe
  gwarancje_kontraktowe_status: StatusUbezpieczenia;
  gwarancje_limit_roczny?: number;
  gwarancje_typy?: ('wadium' | 'nalezyte_wykonanie' | 'usuniecie_wad' | 'zaliczkowa' | 'platnicza')[];
  
  // Gwarancje celne/podatkowe
  gwarancje_celne_status: StatusUbezpieczenia;
  gwarancje_celne_limit?: number;
  
  // Kredyt kupiecki (trade credit)
  kredyt_kupiecki_status: StatusUbezpieczenia;
  kredyt_kupiecki_obroty_ubezpieczone?: number;
  kredyt_kupiecki_eksport?: boolean;
  kredyt_kupiecki_glowne_kraje?: string[];
  
  // Wierzytelności i windykacja
  ochrona_prawna_status: StatusUbezpieczenia;
  ochrona_prawna_zakres?: 'podstawowy' | 'rozszerzony' | 'pelny';
  
  uwagi?: string;
}

// Domyślne wartości
export const DEFAULT_RYZYKO_FINANSOWE: RyzykoFinansowe = {
  gwarancje_kontraktowe_status: 'nie_dotyczy',
  gwarancje_celne_status: 'nie_dotyczy',
  kredyt_kupiecki_status: 'nie_dotyczy',
  ochrona_prawna_status: 'nie_dotyczy',
};
```

### 2. Rozszerzenie głównej struktury analizy

```typescript
export interface AnalizaRyzykaUbezpieczeniowego {
  // ... istniejące pola
  
  // Nowa domena
  ryzyko_finansowe: RyzykoFinansowe;
  
  // ... reszta pól
}
```

---

## Nowe Pliki

### Plik 1: `src/components/insurance/domains/FinancialDomain.tsx`

Nowy komponent formularza z sekcjami:

```
┌──────────────────────────────────────────────────────────────┐
│ 💳 Gwarancje Kontraktowe                                     │
├──────────────────────────────────────────────────────────────┤
│ [Ubezpieczone] [LUKA] [N/D]                                  │
│                                                              │
│ Limit roczny:     [_____________] PLN                        │
│                                                              │
│ Typy gwarancji:                                              │
│ ☐ Wadium  ☐ Należyte wykonanie  ☐ Usunięcie wad             │
│ ☐ Zaliczkowa  ☐ Płatnicza                                   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ 🛃 Gwarancje Celne i Podatkowe                               │
├──────────────────────────────────────────────────────────────┤
│ [Ubezpieczone] [LUKA] [N/D]                                  │
│                                                              │
│ Limit zabezpieczeń: [_____________] PLN                      │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ 📊 Kredyt Kupiecki (Trade Credit)                            │
├──────────────────────────────────────────────────────────────┤
│ [Ubezpieczone] [LUKA] [N/D]                                  │
│                                                              │
│ Obroty ubezpieczone: [_____________] PLN                     │
│ ☑ Eksport (ryzyko zagraniczne)                              │
│ Główne kraje: [PL, DE, CZ...]                               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ ⚖️ Ochrona Prawna (Wierzytelności)                          │
├──────────────────────────────────────────────────────────────┤
│ [Ubezpieczone] [LUKA] [N/D]                                  │
│                                                              │
│ Zakres: [Podstawowy ▼]                                       │
└──────────────────────────────────────────────────────────────┘
```

---

## Modyfikacje Istniejących Plików

### 1. `src/components/insurance/types.ts`
- Dodanie interfejsu `RyzykoFinansowe`
- Dodanie `DEFAULT_RYZYKO_FINANSOWE`
- Rozszerzenie `AnalizaRyzykaUbezpieczeniowego` o nową domenę

### 2. `src/components/insurance/RiskDomainAccordion.tsx`
- Import nowego komponentu `FinancialDomain`
- Dodanie nowego `AccordionItem` z ikoną `Banknote` lub `CreditCard`
- Dodanie funkcji `getFinancialStatusSummary()` dla badge'a statusu

### 3. `src/components/insurance/RiskMatrixPanel.tsx`
- Dodanie propsa `finansowe` i `onFinansoweChange`
- Przekazanie do `RiskDomainAccordion`

### 4. `src/components/insurance/InsurancePanel.tsx`
- Dodanie stanu `finansowe` z `useState`
- Inicjalizacja z `assessment.ryzyko_finansowe`
- Handler `handleFinansoweChange`
- Przekazanie do `RiskMatrixPanel`

### 5. `src/hooks/useInsuranceRisk.ts`
- Rozszerzenie interfejsu `InsuranceAssessment` o `ryzyko_finansowe`
- Rozszerzenie `SaveAssessmentData` o `ryzyko_finansowe`
- Dodanie parsowania pola z bazy danych

### 6. `src/utils/exportInsuranceBrief.ts`
- Rozszerzenie `InsuranceBriefExportData` o `finansowe`
- Dodanie sekcji "UBEZPIECZENIA FINANSOWE" w PDF
- Uwzględnienie luk w gwarancjach/kredycie kupieckim

---

## Migracja Bazy Danych

```sql
-- Dodanie nowej kolumny JSONB dla ryzyka finansowego
ALTER TABLE public.insurance_risk_assessments
ADD COLUMN IF NOT EXISTS ryzyko_finansowe JSONB DEFAULT '{
  "gwarancje_kontraktowe_status": "nie_dotyczy",
  "gwarancje_celne_status": "nie_dotyczy",
  "kredyt_kupiecki_status": "nie_dotyczy",
  "ochrona_prawna_status": "nie_dotyczy"
}'::jsonb;

-- Komentarz opisujący kolumnę
COMMENT ON COLUMN public.insurance_risk_assessments.ryzyko_finansowe IS 
  'Ubezpieczenia finansowe: gwarancje kontraktowe, celne, kredyt kupiecki, ochrona prawna';
```

---

## Logika Biznesowa - Automatyczne Sugestie

W zależności od wybranych typów działalności (DNA Operacyjne), system automatycznie podświetla rekomendowane produkty:

| DNA Operacyjne | Rekomendowane produkty finansowe |
|----------------|----------------------------------|
| **Produkcja** | Kredyt kupiecki, Gwarancje kontraktowe |
| **Handel** | Kredyt kupiecki (eksport/import), Gwarancje płatnicze |
| **Import/Eksport** | Gwarancje celne, Kredyt kupiecki eksportowy |
| **Usługi** | Gwarancje kontraktowe (dla usług B2B) |
| **e-Commerce** | Ochrona prawna (wierzytelności) |

---

## Wizualizacja w Akordenie

```
┌─────────────────────────────────────────────────────────────────┐
│ 🏦 Majątek i Przerwy w Działalności                       N/D  │
├─────────────────────────────────────────────────────────────────┤
│ ⚖️ Odpowiedzialność Cywilna (OC)                         N/D  │
├─────────────────────────────────────────────────────────────────┤
│ 🚚 Flota i Logistyka                                      N/D  │
├─────────────────────────────────────────────────────────────────┤
│ 🔒 Ryzyka Specjalistyczne                                 N/D  │
├─────────────────────────────────────────────────────────────────┤
│ 💰 Ubezpieczenia Finansowe                    [NOWE]    LUKI  │ ◀── NOWA DOMENA
├─────────────────────────────────────────────────────────────────┤
│ 👥 Pracownicy                                             N/D  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Podsumowanie Zmian w Plikach

| Plik | Typ | Opis |
|------|-----|------|
| **Baza danych** |
| Migracja SQL | NOWY | Kolumna `ryzyko_finansowe` (JSONB) |
| **Komponenty** |
| `src/components/insurance/domains/FinancialDomain.tsx` | NOWY | Formularz domeny finansowej |
| `src/components/insurance/types.ts` | MOD | Interfejs `RyzykoFinansowe`, domyślne wartości |
| `src/components/insurance/RiskDomainAccordion.tsx` | MOD | Dodanie 6. sekcji akordeonu |
| `src/components/insurance/RiskMatrixPanel.tsx` | MOD | Props dla nowej domeny |
| `src/components/insurance/InsurancePanel.tsx` | MOD | Stan i handler dla domeny finansowej |
| **Hooki** |
| `src/hooks/useInsuranceRisk.ts` | MOD | Parsowanie i zapis nowego pola |
| **Eksport PDF** |
| `src/utils/exportInsuranceBrief.ts` | MOD | Sekcja "Ubezpieczenia Finansowe" w briefie |

---

## Korzyści Biznesowe

1. **Kompleksowa analiza ryzyka** - Broker ma pełny obraz potrzeb klienta
2. **Identyfikacja luk w gwarancjach** - Często pomijany obszar
3. **Cross-selling** - Możliwość zaproponowania produktów finansowych
4. **Raportowanie** - Brief zawiera wszystkie zidentyfikowane potrzeby
5. **AI Recommendations** - System może sugerować produkty na podstawie DNA operacyjnego
