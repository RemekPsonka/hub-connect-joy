

# Plan naprawy bezpieczenstwa -- wszystkie etapy

## Etap 1: Naprawy krytyczne

### 1.1 Autoryzacja w `background-sync-runner`

**Plik:** `supabase/functions/background-sync-runner/index.ts`

Dodanie bloku autoryzacji po linii 24 (po utworzeniu klienta supabase). Logika:
- Jesli token === service_role_key (self-invoke) -- przepusc
- Jesli nie -- zweryfikuj uzytkownika przez `getUser()` i sprawdz czy `tenant_id` z body pasuje do tenanta uzytkownika (tabela `directors`)
- Brak tokena lub niezgodnosc tenanta -> 401/403

### 1.2 Fix `delete-tenant` -- klient uzytkownika

**Plik:** `supabase/functions/delete-tenant/index.ts`

Linia 27: zamiana `supabaseServiceKey` na anon key przy tworzeniu klienta uzytkownika. Klient sluzy wylacznie do weryfikacji tokena uzytkownika -- nie powinien miec uprawnien service_role.

Zmiana:
```
// PRZED:
createClient(supabaseUrl, supabaseServiceKey, { global: { headers: { Authorization: authHeader } } })
// PO:
createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? supabaseServiceKey, { global: { headers: { Authorization: authHeader } } })
```

Uwaga: uzywamy fallback na `supabaseServiceKey` na wypadek gdyby `SUPABASE_ANON_KEY` nie byl dostepny w srodowisku.

### 1.3 XSS w QR Code -- `Enable2FAModal.tsx`

**Plik:** `src/components/settings/Enable2FAModal.tsx`

- Dodanie importu `DOMPurify` (linia 1)
- Sanityzacja `enrollmentData.qrCode` z profilem SVG na linii 117

---

## Etap 2: Naprawy wysokiego priorytetu

### 2.1 Funkcje DB bez `search_path`

Migracja SQL -- dwie funkcje:

```sql
CREATE OR REPLACE FUNCTION public.update_task_categories_updated_at()
RETURNS trigger LANGUAGE plpgsql
SET search_path TO 'public'
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.create_default_deal_stages()
RETURNS trigger LANGUAGE plpgsql
SET search_path TO 'public'
AS $$ ... (pelna tresc funkcji bez zmian logicznych) ... $$;
```

### 2.2 Walidacja Zod w `update-tenant-user`

**Plik:** `supabase/functions/update-tenant-user/index.ts`

Dodanie schematu Zod:
```typescript
import { z } from "zod";

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email().max(320).optional(),
  fullName: z.string().min(1).max(200).optional(),
  password: z.string().min(12).max(128).optional(),
});
```

Zamiana `await req.json()` na parsowanie przez Zod z obsluga bledow walidacji (400).

---

## Podsumowanie zmian

| # | Plik | Zmiana | Ryzyko regresji |
|---|---|---|---|
| 1.1 | background-sync-runner/index.ts | Auth check (service_role lub user+tenant) | Niskie -- self-invoke nadal dziala |
| 1.2 | delete-tenant/index.ts | Anon key zamiast service_role | Niskie -- tylko weryfikacja tokena |
| 1.3 | Enable2FAModal.tsx | DOMPurify na QR SVG | Zerowe |
| 2.1 | Migracja SQL | search_path w 2 funkcjach | Zerowe |
| 2.2 | update-tenant-user/index.ts | Zod walidacja body | Niskie -- dodaje walidacje |

