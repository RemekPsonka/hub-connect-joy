

## Plan: Korekta okresów czasowych na pasku polisy

### Wymagania
- **Strefa zagrożenia (czerwony)**: T-1 miesiąc (30 dni) - bez zmian
- **Strefa przygotowania (zielony)**: T-3 miesiące (90 dni) - bez zmian  
- **Nowa faza narastania**: Od T-4 miesięcy (120 dni) kolor zaczyna powoli narastać

### Wizualizacja

```
|████████████████████████████|░░░░░░░░░░|██████████████|███████|
 Aktywna polisa               T-4 do T-3  T-3 do T-1    T-1
 (niebieski)                  (narastający (przygotowanie (zagrożenie
                              zielony)      zielony pełny) czerwony)
```

---

## Zmiany w plikach

| Plik | Zmiany |
|------|--------|
| `src/components/renewal/PolicyBar.tsx` | Dodanie fazy narastania (T-4), zmiana gradientu |
| `src/components/renewal/TimelineLegend.tsx` | Aktualizacja etykiet legendy |

---

## Szczegóły techniczne

### 1. `PolicyBar.tsx` - Nowe stałe i logika

```typescript
// Stałe czasowe
const DANGER_ZONE_DAYS = 30;      // T-1 miesiąc (strefa zagrożenia)
const PREPARATION_DAYS = 90;       // T-3 miesiące (strefa przygotowania - pełny zielony)
const EARLY_WARNING_DAYS = 120;    // T-4 miesiące (początek narastania koloru)
```

**Nowa logika renderowania:**

1. **Faza wczesnego ostrzeżenia (T-4 do T-3)**: Gradient od przezroczystego do zielonego
2. **Strefa przygotowania (T-3 do T-1)**: Pełny zielony kolor
3. **Strefa zagrożenia (T-1 do końca)**: Czerwony

```typescript
// Early warning phase (T-4 to T-3) - gradient from transparent to green
const earlyWarningStart = new Date(policyEnd);
earlyWarningStart.setDate(earlyWarningStart.getDate() - EARLY_WARNING_DAYS);

// Preparation phase (T-3 to T-1) - solid green
const preparationStart = new Date(policyEnd);
preparationStart.setDate(preparationStart.getDate() - PREPARATION_DAYS);

// Danger zone (T-1 to end) - red
const dangerStart = new Date(policyEnd);
dangerStart.setDate(dangerStart.getDate() - DANGER_ZONE_DAYS);
```

**Wizualizacja warstw:**

```jsx
{/* 1. Faza narastania (T-4 do T-3) - gradient */}
{earlyWarningWidth > 0 && (
  <div style={{
    background: 'linear-gradient(to right, hsla(142, 76%, 36%, 0), hsla(142, 76%, 36%, 0.6))'
  }} />
)}

{/* 2. Strefa przygotowania (T-3 do T-1) - pełny zielony */}
{preparationWidth > 0 && (
  <div style={{
    backgroundColor: 'hsla(142, 76%, 36%, 0.6)'
  }} />
)}

{/* 3. Strefa zagrożenia (T-1) - czerwony */}
{dangerWidth > 0 && (
  <div style={{
    background: 'linear-gradient(...red...)'
  }} />
)}
```

---

### 2. `TimelineLegend.tsx` - Zaktualizowane etykiety

```typescript
const items = [
  { 
    label: 'Aktywna polisa', 
    color: darkMode ? 'bg-blue-400' : 'bg-blue-500' 
  },
  { 
    label: 'Faza narastania (T-4)', 
    gradient: darkMode 
      ? 'bg-gradient-to-r from-transparent to-green-400'
      : 'bg-gradient-to-r from-transparent to-green-600'
  },
  { 
    label: 'Przygotowanie (T-3)', 
    color: darkMode ? 'bg-green-400' : 'bg-green-600' 
  },
  { 
    label: 'Zagrożenie (T-1)', 
    gradient: darkMode 
      ? 'bg-gradient-to-r from-red-900 to-red-600'
      : 'bg-gradient-to-r from-red-100 to-red-500'
  },
];
```

---

## Podsumowanie

| Element | Okres | Kolor |
|---------|-------|-------|
| Narastanie | 120-90 dni (T-4 do T-3) | Gradient: przezroczysty → zielony |
| Przygotowanie | 90-30 dni (T-3 do T-1) | Pełny zielony |
| Zagrożenie | 30-0 dni (T-1 do końca) | Gradient czerwony |

