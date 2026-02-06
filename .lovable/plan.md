
# Naprawa problemu z dodawaniem użytkownika

## Problem
Edge function `create-tenant-user` nie była wdrożona (błąd 404). Dodatkowo schemat walidacji Zod akceptuje tylko role `director` i `assistant`, podczas gdy frontend pozwala wybrać `admin`.

## Co zostało już naprawione
- Wdrożyłem edge function `create-tenant-user`

## Co jeszcze trzeba naprawić
Edge function musi akceptować również rolę `admin` w walidacji Zod:

```typescript
// Obecna walidacja (linia 9 w create-tenant-user/index.ts):
role: z.enum(["director", "assistant"], ...)

// Potrzebna walidacja:
role: z.enum(["director", "assistant", "admin"], ...)
```

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `supabase/functions/create-tenant-user/index.ts` | Rozszerzenie enum o `admin` |

## Szczegóły zmiany

W linii 9-11:
```typescript
role: z.enum(["director", "assistant", "admin"], { 
  errorMap: () => ({ message: "Rola musi byc director, assistant lub admin" }) 
}),
```

Po tej zmianie będzie można dodawać użytkowników z dowolną z trzech ról.
