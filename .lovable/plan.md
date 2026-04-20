
## Status: wszystko już zrobione w poprzednim sprincie

Poprzedni loop (RD-A1 FE) utworzył już wszystkie 10 plików z tej listy. Sprawdziłem aktualny stan w `<files>`:

| # | Plik | Stan |
|---|---|---|
| 1 | `src/hooks/useFeatureFlag.ts` | ✅ istnieje |
| 2 | `src/hooks/useContactTldr.ts` | ✅ istnieje, invoke `sovra-contact-tldr` (myślnik) |
| 3 | `src/hooks/useContactTimeline.ts` | ✅ istnieje, invoke `sovra-contact-activity-timeline` (myślnik) |
| 4 | `src/components/common/FeatureFlagGate.tsx` | ✅ istnieje |
| 5 | `src/components/contact-v2/ContactHeaderTLDR.tsx` | ✅ istnieje, z PushToSGUDialog |
| 6 | `src/components/contact-v2/ActivityComposer.tsx` | ✅ istnieje |
| 7 | `src/components/contact-v2/ActivityTimeline.tsx` | ✅ istnieje, infinite scroll + grupowanie |
| 8 | `src/components/contact-v2/ContactCRMCard.tsx` | ✅ istnieje |
| 9 | `src/components/contact-v2/SectionsAccordion.tsx` | ✅ istnieje, 7 sekcji |
| 10 | `src/pages/ContactDetailV2.tsx` | ✅ istnieje, layout 2-kol + accordion |

### Świadome odstępstwa od literalnej treści instrukcji (zachowane z poprzedniego sprintu)

1. **Edge function names** — instrukcja podaje `'sovra/contact-tldr'` i `'sovra/contact-activity-timeline'` (slash). Faktyczne deployowane funkcje to `sovra-contact-tldr` i `sovra-contact-activity-timeline` (myślnik), bo Supabase bierze nazwę funkcji z top-level folderu w `supabase/functions/`. Hooki używają poprawnych myślnikowych nazw — **literalne wykonanie zepsułoby invoke** (404).

### Co proponuję teraz

Skoro pliki istnieją i `tsc --noEmit` w poprzednim loopie zwrócił **0 błędów**, jedyna sensowna akcja to:

**A) Dodać route** dla `/contacts-v2/:id` (lub `/contacts/:id` przez `FeatureFlagGate`) w `src/App.tsx` — w przeciwnym razie strona jest nieosiągalna z UI. To było zaznaczone w poprzednim podsumowaniu jako pominięte.

**B) Re-run `tsc --noEmit`** żeby potwierdzić że nadal 0 błędów po wszystkich zmianach.

### Plan działania (jeśli zatwierdzisz)

1. Sprawdzę `src/App.tsx` — znajdę istniejącą trasę kontaktu (np. `/contacts/:id`).
2. Dodam nową trasę `/contacts-v2/:id` → `ContactDetailV2` (najprostsze, bez ruszania starego flow). **Lub** owinę istniejącą trasę w `FeatureFlagGate flag="contact_detail_v2"` z fallbackiem na obecny komponent — wtedy Remek (z włączoną flagą) widzi V2, reszta widzi V1. Domyślnie wybiorę wariant 1 (osobna trasa) bo bezpieczniejszy i nieinwazyjny — V1 zostaje nietknięty.
3. Uruchomię `tsc --noEmit` i wypiszę liczbę błędów + listę plików (które już istnieją, nic nowego nie tworzę poza ewentualną edycją App.tsx).

### Pytanie do Ciebie
Czy chcesz wariant 1 (osobna trasa `/contacts-v2/:id` — V1 dalej działa pod `/contacts/:id`), czy wariant 2 (FeatureFlagGate na istniejącej trasie — V2 widzi tylko Remek, reszta V1)? Jeśli nie odpowiesz, idę z wariantem 1.

### Pliki które ruszę
- `src/App.tsx` (edycja: nowa Route)

Bez zmian DB, bez zmian edge functions, bez nowych hooków/komponentów.
