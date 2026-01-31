

## Plan: Integracja pola "Siła relacji" w BI, nagłówku kontaktu i analizie AI

### Podsumowanie zmian
1. **Arkusz BI (sekcja A)**: Dodanie pola `sila_relacji` (1-10) pod "Status relacji"
2. **Karta kontaktu**: Przeniesienie wskaznika siły relacji bezpośrednio pod imię i nazwisko
3. **AI Agent**: Wzmocnienie promptów o kontekst budowania relacji zależny od siły

---

## Szczegóły implementacji

### 1. Typy BI (`src/components/bi/types.ts`)

Dodanie nowego pola do interfejsu `SectionABasic`:

```typescript
// Kontekst spotkania (B)
podpowiedzi_brief?: string;
status_relacji?: 'nowy' | 'polecony' | 'powracajacy' | 'znajomy' | 'klient';
sila_relacji?: number;  // NOWE: 1-10
rozważa_aplikacje_cc?: 'tak' | 'nie' | 'nie_wiem';
```

---

### 2. Formularz BI (`src/components/bi/sections/SectionABasic.tsx`)

Dodanie pola "Siła relacji" ze sliderem 1-10 pod polem "Status relacji":

```text
┌─────────────────────────────────────────┐
│ Status relacji *                        │
│ [▼ Wybierz status]                      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐  ← NOWE
│ Siła relacji                            │
│ ●──────────────────────────────● 7/10   │
│ [Słaba]                       [Silna]   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Czy rozważa aplikację do CC?            │
│ [▼ Wybierz]                             │
└─────────────────────────────────────────┘
```

Komponent:
- Slider Radix 1-10 z wizualnym paskiem
- Etykiety "Słaba" / "Silna"
- Domyślna wartość: 5

---

### 3. Nagłowek kontaktu (`src/components/contacts/ContactDetailHeader.tsx`)

Przeniesienie `RelationshipStrengthBar` bezpośrednio pod imię osoby:

```text
┌──────────────────────────────────────────────────────────────────────┐
│ [Avatar]  Jan Kowalski              [Właściciel]                     │
│           [●●●●●●●○○○] 7/10 siła relacji  ← NOWE (pod imieniem)      │
│           Dyrektor Sprzedaży                                         │
│           📧 jan@firma.pl  📞 +48 123 456  🔗 LinkedIn                │
│           [Grupa: A-klasa]                                           │
└──────────────────────────────────────────────────────────────────────┘
```

Zmiana:
- Usunięcie sekcji "Wskazniki relacji" (linie 242-257)
- Dodanie `RelationshipStrengthBar` bezpośrednio po imieniu, przed stanowiskiem
- Zmiana na bardziej kompaktowy format inline

---

### 4. Edge Functions - AI Agent

#### A. `supabase/functions/initialize-contact-agent/index.ts`

Dodanie informacji o sile relacji do promptu AI z instrukcją jak to uwzględnić:

```typescript
// W sekcji DANE KONTAKTU (ok. linia 167):
- Siła relacji: ${contact.relationship_strength || 5}/10
  ${contact.relationship_strength <= 3 ? '⚠️ SŁABA RELACJA - priorytet: BUDOWANIE RELACJI' : ''}
  ${contact.relationship_strength >= 7 ? '✓ SILNA RELACJA - można przejść do konkretu biznesowego' : ''}

// Dodanie do promptu (nowa sekcja zasad):
## INSTRUKCJE DOT. SIŁY RELACJI
- Jeśli siła relacji <= 3: Agent powinien położyć DUŻY nacisk na budowanie relacji, poznawanie osoby, znajdowanie wspólnych tematów
- Jeśli siła relacji 4-6: Zbalansowane podejście - budowanie relacji + lekkie tematy biznesowe
- Jeśli siła relacji >= 7: Można przejść od razu do konkretów biznesowych, bo relacja jest już zbudowana
```

#### B. `supabase/functions/query-contact-agent/index.ts`

Dodanie kontekstu relacji do odpowiedzi AI:

```typescript
// W promptzie (ok. linia 144):
- Siła relacji: ${contact?.relationship_strength || 5}/10
${(contact?.relationship_strength || 5) <= 3 ? `
⚠️ UWAGA: Słaba relacja! W odpowiedziach:
- Sugeruj sposoby na budowanie zaufania
- Proponuj tematy "ludzkie" (hobby, rodzina, wspólne zainteresowania)
- Unikaj nachalnych propozycji sprzedażowych
` : ''}
${(contact?.relationship_strength || 5) >= 7 ? `
✓ Silna relacja - możesz:
- Proponować konkretne działania biznesowe
- Być bezpośredni w komunikacji
- Sugerować ambitniejsze cele współpracy
` : ''}
```

#### C. `supabase/functions/learn-contact-agent/index.ts`

Dodanie analizy siły relacji do procesu uczenia:

```typescript
// W sekcji DANE PODSTAWOWE OSOBY (ok. linia 226):
- Siła relacji: ${contact.relationship_strength || 5}/10 ${contact.relationship_strength <= 3 ? '(słaba - wymaga budowania)' : contact.relationship_strength >= 7 ? '(silna - można działać biznesowo)' : '(średnia)'}
```

---

## Podsumowanie zmian w plikach

| Plik | Typ zmiany | Opis |
|------|------------|------|
| `src/components/bi/types.ts` | Modyfikacja | Dodanie `sila_relacji?: number` do `SectionABasic` |
| `src/components/bi/sections/SectionABasic.tsx` | Modyfikacja | Dodanie slidera 1-10 pod "Status relacji" |
| `src/components/contacts/ContactDetailHeader.tsx` | Modyfikacja | Przeniesienie wskaznika pod imię, usunięcie sekcji wskazników |
| `supabase/functions/initialize-contact-agent/index.ts` | Modyfikacja | Dodanie kontekstu siły relacji do promptu |
| `supabase/functions/query-contact-agent/index.ts` | Modyfikacja | Dodanie instrukcji zależnych od siły relacji |
| `supabase/functions/learn-contact-agent/index.ts` | Modyfikacja | Uwzględnienie siły relacji w analizie |

---

## Logika AI - szczegóły

### Słaba relacja (1-3):
```text
PRIORYTET: Budowanie zaufania
- Szukaj wspólnych zainteresowań (hobby, sport, rodzina)
- Zadawaj pytania osobiste (ale nie natarczywe)
- Unikaj twardych tematów sprzedażowych
- Proponuj spotkania nieformalne
- DO: poznaj człowieka zanim przejdziesz do biznesu
- DON'T: nie naciskaj na decyzje biznesowe
```

### Średnia relacja (4-6):
```text
PODEJŚCIE: Zbalansowane
- Mieszaj tematy osobiste z biznesowymi
- Buduj dalej, ale możesz proponować współpracę
- Sprawdzaj czy jest otwarty na konkretne propozycje
```

### Silna relacja (7-10):
```text
PRIORYTET: Działanie biznesowe
- Możesz przejść od razu do konkretów
- Proponuj ambitne cele i projekty
- Bądź bezpośredni w komunikacji
- Możesz prosić o polecenia i referencje
```

