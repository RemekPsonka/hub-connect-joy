
## Plan: RD-A1 FE — Routing flag-gated dla Contact V2

### Stan obecny
- `ContactDetailV2`, `FeatureFlagGate` istnieją.
- W `App.tsx` jest już dodana osobna trasa `/contacts-v2/:id` (z poprzedniego sprintu, wariant 1). Trasa `/contacts/:id` nadal pokazuje stary `ContactDetail`.
- Flaga `contact_detail_v2` jest włączona dla Remka w `directors.feature_flags`.

### Zmiana
W `src/App.tsx`:
1. Dodać importy `ContactDetailV2` (już lazy-loaded) i `FeatureFlagGate`.
2. Owinąć element trasy `/contacts/:id` w `FeatureFlagGate flag="contact_detail_v2" fallback={<ContactDetail />}` z `<ContactDetailV2 />` jako children.
3. Usunąć (lub zostawić) drugą trasę `/contacts-v2/:id` — proponuję **zostawić** jako bezpośredni dostęp do V2 niezależny od flagi (przydatne do testów A/B). Bez ruszania.

### Uwaga: SSR FeatureFlagGate vs Suspense
`ContactDetailV2` jest lazy. `FeatureFlagGate` zwraca children gdy flaga `true`, fallback gdy `false`. Oba elementy są tworzone jako JSX upfront — lazy chunk dla V2 będzie pobierany tylko gdy faktycznie wyrenderowany (React lazy). Działa OK, bo `<Suspense>` jest na poziomie Routes w App. Bez dodatkowych zmian.

Pierwszy render dla usera bez wczytanej flagi (data === undefined) → `useFeatureFlag` zwraca `false` → fallback (ContactDetail V1) → po ms flaga się ładuje → re-render z V2. Krótki flash V1. **Akceptowalne** dla wewnętrznego narzędzia 1-2 userów. Jeśli chcesz uniknąć — trzeba by dodać loading state w gate, ale to nadkomplikacja na ten use case.

### Po zmianie
- `npm run build` (tsc + vite).
- Raport: liczba zmodyfikowanych plików (1: App.tsx), liczba błędów tsc, grepy na `ContactDetailV2` i `console.log` w plikach V2.
- Smoke test wymaga aktywnej sesji w przeglądarce — wykonam tylko build + grepy. Smoke test interakcyjny zostawiam Tobie (tool browser--act mogę użyć ale wymaga zalogowania jako Remek przez OAuth, czego nie zrobię).

### Pliki
- `src/App.tsx` (edycja: import + owinięcie 1 Route)

Bez DB, bez nowych plików.
