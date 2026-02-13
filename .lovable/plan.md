

# Wzbogacenie formularza statusu o etap lejka i kontekst w zadaniu

## Zmiany w `src/components/deals-team/WeeklyStatusForm.tsx`

### 1. Wyswietlenie obecnego etapu lejka w naglowku

W sekcji `DialogHeader` (linia 266-270), pod nazwa kontaktu i tygodniem, dodanie badge z aktualnym etapem lejka (np. "LEAD", "HOT", "COLD"). Wykorzystanie propa `currentCategory` ktory juz jest przekazywany.

```text
Dariusz Lyson
Firma XYZ
Etap: LEAD
Tydzien: 09.02 - 15.02.2026
```

Badge bedzie kolorowy, uzywajac mapy kolorow analogicznej do `categoryConfig` z `DealContactDetailSheet`.

### 2. Wzbogacenie opisu zadania o kontekst statusu

Przy tworzeniu zadania operacyjnego (linie 196-206), zamiast wstawiac sam tytul, doda do pola `description` kontekst z formularza:
- Obecny etap lejka
- Podsumowanie statusu (co sie wydarzylo)
- Nastepne kroki
- Blokery (jesli sa)

Dzieki temu osoba przypisana do zadania widzi pelny kontekst bez koniecznosci szukania statusu.

Format opisu zadania:
```text
Etap: HOT | Kontakt: Jan Kowalski (Firma ABC)

Status tygodnia (09.02-15.02):
[tresc statusSummary]

Nastepne kroki:
[tresc nextSteps]

Blokery:
[tresc blockers]
```

## Szczegoly techniczne

| Plik | Zmiana |
|------|--------|
| `src/components/deals-team/WeeklyStatusForm.tsx` | (1) Dodanie badge etapu w DialogHeader z mapa kolorow/etykiet. (2) Budowanie `description` zadania z kontekstem formularza przy insercie do tabeli `tasks`. |

### Mapa etykiet etapow (do dodania w WeeklyStatusForm)

```text
categoryLabels = {
  hot: 'HOT', top: 'TOP', lead: 'LEAD', '10x': '10x',
  cold: 'COLD', lost: 'PRZEGRANE', client: 'KLIENT', offering: 'OFERTOWANIE'
}
```

### Budowanie opisu zadania

W `onSubmit`, w sekcji tworzenia zadania (linia 196), dodanie pola `description` budowanego dynamicznie z danych formularza:

```text
const taskDescription = [
  `Etap: ${categoryLabel} | Kontakt: ${contactName}${contactCompany ? ` (${contactCompany})` : ''}`,
  '',
  `Status (${weekLabel}):`,
  data.statusSummary,
  data.nextSteps ? `\nNastepne kroki:\n${data.nextSteps}` : '',
  data.blockers ? `\nBlokery:\n${data.blockers}` : '',
].filter(Boolean).join('\n');
```

Pole to zostanie przekazane w `insert({ ..., description: taskDescription })`.
