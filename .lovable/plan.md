

## Plan: Moduł Analizy Ryzyka Ubezpieczeniowego Firmy

### Kontekst
Moduł "Karta Ubezpieczeniowa" (KI) będzie **nową zakładką w widoku firmy** (obok Źródeł, Profilu AI, Finansów itd.). Nie tworzymy nowych firm - zawsze pracujemy na firmach już istniejących w bazie danych.

---

## Architektura

### Nowe pliki do utworzenia

| Plik | Cel |
|------|-----|
| `src/components/insurance/types.ts` | Interfejsy TypeScript dla domen ryzyka |
| `src/components/insurance/InsurancePanel.tsx` | Główny kontener ze split-screen layout |
| `src/components/insurance/RiskMatrixPanel.tsx` | Lewy panel: DNA Operacyjne + Domeny Ryzyka |
| `src/components/insurance/AIRiskConsultantPanel.tsx` | Prawy panel: Konsultant AI (ciemny motyw) |
| `src/components/insurance/OperationalDNAGrid.tsx` | Siatka kart multi-select definiująca charakter działalności |
| `src/components/insurance/RiskDomainAccordion.tsx` | Akordeon z domenami ryzyka |
| `src/components/insurance/domains/PropertyDomain.tsx` | Majątek i Przerwy w Działalności |
| `src/components/insurance/domains/LiabilityDomain.tsx` | Odpowiedzialność Cywilna (OC) |
| `src/components/insurance/domains/FleetDomain.tsx` | Flota i Logistyka |
| `src/components/insurance/domains/SpecialtyDomain.tsx` | Specjalistyczne (Cyber, D&O, CAR/EAR) |
| `src/components/insurance/domains/EmployeesDomain.tsx` | Pracownicy (Życie, Zdrowie, Podróże) |
| `src/components/insurance/InsuranceStatusToggle.tsx` | Komponent "sygnalizacji świetlnej" |
| `src/hooks/useInsuranceRisk.ts` | Hooki CRUD dla danych ubezpieczeniowych |
| `supabase/functions/analyze-insurance-risk/index.ts` | Edge function do analizy AI |

### Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/company/CompanyFlatTabs.tsx` | Dodanie zakładki "Ubezpieczenia" z ikoną Shield |

---

## Struktura danych

### Typy TypeScript (`src/components/insurance/types.ts`)

```typescript
// DNA Operacyjne - charakter działalności
export type TypDzialnosci = 'produkcja' | 'uslugi' | 'handel' | 'import_export' | 'ecommerce';

// Status ubezpieczenia (sygnalizacja świetlna)
export type StatusUbezpieczenia = 'ubezpieczone' | 'luka' | 'nie_dotyczy';

// Domeny ryzyka
export interface RyzykoMajatkowe {
  status: StatusUbezpieczenia;
  liczba_lokalizacji?: number;
  typ_wlasnosci?: 'wlasnosc' | 'najem' | 'mieszane';
  suma_ubezp_majatek?: number;
  suma_ubezp_bi?: number;
  uwagi?: string;
}

export interface RyzykoOC {
  status: StatusUbezpieczenia;
  oc_produktowe?: boolean;
  oc_zawodowe?: boolean;
  zakres_terytorialny?: string[];
  jurysdykcja_usa?: boolean;
  obroty_wg_regionu?: Record<string, number>;
  uwagi?: string;
}

export interface RyzykoFlota {
  status: StatusUbezpieczenia;
  liczba_pojazdow?: number;
  cargo_ubezpieczone?: boolean;
  cpm_ubezpieczone?: boolean;
  wartosc_floty?: number;
  uwagi?: string;
}

export interface RyzykoSpecjalistyczne {
  cyber_status: StatusUbezpieczenia;
  cyber_suma?: number;
  do_status: StatusUbezpieczenia;
  do_suma?: number;
  car_ear_status: StatusUbezpieczenia;
  car_ear_projekty?: string;
  uwagi?: string;
}

export interface RyzykoPracownicy {
  zycie_status: StatusUbezpieczenia;
  zycie_liczba_pracownikow?: number;
  zdrowie_status: StatusUbezpieczenia;
  zdrowie_typ_pakietu?: string;
  podroze_status: StatusUbezpieczenia;
  uwagi?: string;
}

// Główna struktura analizy
export interface AnalizaRyzykaUbezpieczeniowego {
  id: string;
  company_id: string;
  tenant_id: string;
  
  // DNA Operacyjne
  typy_dzialalnosci: TypDzialnosci[];
  ryzyka_specyficzne_branzowe?: string[];
  
  // Domeny ryzyka
  majatek: RyzykoMajatkowe;
  oc: RyzykoOC;
  flota: RyzykoFlota;
  specjalistyczne: RyzykoSpecjalistyczne;
  pracownicy: RyzykoPracownicy;
  
  // Wygenerowane przez AI
  ai_analiza_kontekstu?: string;
  ai_podpowiedzi?: PodpowiedzAI[];
  ai_brief_brokerski?: string;
  
  created_at: string;
  updated_at: string;
}

export interface PodpowiedzAI {
  id: string;
  wyzwalacz: string;
  wiadomosc: string;
  priorytet: 'krytyczny' | 'ostrzezenie' | 'info';
  domena: string;
}
```

---

## Layout interfejsu

### Układ główny (Split-Screen 65% / 35%)

```text
+--------------------------------------------------+--------------------------------+
|                                                  |                                |
|         MATRYCA RYZYKA (65%)                     |    KONSULTANT AI RYZYKA       |
|         Przewijalna                              |    (35%) Przyklejony           |
|                                                  |    Ciemne tło (slate-900)      |
|  [Nagłówek: Nazwa firmy + Branża + Przychody]   |                                |
|                                                  |  [Analiza kontekstu]           |
|  [DNA OPERACYJNE - SIATKA KART]                  |                                |
|   Produkcja | Usługi | Handel | Import/Export    |  [Podpowiedzi inteligentne]    |
|                                                  |   - Dynamiczne ostrzeżenia     |
|  [DOMENY RYZYKA - AKORDEON]                      |   - Krytyczne pytania          |
|   > Majątek i Przerwy w Działalności             |                                |
|   > Odpowiedzialność Cywilna (OC)                |  [Generuj Brief Brokerski]     |
|   > Flota i Logistyka                            |                                |
|   > Ryzyka Specjalistyczne                       |                                |
|   > Pracownicy                                   |                                |
|                                                  |                                |
+--------------------------------------------------+--------------------------------+
```

### Komponent nagłówka

Wyświetla dane firmy z istniejącego rekordu:
- Nazwa firmy
- Badge branży (np. "Produkcja mebli")
- Badge przychodów (np. "150 mln PLN")

### Siatka DNA Operacyjnego

Karty multi-select z ikonami:

```text
+----------------+  +----------------+  +----------------+
|   [Factory]    |  |   [Wrench]     |  | [ShoppingCart] |
|   Produkcja    |  |    Usługi      |  |     Handel     |
|   ✓ Wybrano    |  |                |  |                |
+----------------+  +----------------+  +----------------+
+----------------+  +----------------+
|   [Globe]      |  |   [Monitor]    |
| Import/Eksport |  |   e-Commerce   |
|   ✓ Wybrano    |  |                |
+----------------+  +----------------+
```

Wybór "Produkcja" dynamicznie pokazuje dodatkowe pola w domenach (np. materiały łatwopalne, awaria maszyn).

### Akordeon Domen Ryzyka

Każda sekcja zawiera:

#### Przełącznik sygnalizacji świetlnej (InsuranceStatusToggle)
```text
[ ● Ubezpieczone ]  [ ● LUKA ]  [ ● N/D ]
    (zielony)        (czerwony)  (szary)
```

#### Pola specyficzne dla domeny

**Majątek i Przerwy w Działalności:**
- Liczba lokalizacji (pole liczbowe)
- Typ własności (select: własność/najem/mieszane)
- Suma ubezpieczenia - Majątek (pole liczbowe)
- Suma ubezpieczenia - BI (pole liczbowe)
- Uwagi (textarea)

**Odpowiedzialność Cywilna (OC):**
- OC produktowe (checkbox)
- OC zawodowe (checkbox)
- Zakres terytorialny (multi-select badges)
- Jurysdykcja USA - ostrzeżenie (checkbox - wyzwala podpowiedź AI!)
- Obroty wg regionu (proste pola klucz-wartość)
- Uwagi (textarea)

**Flota i Logistyka:**
- Liczba pojazdów własnych (liczba)
- Cargo ubezpieczone (checkbox)
- CPM ubezpieczone (checkbox)
- Wartość floty (liczba)
- Uwagi (textarea)

**Ryzyka Specjalistyczne:**
- Cyber: Przełącznik statusu + Suma ubezpieczenia
- D&O: Przełącznik statusu + Suma ubezpieczenia
- CAR/EAR: Przełącznik statusu + Opis projektów
- Uwagi (textarea)

**Pracownicy:**
- Ubezpieczenie na życie: Status + Liczba pracowników
- Ubezpieczenie zdrowotne: Status + Typ pakietu
- Ubezpieczenie podróży: Status
- Uwagi (textarea)

### Panel Konsultanta AI Ryzyka (Prawa strona)

Ciemny motyw (slate-900 lub navy-950):

```text
+--------------------------------+
|  🛡️ Konsultant AI Ryzyka       |
|  ───────────────────────────── |
|                                |
|  ANALIZA KONTEKSTU             |
|  ┌──────────────────────────┐  |
|  │ Kluczowe ryzyka dla      │  |
|  │ Produkcji:               │  |
|  │ • Obciążenie ogniowe     │  |
|  │ • Awaria maszyn          │  |
|  │ • Przerwy w działalności │  |
|  │                          │  |
|  │ Kluczowe ryzyka dla      │  |
|  │ Eksportu:                │  |
|  │ • Uszkodzenie cargo      │  |
|  │ • Wahania kursowe        │  |
|  └──────────────────────────┘  |
|                                |
|  PODPOWIEDZI                   |
|  ┌──────────────────────────┐  |
|  │ ⚠️ KRYTYCZNE              │  |
|  │ Zapytaj o wyłączenia     │  |
|  │ jurysdykcji USA i        │  |
|  │ procent obrotów w        │  |
|  │ Ameryce Północnej.       │  |
|  └──────────────────────────┘  |
|  ┌──────────────────────────┐  |
|  │ 💡 REKOMENDACJA           │  |
|  │ Dla producenta mebli:    │  |
|  │ sprawdź zgodność         │  |
|  │ przeciwpożarową          │  |
|  └──────────────────────────┘  |
|                                |
|  [📄 Generuj Brief Brokerski]  |
+--------------------------------+
```

---

## Schemat bazy danych

Nowa tabela `insurance_risk_assessments`:

```sql
CREATE TABLE insurance_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID NOT NULL,
  
  -- DNA Operacyjne
  typy_dzialalnosci TEXT[] DEFAULT '{}',
  ryzyka_specyficzne_branzowe JSONB DEFAULT '[]',
  
  -- Domeny ryzyka (JSONB dla elastyczności)
  ryzyko_majatkowe JSONB DEFAULT '{}',
  ryzyko_oc JSONB DEFAULT '{}',
  ryzyko_flota JSONB DEFAULT '{}',
  ryzyko_specjalistyczne JSONB DEFAULT '{}',
  ryzyko_pracownicy JSONB DEFAULT '{}',
  
  -- Treści generowane przez AI
  ai_analiza_kontekstu TEXT,
  ai_podpowiedzi JSONB DEFAULT '[]',
  ai_brief_brokerski TEXT,
  
  -- Metadane
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Polityka RLS
ALTER TABLE insurance_risk_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insurance_risk_assessments_tenant_access"
ON insurance_risk_assessments FOR ALL
USING (tenant_id = get_current_tenant_id())
WITH CHECK (tenant_id = get_current_tenant_id());
```

---

## Integracja z widokiem firmy

### Modyfikacja `CompanyFlatTabs.tsx`

Dodanie nowej zakładki "Ubezpieczenia" z ikoną Shield:

```typescript
const tabs = [
  { id: 'sources', label: 'Źródła', icon: Database, always: true },
  { id: 'profile', label: 'Profil AI', icon: Building, always: hasAnalysis },
  { id: 'financials', label: 'Finanse', icon: DollarSign, always: hasAnalysis },
  // ... inne zakładki ...
  { id: 'insurance', label: 'Ubezpieczenia', icon: Shield, always: true }, // NOWA
];
```

```typescript
<TabsContent value="insurance" className="mt-0">
  <InsurancePanel company={company} />
</TabsContent>
```

---

## Edge Function AI (`analyze-insurance-risk`)

Funkcja będzie:

1. **Analizować DNA Operacyjne** - Po wyborze typów działalności AI identyfikuje kluczowe ryzyka
2. **Generować Podpowiedzi** - Sugestie w czasie rzeczywistym (np. "Eksport do USA" wyzwala ostrzeżenie o jurysdykcji)
3. **Tworzyć Brief Brokerski** - Kompleksowe podsumowanie dla zespołu back-office

**Szablon promptu:**

```text
Jesteś ekspertem ds. strategii ubezpieczeń korporacyjnych. Na podstawie profilu klienta:

FIRMA: {nazwa_firmy}
BRANŻA: {branza}
PRZYCHODY: {przychody}

DNA OPERACYJNE:
{wybrane_typy_dzialalnosci}

DANE OCENY RYZYKA:
{wszystkie_dane_domen}

ZADANIA:
1. ANALIZA KONTEKSTU: Zidentyfikuj top 5 kluczowych ryzyk dla tego profilu biznesowego
2. PODPOWIEDZI: Wygeneruj 3-5 krytycznych pytań, które broker powinien zadać
3. ANALIZA LUK: Zidentyfikuj brakujące obszary pokrycia oznaczone jako "luka"
4. BRIEF BROKERSKI: Utwórz kompleksowe 1-stronicowe podsumowanie dla zespołu underwritingu

Skup się na:
- Ekspozycjach specyficznych dla branży
- Wymaganiach regulacyjnych
- Typowych scenariuszach szkód
- Możliwościach cross-sellingu
```

---

## Dane demonstracyjne (Producent Mebli z Eksportem Globalnym)

Wstępne wypełnienie dla demonstracji:

```typescript
const demoData: AnalizaRyzykaUbezpieczeniowego = {
  typy_dzialalnosci: ['produkcja', 'handel', 'import_export'],
  
  majatek: {
    status: 'ubezpieczone',
    liczba_lokalizacji: 3,
    typ_wlasnosci: 'mieszane',
    suma_ubezp_majatek: 45000000,
    suma_ubezp_bi: 12000000,
  },
  
  oc: {
    status: 'luka', // CZERWONY - szansa sprzedażowa!
    oc_produktowe: true,
    oc_zawodowe: false,
    zakres_terytorialny: ['UE', 'UK', 'USA'],
    jurysdykcja_usa: true, // Wyzwala ostrzeżenie AI
  },
  
  flota: {
    status: 'ubezpieczone',
    liczba_pojazdow: 15,
    cargo_ubezpieczone: true,
    cpm_ubezpieczone: false,
  },
  
  specjalistyczne: {
    cyber_status: 'luka', // CZERWONY
    do_status: 'nie_dotyczy',
    car_ear_status: 'nie_dotyczy',
  },
  
  pracownicy: {
    zycie_status: 'ubezpieczone',
    zycie_liczba_pracownikow: 450,
    zdrowie_status: 'ubezpieczone',
    podroze_status: 'luka', // CZERWONY - dla podróżujących handlowców
  },
};

// Wygenerowane przez AI podpowiedzi dla tego profilu:
const demoPodpowiedzi: PodpowiedzAI[] = [
  {
    id: '1',
    wyzwalacz: 'jurysdykcja_usa',
    wiadomosc: 'KRYTYCZNE: Zapytaj o wyłączenia jurysdykcji USA i procent obrotów w Ameryce Północnej. Recall produktów w USA może przekroczyć 10 mln EUR.',
    priorytet: 'krytyczny',
    domena: 'oc'
  },
  {
    id: '2',
    wyzwalacz: 'produkcja',
    wiadomosc: 'Dla produkcji mebli: Sprawdź zgodność przeciwpożarową, systemy odpylania pyłu drzewnego i pokrycie awarii maszyn.',
    priorytet: 'ostrzezenie',
    domena: 'majatek'
  },
  {
    id: '3',
    wyzwalacz: 'cyber_luka',
    wiadomosc: 'SZANSA: Wykryto lukę w ubezpieczeniu cyber. Kanał e-commerce tworzy ekspozycję na naruszenie danych.',
    priorytet: 'ostrzezenie',
    domena: 'specjalistyczne'
  }
];
```

---

## Paleta kolorów

Zgodna z istniejącym systemem designu + akcenty ubezpieczeniowe:

- **Podstawowa**: Slate blues (istniejąca)
- **Sygnalizacja świetlna**:
  - Zielony (Ubezpieczone): `bg-green-500 text-white`
  - Czerwony (Luka): `bg-destructive text-destructive-foreground`
  - Szary (N/D): `bg-muted text-muted-foreground`
- **Panel AI**: `bg-slate-900 dark:bg-slate-950`
- **Podpowiedzi krytyczne**: `border-red-500 bg-red-50 dark:bg-red-950/30`
- **Podpowiedzi ostrzegawcze**: `border-amber-500 bg-amber-50 dark:bg-amber-950/30`
- **Podpowiedzi informacyjne**: `border-blue-500 bg-blue-50 dark:bg-blue-950/30`

---

## Użyte ikony (Lucide)

- Factory (Produkcja)
- Wrench (Usługi)
- ShoppingCart (Handel)
- Globe (Import/Eksport)
- Monitor (e-Commerce)
- Shield (Ubezpieczenia ogólne)
- Building (Majątek)
- Scale (OC)
- Truck (Flota)
- Lock (Cyber/Specjalistyczne)
- Users (Pracownicy)
- AlertTriangle (Podpowiedzi krytyczne)
- Lightbulb (Rekomendacje)
- FileText (Brief Brokerski)

---

## Przepływ użytkownika

1. Użytkownik wchodzi do **widoku firmy** (przez listę firm lub przez kontakt z przypisaną firmą)
2. Wybiera zakładkę **"Ubezpieczenia"**
3. Widzi nagłówek z danymi firmy (nazwa, branża, przychody - pobrane z istniejącego rekordu)
4. Zaznacza odpowiednie karty w **DNA Operacyjnym**
5. Wypełnia **Domeny Ryzyka** z sygnalizacją świetlną
6. Panel AI na bieżąco wyświetla **analizę kontekstu** i **podpowiedzi**
7. Po uzupełnieniu danych klika **"Generuj Brief Brokerski"**
8. Otrzymuje kompleksowe podsumowanie dla zespołu back-office

