

# Naprawa: firma nie przypisuje sie + brak mozliwosci recznego dodania

## Problem

Kontakt "Michal Matejka" ma pole tekstowe `company = "EMMA Market"` ale **nie ma `company_id`** (brak powiazanego rekordu w tabeli `companies`). Na zakladce FIRMA widac "Brak przypisanej firmy" z komunikatem pasywnym -- **bez zadnego przycisku akcji**.

Dwa bledy:

1. **CompanyView** -- gdy kontakt ma `contact.company` (tekst) ale nie ma domeny email, wyswietla tylko tekst "Firma X nie zostala powiazana" bez mozliwosci dzialania. Brakuje przycisku do utworzenia firmy z nazwy.

2. **Edge function `bi-fill-from-note`** -- gdy `company_id` jest null, pomija company updates (linia 545-548: "No company_id, skipping"). Nie tworzy nowej firmy, wiec Perplexity moze znalezc NIP/www ale nie ma gdzie tego zapisac.

## Rozwiazanie

### 1. CompanyView -- przycisk "Utworz firme z nazwy"

Dodanie trzeciego wariantu w bloku `if (!company)`: gdy `contact.company` istnieje ale nie ma `emailDomain`, pokazac przycisk tworzenia firmy z nazwy tekstowej (nie z domeny).

Logika przycisku:
- Tworzy rekord w `companies` z `name = contact.company`
- Przypisuje `company_id` na kontakcie
- Uruchamia `enrich-company-data` (tak jak `useCreateCompanyFromDomain` ale z nazwy)

### 2. Nowy hook `useCreateCompanyFromName`

W `useCompanies.ts` -- analogiczny do `useCreateCompanyFromDomain`, ale:
- Przyjmuje `companyName` i `contactId`
- Tworzy firme z nazwa (bez website)
- Przypisuje do kontaktu
- Uruchamia AI enrichment z `company_name`

### 3. Edge function -- auto-tworzenie firmy

W `updateCompanyRecord`, gdy `company_id` jest null ale `companyName` istnieje:
- Utworz nowy rekord w `companies` z nazwa i tenant_id
- Zaktualizuj kontakt z nowym `company_id`
- Zapisz dane Perplexity do nowej firmy

## Pliki do modyfikacji

| Plik | Zmiana |
|---|---|
| `src/components/contacts/CompanyView.tsx` | Dodanie przycisku "Utworz firme" gdy `contact.company` istnieje |
| `src/hooks/useCompanies.ts` | Nowy hook `useCreateCompanyFromName` |
| `supabase/functions/bi-fill-from-note/index.ts` | `updateCompanyRecord` -- auto-tworzenie firmy gdy brak `company_id` |

## Logika w CompanyView

```text
if (!company) {
  if (emailDomain) -> przycisk "Utworz firme z domeny" (istniejacy)
  else if (contact.company) -> przycisk "Utworz firme EMMA Market" (NOWY)
  else -> komunikat "brak firmy"
}
```

