

## Plan: Modyfikacja pola "Status relacji" w formularzu BI

### Podsumowanie zmian
1. **Dodanie opcji** do pola "Status relacji": `Znajomy` i `Klient`
2. **Usunięcie** pola "Typ kontaktu" z formularza

---

## Szczegóły implementacji

### Plik 1: `src/components/bi/types.ts`

**Zmiana w interface `SectionABasic`:**

| Przed | Po |
|-------|-----|
| `status_relacji?: 'nowy' \| 'polecony' \| 'powracajacy'` | `status_relacji?: 'nowy' \| 'polecony' \| 'powracajacy' \| 'znajomy' \| 'klient'` |
| `typ_kontaktu?: 'znajomy' \| 'klient'` | **USUNIĘTE** |

---

### Plik 2: `src/components/bi/sections/SectionABasic.tsx`

**Zmiana 1: Aktualizacja opcji w polu "Status relacji" (linie 210-214)**

```text
Obecne opcje:
- Nowy kontakt
- Polecony
- Powracający

Nowe opcje:
- Nowy kontakt
- Polecony
- Powracający
- Znajomy      ← NOWA
- Klient       ← NOWA
```

**Zmiana 2: Usunięcie całego bloku pola "Typ kontaktu" (linie 218-233)**

Usunięty kod:
```typescript
{/* Typ kontaktu - NOWE */}
<div className="space-y-2">
  <Label>Typ kontaktu</Label>
  <Select ...>
    ...
  </Select>
</div>
```

**Zmiana 3: Aktualizacja grid layout**
- Było: `grid-cols-1 md:grid-cols-3` (3 kolumny)
- Będzie: `grid-cols-1 md:grid-cols-2` (2 kolumny, bo jest o jedno pole mniej)

---

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `src/components/bi/types.ts` | Rozszerzenie typu `status_relacji`, usunięcie `typ_kontaktu` |
| `src/components/bi/sections/SectionABasic.tsx` | Dodanie opcji do select, usunięcie pola "Typ kontaktu", zmiana layoutu na 2 kolumny |

---

## Wizualizacja po zmianach

```text
Kontekst spotkania
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│ Status relacji *                │  │ Czy rozważa aplikację do CC?   │
│ [▼ Wybierz status            ]  │  │ [▼ Wybierz                   ] │
│   • Nowy kontakt                │  │   • Tak                        │
│   • Polecony                    │  │   • Nie                        │
│   • Powracający                 │  │   • Nie wiem                   │
│   • Znajomy         ← NOWA      │  └─────────────────────────────────┘
│   • Klient          ← NOWA      │
└─────────────────────────────────┘
```

