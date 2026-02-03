

# Plan: Etap 1.6 — Blokada publicznej rejestracji

## Cel

Uniemożliwić rejestrację publiczną (każdy może się zarejestrować) i pozostawić kontrolowany przepływ tworzenia użytkowników wyłącznie przez administratorów (Owner/Superadmin) za pomocą Edge Functions.

---

## Zakres zmian

### 1. Usunięcie strony rejestracji

| Plik | Zmiana |
|------|--------|
| `src/pages/Signup.tsx` | Usunięcie pliku |
| `src/App.tsx` | Usunięcie routy `/signup` i importu |

### 2. Usunięcie linków do rejestracji

| Plik | Zmiana |
|------|--------|
| `src/pages/Login.tsx` | Usunięcie sekcji "Nie masz konta? Zarejestruj się" (linie 205-210) |

### 3. Kontrolowany przepływ pozostaje bez zmian

Istniejące Edge Functions pozostaną aktywne:

```text
┌─────────────────────────────────────────────────────────────────┐
│                  Kontrolowane tworzenie użytkowników            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Superadmin → create-new-tenant → Tworzy nowego tenanta         │
│      ↓                              + pierwszego Ownera         │
│                                                                 │
│  Owner → create-tenant-user → Tworzy dyrektorów/użytkowników    │
│      ↓                                                          │
│                                                                 │
│  Dyrektor → create-assistant → Tworzy asystentów                │
│         → create-representative → Tworzy przedstawicieli        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Szczegóły techniczne

### Plik `src/App.tsx` - przed:
```typescript
import Signup from "./pages/Signup";
// ...
<Route path="/signup" element={<Signup />} />
```

### Plik `src/App.tsx` - po:
```typescript
// Usunięty import Signup
// Usunięta routa /signup
```

### Plik `src/pages/Login.tsx` - przed:
```tsx
<p className="text-sm text-muted-foreground text-center">
  Nie masz konta?{' '}
  <Link to="/signup" className="text-primary hover:underline font-medium">
    Zarejestruj się
  </Link>
</p>
```

### Plik `src/pages/Login.tsx` - po:
```tsx
<p className="text-sm text-muted-foreground text-center">
  Aby uzyskać konto, skontaktuj się z administratorem.
</p>
```

---

## Podsumowanie zmian

| Element | Akcja |
|---------|-------|
| `src/pages/Signup.tsx` | Usunięcie |
| `src/App.tsx` | Usunięcie importu i routy |
| `src/pages/Login.tsx` | Zmiana tekstu na informację kontaktową |
| AuthContext.signUp | Pozostaje (używane przez Edge Functions) |

---

## Bezpieczeństwo

- Publiczny endpoint `/signup` zostanie całkowicie usunięty
- Metoda `signUp` w `AuthContext` pozostaje, ponieważ jest używana wewnętrznie przez Edge Functions z `SERVICE_ROLE_KEY`
- Nowi użytkownicy mogą być tworzeni tylko przez autoryzowanych administratorów

---

## Ryzyko

**Niskie** — zmiana dotyczy tylko frontendu i nie wpływa na istniejące mechanizmy tworzenia użytkowników przez Edge Functions.

