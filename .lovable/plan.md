

# useCompanyLogo -- cache localStorage + CompanyLogo komponent + integracja

## Podsumowanie

System cachowania logo firm w localStorage z Clearbit API. Obejmuje: utility do cache, hook useCompanyLogo, komponent CompanyLogo, batch preload, oraz integracje w 5 miejscach UI.

## Nowe pliki (3)

| Plik | Opis |
|------|------|
| `src/lib/logoCache.ts` | Utility: getCachedLogo, setCachedLogo, clearExpiredLogos, extractDomain, getLogoUrl |
| `src/hooks/useCompanyLogo.ts` | Hook useCompanyLogo + usePreloadLogos (w jednym pliku) |
| `src/components/ui/CompanyLogo.tsx` | Komponent z 3 stanami: logo / loading / inicjaly |

## Modyfikowane pliki (5)

| Plik | Zmiana |
|------|--------|
| `src/components/contacts/CompaniesTable.tsx` | Avatar -> CompanyLogo md, dodac usePreloadLogos |
| `src/components/contacts/ContactsTable.tsx` | Dodac CompanyLogo sm obok nazwy firmy |
| `src/components/companies/CompanyProfileHeader.tsx` | Avatar -> CompanyLogo lg (h-24 w-24) |
| `src/components/deals/DealCard.tsx` | Building2 icon -> CompanyLogo sm obok firmy |
| `src/hooks/useDeals.ts` | Rozszerzyc query: `company:companies(id, name, website)` |
| `src/components/layout/AppLayout.tsx` | Dodac clearExpiredLogos() w useEffect przy mount |

## Szczegoly techniczne

### 1. logoCache.ts

```text
LOGO_CACHE_PREFIX = 'logo_'
LOGO_CACHE_TTL = 7 dni

getCachedLogo(domain) -> string | null | undefined
  undefined = nie w cache, null = potwierdzony brak logo, string = URL

setCachedLogo(domain, url | null)
  try/catch -> przy pelnym storage wywoluje clearExpiredLogos()

clearExpiredLogos()
  Iteruje klucze z prefixem, usuwa expired i uszkodzone

extractDomain(url) -> string | null
  Obsluguje: "example.com", "https://example.com", "www.example.com"

getLogoUrl(domain, size=64) -> string
  Zwraca Clearbit URL
```

### 2. useCompanyLogo + usePreloadLogos

```text
useCompanyLogo(companyName, websiteOrDomain):
  1. extractDomain z websiteOrDomain
  2. Sprawdz cache -> jesli w cache, uzyj natychmiast
  3. Jesli nie -> new Image() probe
     onload -> setCachedLogo(domain, url)
     onerror -> setCachedLogo(domain, null)
  4. Zwraca { logoUrl, isLoading, initials }

usePreloadLogos(companies):
  - useEffect: batch preload max 20
  - Filtruje juz cached
  - new Image() fire-and-forget
```

### 3. CompanyLogo komponent

```text
Props: companyName, website?, logoUrl?, size ('sm'|'md'|'lg'), className?

Rozmiary: sm=w-6 h-6, md=w-8 h-8, lg=w-10 h-10

3 stany renderowania:
  1. logoUrl -> <img> z onError fallback
  2. isLoading -> animate-pulse placeholder
  3. Fallback -> inicjaly w kolorowym tle

Prop logoUrl (opcjonalny) -- jesli podany, uzywa bezposrednio
(dla CompanyProfileHeader gdzie company.logo_url ma priorytet)
```

### 4. CompaniesTable.tsx

```text
- Usunac import getCompanyLogoUrl (nie uzywany w tym pliku po zmianie)
- Dodac import CompanyLogo, usePreloadLogos
- Dodac usePreloadLogos(companies) na poczatku komponentu
- Linia 176: usunac const logoUrl = getCompanyLogoUrl(...)
- Linie 193-198: zamienic Avatar blok na:
  <CompanyLogo companyName={company.name} website={company.website} size="md" />
```

### 5. ContactsTable.tsx

```text
- Dodac import CompanyLogo
- Linia 304: zamienic tekst firmy na:
  <div className="... flex items-center gap-2">
    {contact.company && <CompanyLogo companyName={contact.company} size="sm" />}
    <span className="truncate">{contact.company || '-'}</span>
  </div>
```

Uwaga: Kontakty nie maja website w query -- CompanyLogo pokaze inicjaly (lepsze niz Building2 icon).

### 6. CompanyProfileHeader.tsx

```text
- Usunac import getCompanyLogoUrl z useCompanies
- Usunac linia 38: const logoUrl = ...
- Linie 67-80: zamienic Avatar h-24 na:
  <CompanyLogo 
    companyName={company.name}
    website={company.website}
    logoUrl={company.logo_url}
    size="lg"
    className="h-24 w-24 text-2xl"
  />
```

company.logo_url (z bazy) ma priorytet przez prop logoUrl.

### 7. DealCard.tsx

```text
- Dodac import CompanyLogo
- Linie 39-43: zamienic Building2 icon na:
  <CompanyLogo companyName={deal.company.name} website={deal.company.website} size="sm" />
  <span className="truncate">{deal.company.name}</span>
```

### 8. useDeals.ts

```text
- Linia 53: rozszerzyc interface:
  company?: { id: string; name: string; website?: string | null } | null;
- Linia 162: rozszerzyc query:
  company:companies(id, name, website),
```

### 9. AppLayout.tsx

```text
- Dodac import { useEffect } from 'react'
- Dodac import { clearExpiredLogos } from '@/lib/logoCache'
- Dodac wewnatrz AppLayout:
  useEffect(() => { clearExpiredLogos(); }, []);
```

## Czego NIE robimy

| Element | Powod |
|---------|-------|
| ContactDetailHeader logo | Firma wyswietlana z danymi rejestrowymi (NIP, KRS) -- zmiana layoutu poza scope |
| DealsTable logo | Tabela tekstowa -- zachowujemy prostote |
| Usuwanie getCompanyLogoUrl z useCompanies.ts | Moze byc uzywany w innych miejscach -- backward compatibility |
| Modyfikacja useContacts query | Kontakty nie maja JOIN do website firmy -- poza scope, inicjaly wystarczaja |

## Zabezpieczenia

- localStorage try/catch wszedzie (Safari private mode)
- Image probe przez new Image() (nie fetch -- CORS)
- Cache null dla firm bez logo (nie odpytuj ponownie)
- Max 20 preload na batch
- CompanyLogo nigdy nie crashuje -- najgorzej inicjaly
- img onError w komponencie -- dodatkowy fallback
- TTL 7 dni

