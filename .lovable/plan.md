
## Plan: Wdrożenie Google OAuth, Polityki Silnych Haseł i Audyt Bezpieczeństwa

### Podsumowanie

Ten plan obejmuje trzy główne obszary:
1. **Uruchomienie logowania Google** (wymaga konfiguracji w Cloud Dashboard)
2. **Polityka silnych haseł** z wymuszeniem zmiany co 30 dni
3. **Audyt bezpieczeństwa** i naprawa wykrytych podatności

---

## 1. Logowanie Google

### Obecny stan
Kod logowania Google już istnieje w aplikacji (`signInWithGoogle` w `AuthContext.tsx`), ale używa starej metody `supabase.auth.signInWithOAuth()`. Dla Lovable Cloud należy użyć zarządzanego Google OAuth.

### Wymagane kroki

#### 1.1 Konfiguracja w Cloud Dashboard
Lovable Cloud automatycznie zarządza Google OAuth - nie potrzebujesz własnych kluczy API. Wystarczy włączyć Google jako metodę logowania:

<lov-actions>
<lov-open-backend>Otwórz Cloud Dashboard</lov-open-backend>
</lov-actions>

W Cloud Dashboard:
- Przejdź do **Users** → **Authentication Settings**
- Włącz **Google** jako metodę logowania
- (Opcjonalnie) Dodaj własne OAuth credentials dla brandingu

#### 1.2 Aktualizacja kodu autoryzacji

| Plik | Zmiana |
|------|--------|
| Nowy: `src/integrations/lovable/index.ts` | Zostanie wygenerowany automatycznie przez narzędzie konfiguracji |
| `src/contexts/AuthContext.tsx` | Zmiana `supabase.auth.signInWithOAuth()` na `lovable.auth.signInWithOAuth()` |
| `src/pages/Login.tsx` | Bez zmian w UI (przycisk już istnieje) |
| `src/pages/Signup.tsx` | Bez zmian w UI (przycisk już istnieje) |

---

## 2. Polityka Silnych Haseł z Wymuszeniem Zmiany co 30 Dni

### 2.1 Nowa tabela: `user_password_policies`

```sql
CREATE TABLE public.user_password_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  password_expiry_days INTEGER NOT NULL DEFAULT 30,
  is_google_user BOOLEAN DEFAULT false,
  force_password_change BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_password_policy UNIQUE (user_id)
);

-- RLS
ALTER TABLE public.user_password_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own policy"
  ON public.user_password_policies
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own policy"
  ON public.user_password_policies
  FOR UPDATE
  USING (auth.uid() = user_id);
```

### 2.2 Walidacja silnych haseł (frontend)

Aktualizacja schematów Zod w `Signup.tsx` i `PasswordChangeForm.tsx`:

```typescript
const strongPasswordSchema = z.string()
  .min(12, 'Hasło musi mieć co najmniej 12 znaków')
  .regex(/[A-Z]/, 'Hasło musi zawierać co najmniej jedną wielką literę')
  .regex(/[a-z]/, 'Hasło musi zawierać co najmniej jedną małą literę')
  .regex(/[0-9]/, 'Hasło musi zawierać co najmniej jedną cyfrę')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Hasło musi zawierać co najmniej jeden znak specjalny');
```

### 2.3 Komponent wymuszenia zmiany hasła

Nowy plik: `src/components/auth/ForcePasswordChange.tsx`
- Modal wyświetlany po zalogowaniu gdy hasło wygasło
- Blokuje dostęp do aplikacji dopóki hasło nie zostanie zmienione

### 2.4 Hook sprawdzający politykę hasła

Nowy plik: `src/hooks/usePasswordPolicy.ts`
- Sprawdza czy hasło wygasło (> 30 dni)
- Pomija użytkowników Google (identyfikowani po `app_metadata.provider`)
- Ustawia `force_password_change = true` gdy hasło wygasło

### 2.5 Modyfikacja AuthContext

- Dodanie sprawdzenia polityki hasła po zalogowaniu
- Wyświetlenie modala wymuszenia zmiany hasła

---

## 3. Audyt Bezpieczeństwa - Wykryte Problemy i Naprawy

### KRYTYCZNE (Error Level)

#### 3.1 Edge Function bez autoryzacji: `ai-chat-router`

**Problem:** Funkcja `ai-chat-router/index.ts` nie sprawdza autoryzacji - każdy może ją wywołać.

**Naprawa:**
```typescript
// Dodać na początku funkcji:
import { verifyAuth, isAuthError, unauthorizedResponse } from "../_shared/auth.ts";

const authResult = await verifyAuth(req, supabase);
if (isAuthError(authResult)) {
  return unauthorizedResponse(authResult, corsHeaders);
}
```

### OSTRZEŻENIA (Warning Level)

#### 3.2 Wyłączona ochrona przed wyciekami haseł

**Problem:** Supabase wykrywa wycieki haseł (Have I Been Pwned), ale ta funkcja jest wyłączona.

**Naprawa:** Włączyć w Cloud Dashboard:
- Users → Authentication Settings → Password Security
- Włączyć "Leaked Password Protection"

#### 3.3 Rozszerzenia w schemacie `public`

**Problem:** Rozszerzenia PostgreSQL (uuid-ossp, pg_trgm, etc.) są zainstalowane w schemacie `public` co może prowadzić do konfliktów.

**Naprawa:** To wymaga migracji rozszerzeń do dedykowanego schematu `extensions`. Jest to zmiana niskopriorytetowa i może być wykonana później.

#### 3.4 Tabela `search_synonyms` z publicznym dostępem

**Problem:** Synonimy wyszukiwania są dostępne publicznie i każdy dyrektor może je modyfikować.

**Naprawa:**
```sql
-- Usuń politykę publicznego odczytu
DROP POLICY IF EXISTS "Public read access" ON public.search_synonyms;

-- Dodaj politykę dla zalogowanych użytkowników
CREATE POLICY "Authenticated read access" ON public.search_synonyms
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Ogranicz zapis do superadminów
DROP POLICY IF EXISTS "Directors can manage synonyms" ON public.search_synonyms;
CREATE POLICY "Superadmins can manage synonyms" ON public.search_synonyms
  FOR ALL
  USING (is_superadmin());
```

#### 3.5 Funkcja `get_current_tenant_id` może zwrócić NULL

**Problem:** Gdy `get_current_tenant_id()` zwraca NULL dla niezalogowanego użytkownika, niektóre funkcje mogą wyciekać dane.

**Naprawa:** Dodać explicit check w funkcjach SECURITY DEFINER:
```sql
IF auth.uid() IS NULL THEN
  RETURN NULL; -- lub RAISE EXCEPTION
END IF;
```

---

## 4. Podsumowanie Plików do Modyfikacji

| Plik | Typ | Opis |
|------|-----|------|
| **Baza danych** |
| Migracja SQL | NOWY | Tabela `user_password_policies` |
| Migracja SQL | NOWY | Naprawa RLS dla `search_synonyms` |
| **Frontend** |
| `src/integrations/lovable/index.ts` | NOWY | Wygenerowany przez narzędzie |
| `src/contexts/AuthContext.tsx` | Modyfikacja | Użycie `lovable.auth.signInWithOAuth()`, sprawdzenie polityki hasła |
| `src/pages/Signup.tsx` | Modyfikacja | Silniejsza walidacja hasła |
| `src/components/settings/PasswordChangeForm.tsx` | Modyfikacja | Silniejsza walidacja hasła, aktualizacja `password_changed_at` |
| `src/hooks/usePasswordPolicy.ts` | NOWY | Hook sprawdzający wygaśnięcie hasła |
| `src/components/auth/ForcePasswordChange.tsx` | NOWY | Modal wymuszenia zmiany hasła |
| **Edge Functions** |
| `supabase/functions/ai-chat-router/index.ts` | Modyfikacja | Dodanie autoryzacji |

---

## 5. Lista Kontrolna przed Publikacją

Po wdrożeniu zmian wykonaj następujące sprawdzenia:

- [ ] Google OAuth działa poprawnie (zaloguj się przez Google)
- [ ] Rejestracja wymaga silnego hasła (12+ znaków, wielkie/małe litery, cyfry, znaki specjalne)
- [ ] Użytkownicy Google nie są proszeni o zmianę hasła
- [ ] Użytkownicy z hasłem starszym niż 30 dni widzą wymuszenie zmiany
- [ ] Edge function `ai-chat-router` odrzuca niezautoryzowane żądania
- [ ] Leaked Password Protection jest włączona w Cloud Dashboard
- [ ] Tabela `search_synonyms` nie jest publicznie dostępna

---

## 6. Dodatkowe Rekomendacje (Opcjonalne)

1. **Włącz MFA jako obowiązkowe** dla kont administratorów
2. **Rate limiting** na endpoint logowania (już częściowo obecny)
3. **Logowanie audytu** zmian haseł i logowań
4. **Automatyczne wylogowanie** po 30 minutach nieaktywności
5. **CAPTCHA** przy rejestracji (zapobieganie botom)
