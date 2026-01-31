

## Plan: Brief Brokerski Gotowy do Wydruku (PDF)

### Cel
Dodać funkcję eksportu Briefu Brokerskiego do profesjonalnego dokumentu PDF, zawierającego:
- Nagłówek z nazwą klienta i datą spotkania
- Szczegóły podzielone według kategorii ryzyka
- Zidentyfikowane luki w pokryciu
- Rekomendacje ubezpieczeniowe

---

## Szczegóły implementacji

### 1. Nowy plik: `src/utils/exportInsuranceBrief.ts`

Funkcja eksportu PDF z następującą strukturą dokumentu:

```text
+============================================+
|  BRIEF BROKERSKI                           |
|  [Logo CC jeśli dostępne]                  |
+--------------------------------------------+
|  KLIENT: Nazwa Firmy Sp. z o.o.            |
|  NIP: 123-456-78-90                        |
|  DATA SPOTKANIA: 31.01.2026                |
|  PRZYGOTOWAŁ: [Dyrektor]                   |
+============================================+

+--------------------------------------------+
|  1. PROFIL KLIENTA                         |
+--------------------------------------------+
|  Branża: Produkcja mebli                   |
|  Przychody: 150 mln PLN                    |
|  Zatrudnienie: 450 osób                    |
|  DNA Operacyjne: Produkcja, Handel, Export |
+--------------------------------------------+

+--------------------------------------------+
|  2. MAJĄTEK I PRZERWY W DZIAŁALNOŚCI       |
+--------------------------------------------+
|  Status: [●] UBEZPIECZONE                  |
|  Lokalizacje: 3                            |
|  Typ własności: Mieszana                   |
|  Suma ubezp. majątek: 45 mln PLN           |
|  Suma ubezp. BI: 12 mln PLN                |
|  Materiały łatwopalne: TAK                 |
|  Awaria maszyn: TAK                        |
|  Uwagi: [tekst]                            |
+--------------------------------------------+

+--------------------------------------------+
|  3. ODPOWIEDZIALNOŚĆ CYWILNA (OC)          |
+--------------------------------------------+
|  Status: [●] LUKA (!)                      |
|  OC produktowe: TAK                        |
|  OC zawodowe: NIE                          |
|  Zakres terytorialny: UE, UK, USA          |
|  ⚠️ Jurysdykcja USA: TAK                   |
|  Obroty USA: 15%                           |
+--------------------------------------------+

+--------------------------------------------+
|  4. FLOTA I LOGISTYKA                      |
+--------------------------------------------+
|  Status: [●] UBEZPIECZONE                  |
|  Pojazdy: 15 szt.                          |
|  Wartość floty: 2,5 mln PLN                |
|  Cargo: TAK                                |
|  CPM: NIE                                  |
+--------------------------------------------+

+--------------------------------------------+
|  5. RYZYKA SPECJALISTYCZNE                 |
+--------------------------------------------+
|  Cyber: [●] LUKA (!) - brak sumy           |
|  D&O: [○] N/D                              |
|  CAR/EAR: [○] N/D                          |
+--------------------------------------------+

+--------------------------------------------+
|  6. PRACOWNICY                             |
+--------------------------------------------+
|  Życie: [●] UBEZPIECZONE (450 os.)         |
|  Zdrowie: [●] UBEZPIECZONE - Pakiet Plus   |
|  Podróże: [●] LUKA (!)                     |
+--------------------------------------------+

+--------------------------------------------+
|  7. ZIDENTYFIKOWANE LUKI                   |
+--------------------------------------------+
|  • OC - brak aktualnej polisy              |
|  • Cyber - ekspozycja e-commerce           |
|  • Podróże służbowe - handlowcy            |
+--------------------------------------------+

+--------------------------------------------+
|  8. ANALIZA AI                             |
+--------------------------------------------+
|  [Treść ai_brief_brokerski jeśli dostępna] |
+--------------------------------------------+

+============================================+
|  Wygenerowano: 31.01.2026 14:30            |
|  System: CRM Broker                        |
+============================================+
```

### 2. Modyfikacja `AIRiskConsultantPanel.tsx`

Dodanie przycisku "Drukuj Brief" obok "Generuj Brief Brokerski":

```typescript
// Nowy przycisk pod istniejącym
<Button
  onClick={onExportBrief}
  disabled={!aiBrief}
  variant="outline"
  className="w-full"
>
  <Printer className="h-4 w-4 mr-2" />
  Drukuj Brief PDF
</Button>
```

### 3. Modyfikacja `InsurancePanel.tsx`

Dodanie handlera eksportu i przekazanie danych do funkcji PDF:

```typescript
import { exportInsuranceBriefToPDF } from '@/utils/exportInsuranceBrief';

const handleExportBrief = () => {
  exportInsuranceBriefToPDF({
    companyName: company.name,
    companyNip: company.nip,
    industry: company.industry,
    revenue: company.revenue_amount,
    employeeCount: company.employee_count,
    meetingDate: new Date(), // lub z inputu
    operationalTypes,
    majatek,
    oc,
    flota,
    specjalistyczne,
    pracownicy,
    aiBrief,
    directorName: director?.full_name,
  });
};
```

### 4. Dodanie pola daty spotkania (opcjonalne)

W `RiskMatrixPanel.tsx` można dodać opcjonalne pole daty spotkania nad sekcjami:

```typescript
<div className="flex items-center gap-4 mb-4">
  <Label>Data spotkania:</Label>
  <Input 
    type="date" 
    value={meetingDate}
    onChange={(e) => setMeetingDate(e.target.value)}
  />
</div>
```

---

## Podsumowanie zmian w plikach

| Plik | Typ zmiany | Opis |
|------|------------|------|
| `src/utils/exportInsuranceBrief.ts` | **NOWY** | Funkcja eksportu briefu do PDF z jsPDF |
| `src/components/insurance/AIRiskConsultantPanel.tsx` | Modyfikacja | Dodanie przycisku "Drukuj Brief PDF" |
| `src/components/insurance/InsurancePanel.tsx` | Modyfikacja | Obsługa eksportu + przekazanie danych firmy |
| `src/components/insurance/RiskMatrixPanel.tsx` | Modyfikacja | Opcjonalne pole daty spotkania |

---

## Struktura eksportowanych danych

```typescript
interface InsuranceBriefExportData {
  // Dane firmy
  companyName: string;
  companyNip?: string;
  industry?: string;
  revenue?: number;
  employeeCount?: string;
  
  // Metadane
  meetingDate?: Date;
  directorName?: string;
  
  // DNA Operacyjne
  operationalTypes: TypDzialnosci[];
  
  // Domeny ryzyka
  majatek: RyzykoMajatkowe;
  oc: RyzykoOC;
  flota: RyzykoFlota;
  specjalistyczne: RyzykoSpecjalistyczne;
  pracownicy: RyzykoPracownicy;
  
  // Analiza AI
  aiBrief?: string;
}
```

---

## Paleta kolorów PDF

- Nagłówek: **Navy Blue** (firma i data)
- Statusy:
  - Ubezpieczone: **Zielony** (#22C55E)
  - Luka: **Czerwony** (#EF4444)
  - N/D: **Szary** (#6B7280)
- Sekcje:
  - Majątek: **Niebieski** (#3B82F6)
  - OC: **Fioletowy** (#8B5CF6)
  - Flota: **Turkusowy** (#14B8A6)
  - Specjalistyczne: **Pomarańczowy** (#F97316)
  - Pracownicy: **Różowy** (#EC4899)
  - Luki: **Czerwony** (#EF4444)
  - AI: **Amber** (#F59E0B)

---

## Przykład wygenerowanego PDF

Nazwa pliku: `Brief_Brokerski_NazwaFirmy_2026-01-31.pdf`

Format: A4 portret, profesjonalny układ tabelaryczny, gotowy do druku i przekazania zespołowi underwritingu.

