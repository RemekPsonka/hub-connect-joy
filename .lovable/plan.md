
## Plan: Przycisk „Przejdź do SGU" w sidebarze CRM

### Co dodać
W `src/components/layout/AppSidebar.tsx` (sidebar CRM) — nowa sekcja na samym dole `SidebarFooter`, NAD blokiem Admin, widoczna dla użytkowników z dostępem do SGU.

### Logika widoczności
Pokaż przycisk gdy spełniony jest dowolny z warunków:
- `isAdmin` (owner) — z `useOwnerPanel`
- `isSuperadmin` — z `useSuperadmin`
- `isPartner` (sgu_partner) — z `useSGUAccess` (już istnieje hook)
- `isRep` (sgu_representative) — z `useSGUAccess`

Dodatkowy warunek: `enabled` z `useSGUTeamId` (czyli tenant ma w ogóle skonfigurowany zespół SGU). Bez tego przycisk byłby martwy (guard i tak by przekierował).

Asystentki (`isAssistant`) — NIE pokazujemy (zgodnie z istniejącym wzorcem w sidebarze, asystentka ma okrojony nav).

### Wygląd
- Osobna sekcja w `SidebarFooter`, nad „Admin" i nad blokiem user info.
- Border-top jako separator wizualny od reszty.
- Przycisk pełnej szerokości w stylu primary/accent (gradient lub `bg-primary/20` jak ikona logo) — wyróżniony, bo to „przeskok kontekstu", nie zwykły link nawigacyjny.
- Ikona `Network` (już importowana) lub `ArrowRightLeft` (nowy import z lucide).
- Tekst „Przejdź do SGU" + mała etykieta podtekstowa „Drugi rynek" (opcjonalnie).
- W trybie `isCollapsed` — tylko ikona z tooltipem „Przejdź do SGU".
- Target route: `/sgu/dashboard` (dla partner/admin) lub `/sgu/tasks` (dla rep). Logika prosta: jeśli `isRep && !isPartner && !isAdmin && !isSuperadmin` → `/sgu/tasks`, w przeciwnym razie `/sgu/dashboard`.

### Symetria
Analogicznie sprawdzić czy w `SGUSidebar.tsx` istnieje przycisk powrotu „Wróć do CRM" — jeśli nie, dodać go w identycznym stylu (target `/`). Według reconu z poprzednich sprintów istnieje `LayoutModeToggle` w nagłówku SGU, ale dla spójności UX warto mieć też w sidebarze.

### Pliki
**Modyfikowane (1, ewentualnie 2):**
- `src/components/layout/AppSidebar.tsx` — sekcja „Przejdź do SGU" w `SidebarFooter` (nad blokiem Admin, ~10-15 linii JSX + import hooków `useSGUAccess`, `useSGUTeamId` + ikony).
- `src/components/layout/SGUSidebar.tsx` — *opcjonalnie* analogiczny przycisk „Wróć do CRM" jeśli go nie ma (zweryfikuję w trakcie implementacji jednym viewem; jeśli jest — pomijam).

### Smoke test
1. Login jako Remek (admin + dostęp SGU) → sidebar CRM pokazuje przycisk „Przejdź do SGU" w stopce → klik → ląduję na `/sgu/dashboard`.
2. Login jako asystentka → przycisk niewidoczny.
3. Tryb collapsed sidebar → tylko ikona z tooltipem.
4. (Jeśli dotyczy) W SGU Sidebar przycisk „Wróć do CRM" → klik → ląduję na `/`.

### Ryzyka
- **`enabled` z `useSGUTeamId`**: jeśli tenant nie ma SGU teamu, przycisk się nie pokaże — to pożądane zachowanie (nie pokazuj martwego linka).
- **Layout `SidebarFooter`**: trzeba upewnić się że nowy blok nie psuje rozmieszczenia user info ani Admin items. Wstawiam przed `adminItems` z dolnym borderem.
- **Brak duplikacji z `LayoutModeToggle`**: toggle w nagłówku zostaje (działa też w SGU → CRM). Nowy przycisk w sidebarze to drugi punkt wejścia, nie zastąpienie.
