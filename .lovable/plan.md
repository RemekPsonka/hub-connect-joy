

# BLOK B-FIX.6 — TemperatureBadge tylko dla LEAD

## Problem
Po B-FIX.4 wszystkie 3 sub-badges (Temperature, Source, ClientStatus) renderują się na każdej karcie. To błąd domenowy:
- **Temperature (HOT/TOP/10x/COLD)** to etapy LEADA — nie dotyczą kontaktu w Ofertowaniu (tam mamy `offering_stage`: handshake → wygrana/przegrana) ani Klienta.
- **Source (CRM_PUSH/CC/AI_KRS/...)** to skąd przyszedł prospekt — sensowne tylko dla Prospekta (i ewentualnie Lead jako historia).
- **ClientStatus (standard/ambassador/...)** dotyczy tylko Klienta.

## Rozwiązanie
Każdy sub-badge widoczny tylko w „swojej" kolumnie. Mapowanie:

| Badge | Widoczny w `stage` |
|---|---|
| `TemperatureBadge` | `lead` |
| `SourceBadge` | `prospect` |
| `ClientStatusBadge` | `client` |
| `StageBadge` (offering) | `offering` (już działa) |

W kolumnie Ofertowanie pokazuje się tylko `StageBadge` z `offering_stage` — bez Temperature/Source/ClientStatus. Source pozostaje tylko w Prospekt (zgodnie z domeną — to atrybut źródła pozyskania).

## Pliki

| # | Plik | Akcja |
|---|---|---|
| 1 | `src/components/sgu/sales/UnifiedKanbanCard.tsx` | EDIT — warunkowy render każdego sub-badge per `stage` |

## Szczegóły zmiany

W `UnifiedKanbanCard.tsx` rząd badges (obecnie zawsze 3) zamienić na warunkowy render:

```tsx
<div className="flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
  {stage === 'lead' && (
    <TemperatureBadge
      value={contact.temperature}
      onChange={(v) => onSubcategoryChange('temperature', v)}
    />
  )}
  {stage === 'prospect' && (
    <SourceBadge
      value={contact.prospect_source}
      onChange={(v) => onSubcategoryChange('prospect_source', v)}
    />
  )}
  {stage === 'client' && (
    <ClientStatusBadge
      value={contact.client_status}
      onChange={(v) => onSubcategoryChange('client_status', v)}
    />
  )}
</div>
```

Dla `stage === 'offering'` wrapper pozostaje pusty (cały blok można dodatkowo opakować w `{(stage === 'lead' || stage === 'prospect' || stage === 'client') && ...}` żeby nie renderować pustego diva — drobna optymalizacja).

`StageBadge` dla offering — bez zmian (już warunkowy `stage === 'offering'`).

## Świadome decyzje

1. **Source tylko w Prospekt** — nie duplikujemy w Lead. Source jest atrybutem pozyskania; po awansie do Lead temperatura niesie informację, source nie jest już akcjonowalny.
2. **Brak fallback "(brak)" w innych kolumnach** — jeśli badge nie należy do kolumny, w ogóle go nie ma. User nie powinien móc ustawić temperatury klientowi.
3. **Dane w DB nie są usuwane** — `temperature`/`prospect_source`/`client_status` w `deal_team_contacts` zostają, po prostu nie renderujemy badge'a poza właściwą kolumną. Gdy kontakt wraca z Ofertowania do Leada, zachowuje swoją starą temperaturę.

## Weryfikacja

```bash
npx tsc --noEmit          # 0 errors
```

Manualne:
- Karta **Prospekt** → tylko `SourceBadge`.
- Karta **Lead** → tylko `TemperatureBadge` (HOT/TOP/10x/COLD).
- Karta **Ofertowanie** → tylko `StageBadge` z offering stage (handshake → wygrana/przegrana). Brak Temperature/Source/ClientStatus.
- Karta **Klient** → tylko `ClientStatusBadge`.
- Drag karty Lead → Ofertowanie: TemperatureBadge znika, pojawia się StageBadge.
- Drag z powrotem Ofertowanie → Lead: TemperatureBadge wraca z poprzednią wartością.

## DoD

| Check | Stan |
|---|---|
| Temperature widoczne tylko w kolumnie Lead | ✅ |
| Source widoczne tylko w kolumnie Prospekt | ✅ |
| ClientStatus widoczne tylko w kolumnie Klient | ✅ |
| Ofertowanie ma tylko StageBadge | ✅ |
| Drag między kolumnami przełącza badges poprawnie | ✅ |
| `tsc --noEmit` 0 błędów | ✅ |

