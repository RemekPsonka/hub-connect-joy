
# Plan: Dodanie breadcrumbs do stron szczegolowych

## Cel
Dodac nawigacje breadcrumb do 4 kluczowych stron szczegolowych, aby uzytkownik widzial gdzie sie znajduje i mogl szybko wrocic do poprzednich poziomow bez uzycia przycisku "Back".

---

## Zmiana 1: ContactDetail.tsx

**Plik:** `src/pages/ContactDetail.tsx`

**Dodac import (linia 1-19):**
```typescript
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
```

**Dodac breadcrumb przed ContactDetailHeader (linia 79):**
```tsx
return (
  <div className="space-y-6">
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/contacts">Kontakty</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{contact.full_name}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>

    <ContactDetailHeader ... />
```

---

## Zmiana 2: CompanyDetail.tsx

**Plik:** `src/pages/CompanyDetail.tsx`

**Dodac import (linia 1-9):**
```typescript
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
```

**Zamienic przycisk "Powrot do listy firm" na breadcrumb (linie 39-48):**
```tsx
return (
  <div className="container max-w-6xl py-6 space-y-6">
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/contacts?tab=companies">Firmy</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{company.name}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>

    <CompanyProfileHeader ... />
```

**Uwaga:** Usuwamy przycisk Button z ArrowLeft - breadcrumb go zastepuje.

---

## Zmiana 3: ConsultationDetail.tsx

**Plik:** `src/pages/ConsultationDetail.tsx`

**Dodac import (linia 1-12):**
```typescript
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
```

**Dodac breadcrumb przed ConsultationDetailHeader (linia 37):**
```tsx
return (
  <div className="space-y-6">
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/consultations">Konsultacje</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>
            {consultation.contact?.full_name 
              ? `Konsultacja z ${consultation.contact.full_name}` 
              : 'Konsultacja'}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>

    <ConsultationDetailHeader ... />
```

---

## Zmiana 4: MeetingDetail.tsx

**Plik:** `src/pages/MeetingDetail.tsx`

**Dodac import (linia 1-17):**
```typescript
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
```

**Dodac breadcrumb przed MeetingDetailHeader (linia 74):**
```tsx
return (
  <div className="space-y-6">
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/meetings">Spotkania</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{meeting.title}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>

    <MeetingDetailHeader ... />
```

---

## Podsumowanie zmian

| Plik | Akcja |
|------|-------|
| `src/pages/ContactDetail.tsx` | Dodac import + breadcrumb przed header |
| `src/pages/CompanyDetail.tsx` | Dodac import + zamienic Button na breadcrumb |
| `src/pages/ConsultationDetail.tsx` | Dodac import + breadcrumb przed header |
| `src/pages/MeetingDetail.tsx` | Dodac import + breadcrumb przed header |

---

## Wazne szczegoly

- Uzywamy `<BreadcrumbLink href="...">` dla klikanych elementow (natywna nawigacja)
- Ostatni element to zawsze `<BreadcrumbPage>` (tekst bez linku)
- Klasa `mb-4` zapewnia odstep od contentu ponizej
- W CompanyDetail usuwamy przycisk "Powrot" - breadcrumb go zastepuje
- Breadcrumbs sa widoczne tylko gdy dane sa zaladowane (po sprawdzeniu isLoading/error)
