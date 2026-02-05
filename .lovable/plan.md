

# Plan: Dodanie native lazy loading do obrazków

## Cel
Zoptymalizować ładowanie obrazków (avatary, logo firm) poprzez dodanie atrybutu `loading="lazy"` do wszystkich komponentów `<img>` i `<AvatarImage>`.

---

## Strategia: Globalna zmiana w komponencie Avatar

Zamiast modyfikować każdy plik osobno, zmienimy **komponent bazowy** `AvatarImage` w `src/components/ui/avatar.tsx`. Dzięki temu wszystkie 30 użyć automatycznie otrzymają lazy loading.

---

## Zmiana 1: Modyfikacja AvatarImage (najważniejsza)

**Plik:** `src/components/ui/avatar.tsx` (linie 18-24)

**PRZED:**
```tsx
const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn("aspect-square h-full w-full", className)} {...props} />
));
```

**PO:**
```tsx
const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> & { loading?: 'lazy' | 'eager' }
>(({ className, loading = 'lazy', ...props }, ref) => (
  <AvatarPrimitive.Image 
    ref={ref} 
    className={cn("aspect-square h-full w-full", className)} 
    loading={loading}
    {...props} 
  />
));
```

**Efekt:** Wszystkie AvatarImage w całej aplikacji automatycznie mają `loading="lazy"`.

---

## Zmiana 2: Obrazki <img> w AddOwnershipModal

**Plik:** `src/components/contacts/AddOwnershipModal.tsx`

Dwie lokalizacje:

| Linia | PRZED | PO |
|-------|-------|-----|
| 106 | `<img src={company.logo_url} alt="" className="h-6 w-6 rounded object-contain" />` | `<img src={company.logo_url} alt="" loading="lazy" className="h-6 w-6 rounded object-contain" />` |
| 129 | `<img src={selectedCompany.logo_url} alt="" className="h-8 w-8 rounded object-contain" />` | `<img src={selectedCompany.logo_url} alt="" loading="lazy" className="h-8 w-8 rounded object-contain" />` |

---

## Wyjątki (NIE modyfikujemy)

| Komponent | Powód |
|-----------|-------|
| `UserMenu.tsx` | Używa tylko AvatarFallback (bez obrazka) |
| Ikony lucide-react | To nie są elementy `<img>` |
| SVG ilustracje | Inline SVG, nie obrazki |

---

## Komponenty objęte zmianą (automatycznie przez Avatar)

Wszystkie te komponenty używają `AvatarImage` i otrzymają lazy loading automatycznie:

1. `CompanyModal.tsx` - logo firmy w formularzu
2. `PersonnelSection.tsx` - zdjęcia osób z zarządu
3. `CompanyKPIHeader.tsx` - logo firmy w nagłówku KPI
4. `CompanyHeaderCard.tsx` - logo firmy w karcie
5. `CompaniesTable.tsx` - logo firm na liście (virtualizowana)
6. `CompanyProfileHeader.tsx` - duże logo firmy na profilu

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/ui/avatar.tsx` | Dodać `loading="lazy"` jako domyślny props |
| `src/components/contacts/AddOwnershipModal.tsx` | Dodać `loading="lazy"` do 2 elementów `<img>` |

---

## Techniczne szczegóły

- `loading="lazy"` to natywny atrybut HTML5 obsługiwany przez wszystkie nowoczesne przeglądarki
- Radix UI `AvatarPrimitive.Image` renderuje standardowy element `<img>`, więc atrybut będzie przekazany
- Obrazki "above the fold" mogą być nadpisane przez `loading="eager"` gdy potrzebne

---

## Weryfikacja

Po wdrożeniu można sprawdzić w DevTools → Network:
1. Załadować stronę z listą kontaktów
2. Przewinąć w dół
3. Obserwować jak obrazki ładują się dopiero przy scrollowaniu

