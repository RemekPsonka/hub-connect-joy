Ustaliłem w preview na Papierniku:

- Papiernik jest w Sprzedaży jako kontakt SGU z `offering_stage = meeting_plan`, ale nie ma żadnego aktywnego zadania w `tasks`.
- Dlatego `/sgu/zadania?member=all` pokazuje 0 wyników po wyszukaniu Papiernika — ekran zadań czyta tylko tabelę zadań, nie kontakty bez zadań.
- Poprzednia poprawka działa tylko dla wierszy zadań, które już mają `deal_team_contact_id` i badge etapu. U Papiernika nie ma wiersza zadania, więc nie ma w co kliknąć.
- W panelu Papiernika przycisk „Umów spotkanie” otwiera dialog, ale dopiero po zapisie tworzy zadanie. To nie spełnia oczekiwania: po oznaczeniu/kliknięciu „Umawiamy spotkanie” kontakt ma być widoczny w Zadaniach.

Plan naprawy:

1. Naprawić tworzenie zadania dla akcji „Umów spotkanie”
   - W `ContactActionButtons.tsx` dla akcji `schedule_meeting` zapisywać kontakt z `offeringStage: 'meeting_plan'` oraz utworzyć zadanie `Umówić spotkanie z {kontakt}` z wybranym terminem.
   - Obecnie logika aktualizacji etapu dla tego flow jest niespójna i nie zawsze ustawia właściwy etap.

2. Dodać auto-backfill dla kontaktów w etapie „Umawiamy spotkanie” bez zadania
   - W widoku `/sgu/zadania` rozszerzyć `useMyTeamAssignments` albo dodać pomocniczy query, który wykrywa kontakty SGU w `meeting_plan` bez otwartego zadania.
   - Dla takich kontaktów pokazać je jako pozycje do działania albo automatycznie utworzyć brakujące zadanie po kliknięciu/akcji.
   - Dla Papiernika efekt ma być prosty: po wejściu w Zadania i wyszukaniu „Papiernik” ma być widoczny wiersz „Umówić spotkanie z Przemysław Papiernik”.

3. Poprawić kliknięcie w Zadaniach
   - Dla zadania z `contact_offering_stage = meeting_plan` kliknięcie badge/etapu „Umawiamy spotkanie” ma otwierać `MeetingScheduledDialog`.
   - Dodać fallback: jeśli użytkownik kliknie cały wiersz zadania typu `Umówić spotkanie` i kontakt jest w `meeting_plan`, również można otworzyć okno spotkania zamiast tylko panelu szczegółów.

4. Po potwierdzeniu spotkania
   - `MeetingScheduledDialog` zapisuje datę spotkania, przesuwa etap na `decision_meeting`/„Spotkanie decyzyjne” zgodnie z obecnym flow i tworzy follow-up task „Spotkanie z ...”.
   - Oryginalne zadanie „Umówić spotkanie...” powinno zostać oznaczone jako zakończone albo usunięte z aktywnych, żeby nie zostało jako zaległe.

5. Test preview na Papierniku
   - Wejść w Sprzedaż → Papiernik → Umów spotkanie → zapisać datę.
   - Wejść w `/sgu/zadania?member=all`, wyszukać „Papiernik”.
   - Potwierdzić, że zadanie/spotkanie jest widoczne, a kliknięcie otwiera właściwe okno.
   - Sprawdzić console/network pod kątem błędów.

Pliki do zmiany:
- `src/components/deals-team/ContactActionButtons.tsx`
- `src/components/deals-team/MyTeamTasksView.tsx`
- `src/hooks/useDealsTeamAssignments.ts`
- ewentualnie `src/components/deals-team/MeetingScheduledDialog.tsx`, jeśli trzeba domykać oryginalne zadanie po zapisie.