

## Plan: Naprawa dodawania przedstawicieli/ambasadorów

### Problem
Dodawanie przedstawiciela/ambasadora nie działa z powodu:
1. Niezgodność nazw parametrów między hookiem a edge function (`full_name` vs `fullName`)
2. Błędne mapowanie odpowiedzi (`userData.user_id` vs `user.id`)
3. Brak dedykowanej edge function dla przedstawicieli (próbuje użyć `create-tenant-user` która tworzy dyrektorów)
4. Brak wyświetlania tymczasowego hasła po utworzeniu konta

---

## Rozwiązanie

### 1. Nowa edge function `create-representative`
Wzorowana na `create-assistant`, ale dedykowana dla przedstawicieli:

```text
supabase/functions/create-representative/index.ts

Funkcjonalność:
- Przyjmuje: email, fullName, roleType, tenantId, parentDirectorId
- Generuje tymczasowe hasło (10 znaków)
- Tworzy konto w auth.users
- Tworzy wpis w sales_representatives
- Zwraca: success, representative, tempPassword
```

### 2. Aktualizacja `useRepresentatives.ts`

```text
Zmiany:
- Wywołanie nowej edge function create-representative
- Usunięcie pola password z interfejsu CreateRepresentativeInput
- Zwracanie tempPassword z mutacji
```

### 3. Przebudowa `AddRepresentativeModal.tsx`

```text
Wzorowane na AddAssistantModal:
- Formularz bez pola hasła (generowane automatycznie)
- Po utworzeniu: wyświetlenie kartki z tymczasowym hasłem
- Przycisk kopiowania hasła
- Opcja wydruku kartki z danymi logowania
```

---

## Szczegóły techniczne

### A. Edge Function: `supabase/functions/create-representative/index.ts`

```typescript
// Struktura wzorowana na create-assistant
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // 1. Autoryzacja - sprawdzenie czy dyrektor/admin
  // 2. Walidacja danych wejściowych
  // 3. Generowanie hasła tymczasowego
  // 4. Utworzenie użytkownika w auth.users
  // 5. Utworzenie wpisu w sales_representatives
  // 6. Zwrot danych wraz z tempPassword
});

function generatePassword(): string {
  // Generowanie bezpiecznego hasła 10-znakowego
}
```

### B. Hook: `src/hooks/useRepresentatives.ts`

```typescript
// Przed:
export interface CreateRepresentativeInput {
  full_name: string;
  email: string;
  role_type: 'sales_rep' | 'ambassador';
  password: string;  // <- USUNĄĆ
}

// Po:
export interface CreateRepresentativeInput {
  full_name: string;
  email: string;
  role_type: 'sales_rep' | 'ambassador';
}

// Mutacja zwraca tempPassword
const result = await supabase.functions.invoke('create-representative', {
  body: {
    email: input.email,
    fullName: input.full_name,
    roleType: input.role_type,
    tenantId: director.tenant_id,
    parentDirectorId: director.id,
  }
});

return {
  representative: result.data.representative,
  tempPassword: result.data.tempPassword
};
```

### C. Modal: `src/components/representatives/AddRepresentativeModal.tsx`

```text
Stan po utworzeniu:
+---------------------------------------------------------------+
| ✅ Przedstawiciel został utworzony!                           |
+---------------------------------------------------------------+
|                                                               |
| Przekaż poniższe dane logowania przedstawicielowi:           |
|                                                               |
| 📧 Email: jan.kowalski@firma.pl                               |
| 🔑 Hasło tymczasowe:                                          |
|    ┌─────────────────────────────────────────┐               |
|    │ Xk7#mPq2@N                              │ [📋 Kopiuj]    |
|    └─────────────────────────────────────────┘               |
|                                                               |
| ⚠️  Przedstawiciel powinien zmienić hasło po pierwszym        |
|    logowaniu.                                                 |
|                                                               |
| [🖨️ Drukuj instrukcję]                 [Zamknij]              |
+---------------------------------------------------------------+
```

### D. Kartka do wydruku (opcjonalnie)

```text
Funkcja drukowania kartki z danymi:
- Logo/nazwa firmy
- Dane logowania (email, hasło)
- URL do logowania
- Instrukcja pierwszego logowania
- Przypomnienie o zmianie hasła
```

---

## Pliki do utworzenia/modyfikacji

| Plik | Akcja | Opis |
|------|-------|------|
| `supabase/functions/create-representative/index.ts` | Nowy | Edge function tworzenia przedstawiciela |
| `src/hooks/useRepresentatives.ts` | Modyfikacja | Nowe wywołanie edge function, usunięcie password |
| `src/components/representatives/AddRepresentativeModal.tsx` | Modyfikacja | Nowy UI z hasłem tymczasowym |

---

## Kolejność implementacji

1. **Faza 1**: Utworzenie edge function `create-representative`
2. **Faza 2**: Aktualizacja `useRepresentatives.ts` - wywołanie nowej funkcji
3. **Faza 3**: Przebudowa `AddRepresentativeModal.tsx` - nowy UI wzorowany na asystencie
4. **Faza 4**: Testowanie end-to-end

