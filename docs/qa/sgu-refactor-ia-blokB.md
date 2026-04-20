# SMOKE BLOK B — UnifiedKanban + SGUPipelineRoute

Data: <wypełnić przy wykonaniu>
Tester: <imię>

- [ ] /sgu/sprzedaz pokazuje 4 kolumny: Prospekt / Lead / Ofertowanie / Klient
- [ ] Karty mają badge temperature gdy istnieje
- [ ] Karty offering mają StageBadge z offering_stage
- [ ] Karty client_status='ambassador' mają gwiazdkę
- [ ] Drag prospect→lead aktualizuje DB (sprawdź w Supabase: category='lead')
- [ ] Drag lead→offering ustawia offering_stage='decision_meeting'
- [ ] Drag offering→client OTWIERA ConvertWonToClientDialog (NIE direct update)
- [ ] Klik "Lost" na karcie otwiera LostReasonDialog
- [ ] Klik karty Prospekci w SalesHeader → tylko kolumna Prospekt widoczna
- [ ] Klik karty Dziś → redirect na /sgu/zadania?filter=today
- [ ] Karty z is_lost=true są UKRYTE
- [ ] Karty z snoozed_until > now() są UKRYTE

## BLOK B-FIX
- [ ] Karta LEAD pokazuje badge HOT/TOP/COLD/10x w prawym górnym rogu
- [ ] Karta PROSPEKT pokazuje badge CRM PUSH / CC / AI KRS / etc.
- [ ] Karta KLIENT z client_status='ambassador' ma gwiazdkę "Ambasador"
- [ ] Karta z aktywnymi obszarami w client_complexity pokazuje chipy 🏠💰📞🏥
- [ ] Header kolumny pokazuje "Σ XXk PLN" gdy są karty z estimated_value
- [ ] Toggle "Grupuj wg sub-kategorii" rozwija accordion sub-sekcji w każdej kolumnie
- [ ] Counts w SalesHeader == Counts w kolumnach kanbana (np. Leady=Lead)
