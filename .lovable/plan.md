
## Plan: Sprint RD-A1 FE — Contact Detail V2 (10 plików)

### Recon przed kodem
Sprawdzę:
1. Czy istnieje `useContact` hook (pkt 8 odwołuje się).
2. Tabela dla spotkań — `consultation_meetings` vs `gcal_events` vs `meetings`.
3. `useSGUTeamId` — czy jest.
4. `directors.user_id` vs `directors.auth_user_id` — pkt 1 używa `user_id`.
5. Czy `contact_groups` ma `color`.
6. `last_contact_date` w `contacts` — czy istnieje.
7. Format invoke edge function: `'sovra/contact-tldr'` (z slashem) vs `'sovra-contact-tldr'` (sprint poprzedni utworzył funkcje z myślnikiem). **To jest błąd w Twoim kodzie hooków** — w poprzednim sprincie utworzyliśmy `sovra-contact-tldr` i `sovra-contact-activity-timeline`, więc invoke musi używać myślnika.

### Korekty wobec instrukcji
- `useContactTldr.ts` i `useContactTimeline.ts` → invoke `'sovra-contact-tldr'` i `'sovra-contact-activity-timeline'` (myślnik), nie slash. Zgodnie z faktycznymi nazwami funkcji deployowanych w poprzednim sprincie.
- Routing dla `/contact-v2/:id` lub `/contacts/:id` → **nie tworzę nowej trasy** chyba że user prosi. Strona jest tworzona jako plik, ale do `App.tsx` dodam route tylko jeśli go znajdę i będzie miało sens (sprawdzę). Jeśli już istnieje `/contacts/:id` to użyję `FeatureFlagGate` żeby przełączać V1↔V2 — ale to wymagałoby instrukcji od usera. Bez instrukcji: **utworzę tylko plik strony**, route doda user osobno (lub w następnym sprincie).
- `ContactDetailV2.tsx` — kod w instrukcji ma w return uciętą strukturę JSX (HTML rozjazd w paste). Odbuduję sensowny grid: 2-kolumnowy layout (lewa: timeline, prawa: CRM card), header na górze, accordion na dole.

### Wykonanie po recon
1. `src/hooks/useFeatureFlag.ts` — z poprawką na faktyczną kolumnę (`user_id` lub inna).
2. `src/hooks/useContactTldr.ts` — invoke `sovra-contact-tldr`.
3. `src/hooks/useContactTimeline.ts` — invoke `sovra-contact-activity-timeline`.
4. `src/components/common/FeatureFlagGate.tsx` — bez zmian.
5. `src/components/contact-v2/ContactHeaderTLDR.tsx` — Avatar shadcn, H1, chip firmy, TL;DR z skeleton, dropdown akcji (Email disabled + tooltip), reuse `PushToSGUDialog`.
6. `src/components/contact-v2/ActivityComposer.tsx` — Tabs shadcn (Notatka active, Email disabled, Spotkanie basic). INSERT do `contact_notes` z `tenant_id` z `directors`. Spotkanie do tabeli wybranej po recon.
7. `src/components/contact-v2/ActivityTimeline.tsx` — composer + filtr pill bar + lista grupowana per dzień (`date-fns` lokalnie) + IntersectionObserver dla infinite scroll.
8. `src/components/contact-v2/ContactCRMCard.tsx` — query deal_team_contacts + tasks + group + owner. Reuse PushToSGUDialog. Placeholder dla "Wykonaj" (Next Action) — tylko UI.
9. `src/components/contact-v2/SectionsAccordion.tsx` — shadcn Accordion z 7 sekcjami stub.
10. `src/pages/ContactDetailV2.tsx` — query kontaktu, layout 2-kolumnowy z headerem i accordion.

### Po wszystkim
- Lista utworzonych plików.
- `tsc --noEmit` + liczba błędów.

### Bez zmian DB. Bez zmian routingu (chyba że recon pokaże że trzeba).
