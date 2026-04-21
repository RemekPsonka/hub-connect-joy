

# Sub-etapy w „Przekaż do lejka"

## Cel
Po wyborze etapu głównego (Prospekt / Lead / Ofertowanie / Klient) dialog ma pokazać dodatkowy select z **konkretnym sub-etapem**, żeby kontakt od razu trafił we właściwą kolumnę kanbanu, bez ręcznego ustawiania po pushu.

## Mapowanie etap → sub-etap

| Stage | Pole DB | Opcje (z istniejących stałych w `dealTeam.ts`) | Default |
|---|---|---|---|
| `prospect` | `prospect_source` | `crm_push`, `cc_meeting`, `ai_krs`, `ai_web`, `csv`, `manual` | `crm_push` |
| `lead` | `temperature` | `hot`, `top`, `cold`, `10x` | `cold` |
| `offering` | `offering_stage` | 8 wartości z `OFFERING_STAGE_ORDER` (`decision_meeting` … `won`/`lost`) | `decision_meeting` |
| `client` | `client_status` | `standard`, `ambassador` (bez `lost` — to robi się przez markowanie) | `standard` |

Etykiety: bezpośrednio z `TEMPERATURE_LABELS`, `PROSPECT_SOURCE_LABELS`, `OFFERING_STAGE_LABELS`, `CLIENT_STATUS_LABELS` (bez duplikowania stringów).

## Zmiany

### 1. `src/components/sgu/PushToSGUDialog.tsx`
- Rozszerzam Zod schema o `substage: z.string().optional()`.
- Default formularza dla `substage` = `cold` (bo default `stage` = `lead`).
- Po zmianie `stage` reset `substage` do defaulta dla nowego etapu (efekt na `watch('stage')`).
- Nowy `<Select>` „Pod-etap" pod selectem etapu — opcje dynamicznie z helpera `optionsForStage(stage)` zwracającego `{value, label}[]`.
- Etykieta selecta zmienia się: „Temperatura" / „Źródło" / „Etap ofertowania" / „Status klienta".
- W `onSubmit`: dokładam `substage: values.substage` do body edge functiona.
- `client` + `expected_annual_premium_pln`: zostaje wymagane (tak jak `lead`/`offering`). Tylko `prospect` ukrywa pole.

### 2. `supabase/functions/sgu-push-contact/index.ts`
- Dorzucam `substage?: string` do `PushBody`.
- Whitelist per stage (te same wartości co w UI). Jeśli `substage` nie pasuje → ignorowany (cicho), nie 400 — backward compat.
- Mapowanie do INSERT-u w `deal_team_contacts`:
  - `prospect` → `prospect_source: substage`
  - `lead` → `temperature: substage`
  - `offering` → `offering_stage: substage`
  - `client` → `client_status: substage`
- Nadpisuje dotychczasowy hardcode `prospect_source: 'crm_push'` (dla prospect bierze z `substage`, dla pozostałych zostaje `'crm_push'` jako znacznik pochodzenia, ale w dodatkowym polu — albo ustawiamy `prospect_source` tylko dla `stage === 'prospect'` i zostawiamy NULL dla pozostałych; po sprawdzeniu obecnego kodu robię to drugie, bo `prospect_source` semantycznie należy do prospect).

  **Decyzja:** dla `stage !== 'prospect'` — `prospect_source` NULL (czystsze, zgodne z modelem IA). Dla `stage === 'prospect'` — z `substage` (default `crm_push`).

- Idempotencja zostaje bez zmian (`team_id` + `source_contact_id`). Jeśli rekord już istnieje, sub-etap NIE jest aktualizowany (zwracamy istniejący — tak jak dziś).

### 3. (opcjonalnie, jeśli starczy w 1 etapie) drobne UX
- Pod-etap pokazuje się jako drugi select w gridzie 1-kolumnowym, z labelką dynamiczną.
- Komunikat sukcesu wzbogacam: „Kontakt przekazany jako Lead · 🔥 HOT" (label z mapy).

## Pliki

| # | Plik | Akcja |
|---|---|---|
| 1 | `src/components/sgu/PushToSGUDialog.tsx` | EDIT — substage select + reset on stage change + body |
| 2 | `supabase/functions/sgu-push-contact/index.ts` | EDIT — body schema + walidacja + mapowanie do 4 pól |

Bez nowych hooków, bez migracji — kolumny `temperature` / `prospect_source` / `offering_stage` / `client_status` już istnieją w `deal_team_contacts`.

## Poza zakresem
- Edycja sub-etapu, gdy kontakt już jest w lejku (idempotentnie zwracamy istniejący).
- Bulk push z sub-etapem.
- UI do oznaczania `lost` przy pushu (do tego służy późniejszy „Won/Lost" flow w kanbanie).

## DoD

| Check | Stan |
|---|---|
| Po wyborze `Lead` widać select „Temperatura" z 4 opcjami (default `cold`) | ⬜ |
| Po wyborze `Prospekt` widać select „Źródło" (default `crm_push`) | ⬜ |
| Po wyborze `Ofertowanie` widać select „Etap ofertowania" z 8 opcjami | ⬜ |
| Po wyborze `Klient` widać select „Status klienta" (standard/ambassador) | ⬜ |
| Zmiana etapu resetuje sub-etap do defaulta nowego etapu | ⬜ |
| Edge function zapisuje sub-etap w odpowiedniej kolumnie DB | ⬜ |
| Push do `Lead/HOT` → kontakt pojawia się w kolumnie HOT na kanbanie | ⬜ |
| `npx tsc --noEmit` exit 0 | ⬜ |

