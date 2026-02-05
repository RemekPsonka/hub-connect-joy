

# Raport: Analiza widoczności funkcji w UI

## Podsumowanie problemu

System ma **47 Edge Functions**, **60 hooków**, i **25 stron**, ale sidebar pokazuje tylko **6 pozycji nawigacyjnych**. Wiele kluczowych funkcji jest dostępnych tylko przez:
- Bezpośrednie wpisanie URL
- Widgety na Dashboard (które linkują do stron)
- Zagnieżdżone zakładki w widokach szczegółowych

---

## Pełna mapa funkcji: Backend → UI

### A. STRONY W ROUTERZE BEZ LINKU W SIDEBARZE

| Strona | Route | Jak teraz dostępna? | Rekomendacja |
|--------|-------|---------------------|--------------|
| Konsultacje | `/consultations` | Widget Dashboard → "Zobacz wszystkie" | **Dodać do sidebar** |
| Spotkania grupowe | `/meetings` | Widget Dashboard → "Zobacz wszystkie" | **Dodać do sidebar** |
| Dopasowania AI | `/matches` | Widget Dashboard → "Zobacz wszystkie" | **Dodać do sidebar** |
| Sieć kontaktów | `/network` | Widget Dashboard → "Eksploruj sieć" | **Dodać do sidebar** |
| Analityka | `/analytics` | **BRAK DOSTĘPU!** Tylko URL | **Dodać do sidebar** |
| Powiadomienia | `/notifications` | Dzwonek w header | OK (standardowo) |
| Szczegóły firmy | `/companies/:id` | Link z kontaktu | OK (drilldown) |

### B. FUNKCJE UKRYTE W ZAGNIEŻDŻONYCH WIDOKACH

| Funkcja | Lokalizacja | Problem? |
|---------|-------------|----------|
| Business Intelligence | Kontakt → zakładka BI | ⚠️ Mało odkrywalne |
| Agent AI kontaktu | Kontakt → zakładka Agent AI | ⚠️ Mało odkrywalne |
| Analiza firmy (5-etapowa) | Kontakt → widok FIRMA → Źródła | ⚠️ Głęboko zagnieżdżone |
| Struktura kapitałowa | Firma → zakładka Struktura | ⚠️ Bardzo głęboko |
| OCR wizytówek | Modal dodawania kontaktu | OK |
| Import LinkedIn | Modal dodawania kontaktu | OK |
| Scalanie duplikatów | Header Kontaktów → przycisk | OK |
| Eksport danych | Settings → Eksport danych | ✅ Dodane |

### C. EDGE FUNCTIONS BEZ DEDYKOWANEGO UI

| Function | Status | Opis |
|----------|--------|------|
| `ocr-business-cards-batch` | ⚠️ | Hook `useBusinessCardOCR` istnieje, brak UI do batch upload |
| `parse-linkedin-network` | ⚠️ | Hook `useLinkedInNetwork` istnieje, UI w kontakcie ale mało widoczne |
| `analyze-insurance-risk` | ⚠️ | Używane wewnętrznie w pipeline polis |
| `enrich-person-data` | ⚠️ | Wywoływane automatycznie, brak ręcznego triggera |
| `background-sync-runner` | ✅ | Automatyczny (cron) |
| `create-companies-from-emails` | ⚠️ | Wywoływane w Settings → KRS, mało widoczne |

### D. HOOKI Z FUNKCJONALNOŚCIĄ BEZ UI

| Hook | Funkcjonalność | Status UI |
|------|----------------|-----------|
| `useLinkedInAnalysis` | Analiza profilu LinkedIn | ⚠️ Brak przycisku |
| `useLiabilityDNA` | DNA odpowiedzialności | ⚠️ Brak widoku |
| `useInsuranceRiskBatch` | Batch analiza ryzyka | ⚠️ Brak UI |
| `useExposureLocations` | Mapa ekspozycji | ⚠️ Brak mapy |
| `useCapitalGroupMembers` | Członkowie grupy kapitałowej | ✅ W widoku firmy |
| `useRenewalPotential` | Potencjał odnowień | ✅ W pipeline |

---

## Rekomendowany plan naprawy

### PRIORYTET 1: Rozbudowa sidebar (brakujące strony)

```text
OBECNY SIDEBAR:               PROPONOWANY SIDEBAR:
─────────────────             ─────────────────────
Dashboard                     Dashboard
Kontakty                      ──────────────────
Ofertowanie                   📂 CRM
Zadania                         Kontakty
Wyszukiwanie AI                 Konsultacje ← DODAĆ
AI Chat                         Spotkania ← DODAĆ
                                Zadania
                              ──────────────────
                              📂 AI & Analiza
                                AI Chat
                                Wyszukiwanie AI
                                Dopasowania ← DODAĆ
                                Analityka ← DODAĆ
                              ──────────────────
                              📂 Sieć
                                Graf kontaktów ← DODAĆ
                                Ofertowanie
                              ──────────────────
                              ⚙️ Administracja
                                Ustawienia
                                ...
```

### PRIORYTET 2: Onboarding/Discovery

Dodanie sekcji "Odkryj funkcje" na Dashboard lub w Settings:
- Lista wszystkich dostępnych modułów z opisami
- Linki do dokumentacji/tutoriali
- Wskaźnik "% wykorzystanych funkcji"

### PRIORYTET 3: Kontekstowe podpowiedzi

W widoku kontaktu dodać banner informujący o dostępnych zakładkach:
- "Czy wiesz, że możesz przeprowadzić wywiad BI z tym kontaktem?"
- "Uruchom pełną analizę firmy klikając 'FIRMA' →"

---

## Szczegółowa lista zmian w AppSidebar.tsx

### Obecny stan (6 pozycji):
```typescript
const mainNavigationItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Kontakty', url: '/contacts', icon: Users },
  { title: 'Ofertowanie', url: '/pipeline', icon: Briefcase },
  { title: 'Zadania', url: '/tasks', icon: CheckSquare },
  { title: 'Wyszukiwanie AI', url: '/search', icon: Search },
  { title: 'AI Chat', url: '/ai', icon: MessageSquare },
];
```

### Proponowany stan (11 pozycji w grupach):
```typescript
const mainNavigationItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Kontakty', url: '/contacts', icon: Users },
  { title: 'Konsultacje', url: '/consultations', icon: CalendarCheck },  // NOWE
  { title: 'Spotkania', url: '/meetings', icon: UsersRound },            // NOWE
  { title: 'Zadania', url: '/tasks', icon: CheckSquare },
];

const aiNavigationItems = [
  { title: 'AI Chat', url: '/ai', icon: MessageSquare },
  { title: 'Wyszukiwanie AI', url: '/search', icon: Search },
  { title: 'Dopasowania', url: '/matches', icon: Handshake },            // NOWE
  { title: 'Analityka', url: '/analytics', icon: BarChart3 },            // NOWE
];

const networkNavigationItems = [
  { title: 'Sieć kontaktów', url: '/network', icon: Network },           // NOWE
  { title: 'Ofertowanie', url: '/pipeline', icon: Briefcase },
];
```

---

## Podsumowanie priorytetów

| # | Zmiana | Złożoność | Wpływ |
|---|--------|-----------|-------|
| 1 | Dodaj 5 brakujących linków do sidebar | Niska | Wysoki |
| 2 | Pogrupuj sidebar w sekcje | Średnia | Średni |
| 3 | Dodaj tooltips do widgetów Dashboard | Niska | Średni |
| 4 | Dodaj stronę "Odkryj funkcje" | Średnia | Średni |
| 5 | Dodaj UI dla `ocr-business-cards-batch` | Średnia | Niski |
| 6 | Dodaj UI dla `useLinkedInAnalysis` | Średnia | Niski |

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/layout/AppSidebar.tsx` | Dodanie 5 nowych linków + grupowanie |
| `src/pages/Dashboard.tsx` | Opcjonalnie: sekcja "Odkryj więcej funkcji" |
| `src/components/contacts/ContactDetailHeader.tsx` | Opcjonalnie: banner o dostępnych zakładkach |

