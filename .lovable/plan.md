

# Etap 1: Naprawa polityk RLS -- INSERT z `WITH CHECK (true)`

## Zakres

Dwie zmiany w bazie danych (jedna migracja SQL) oraz jedna drobna zmiana w kodzie frontend.

---

## Zmiana 1a: Tabela `error_logs` -- ograniczenie INSERT

**Obecny stan**: Polityka `"Anyone can insert error logs"` z `WITH CHECK (true)` -- kazdy moze wstawiac logi bez autentykacji.

**Nowa polityka**:

```text
DROP POLICY "Anyone can insert error logs" ON public.error_logs;
CREATE POLICY "Authenticated users insert own errors" ON public.error_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (user_id IS NULL OR user_id = auth.uid())
  );
```

**Wplyw na kod**: Komponent `ErrorBoundary.tsx` (linia 47-55) wstawia logi z `user_id: user?.id || null`. Po zmianie:
- Zalogowany uzytkownik -- INSERT przejdzie (auth.uid() = user.id)
- Niezalogowany uzytkownik -- INSERT zostanie zablokowany (auth.uid() IS NULL)

Aby uniknac cichego bledu w konsoli gdy uzytkownik nie jest zalogowany, dodamy warunek `if (user)` przed insertem w `ErrorBoundary.tsx` (linia 47). Bledy niezalogowanych uzytkownikow beda logowane tylko w konsoli przegladarki.

---

## Zmiana 1b: Tabela `user_password_policies` -- ograniczenie INSERT

**Obecny stan**: Polityka `"Service can insert password policy"` z `WITH CHECK (true)` -- kazdy moze wstawiac/modyfikowac polityki hasel dowolnego uzytkownika.

**Nowa polityka**:

```text
DROP POLICY "Service can insert password policy" ON public.user_password_policies;
CREATE POLICY "Users insert own password policy" ON public.user_password_policies
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**Wplyw na kod**: Hook `usePasswordPolicy.ts` (linia 58-63) wstawia rekord z `user_id: user.id` -- zawsze `auth.uid() = user_id`. Zmiana nie zlamie zadnej logiki. Komponenty `ForcePasswordChange.tsx` i `PasswordChangeForm.tsx` uzywaja tylko UPDATE (ktory juz ma poprawna polityke `auth.uid() = user_id`).

---

## Zmiana 1c: Zabezpieczenie `ErrorBoundary.tsx`

Dodac warunek `if (user)` przed insertem do `error_logs`, zeby uniknac bledu RLS w konsoli gdy uzytkownik nie jest zalogowany:

```text
// Przed:
await supabase.from('error_logs').insert({
  user_id: user?.id || null,
  ...
});

// Po:
if (user) {
  await supabase.from('error_logs').insert({
    user_id: user.id,
    tenant_id: tenantId,
    ...
  });
}
```

---

## Podsumowanie

| Zmiana | Typ | Ryzyko zlamania |
|---|---|---|
| 1a: error_logs INSERT policy | Migracja SQL | Niskie -- bledy niezalogowanych nie beda w bazie (tylko konsola) |
| 1b: user_password_policies INSERT policy | Migracja SQL | Zerowe -- kod juz ustawia user_id = auth.uid() |
| 1c: ErrorBoundary warunek if(user) | Kod frontend | Zerowe -- zapobiega bledowi RLS w konsoli |

