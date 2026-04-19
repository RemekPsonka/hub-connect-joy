

## Diagnoza

Edge function `sovra-confirm` dla `create_task` używa nieistniejących kolumn:
1. `created_by` → faktycznie `owner_id` (FK do `directors`)
2. `contact_id` → nie istnieje w `tasks`; powiązanie idzie przez junction `task_contacts (task_id, contact_id, role)`
3. `status: 'pending'` → tabela używa `'todo'` (jest enum-like, w produkcji widać tylko `todo|in_progress|completed`)

Ponadto w `create_contact` insert ma `notes` ale custom instructions sugerują że notatki idą do timeline — **nie ruszam tego w tym ficku**, naprawiam tylko create_task (zgłoszony bug). Reszta poza scope.

## Plan naprawy

**Plik:** `supabase/functions/sovra-confirm/index.ts` (linie 150-168, case `create_task`)

1. Walidacja: `args.contact_id` jest WYMAGANE (zgodnie z `mem://constraints/task-contact-linking` — każde zadanie musi mieć kontakt). Jeśli brak → `throw new Error('contact_id required')`.
2. INSERT do `tasks` z poprawnymi kolumnami:
   - `tenant_id: pa.tenant_id`
   - `owner_id: pa.actor_id` (zamiast `created_by`)
   - `title`, `description`, `due_date`, `priority` jak są
   - `status: 'todo'` (zamiast `'pending'`)
   - `task_type: 'standard'`, `visibility: 'private'`
   - bez `contact_id`
3. Po INSERT → INSERT do `task_contacts` `{task_id: data.id, contact_id: args.contact_id, role: 'primary'}`. Jeśli błąd → rollback przez DELETE z `tasks`.
4. Zwróć `{ task_id, title, contact_id }`.

## DoD
- [ ] „Stwórz zadanie" w Sovrze przez confirm dialog kończy się sukcesem.
- [ ] Wpis w `tasks` z `owner_id`+`tenant_id`, status `todo`.
- [ ] Wpis w `task_contacts` linkujący task do kontaktu.
- [ ] Toast sukcesu, brak blank screen.

## Ryzyko
- **R1**: jeśli args nie zawiera `contact_id` (Sovra mogła nie wymagać go w schemacie tool) → execError „contact_id required". Mitigacja: w osobnym ficku poprawić schema toola w `_shared/sovra-tools.ts` żeby `contact_id` było `required`. **W tym ficku** — tylko fix confirma + wymóg w args; jeśli LLM nie poda, user dostanie czytelny error zamiast 500.

