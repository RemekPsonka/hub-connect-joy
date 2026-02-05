
# Plan: Aktualizacja metadanych w index.html

## Cel

Zastąpienie domyślnych metadanych "Lovable App" profesjonalnymi danymi dla aplikacji CRM oraz dodanie brakującego `theme-color`.

---

## Obecny stan

Plik `index.html` zawiera domyślne wartości:
- `<title>Lovable App</title>`
- `<meta name="description" content="Lovable Generated Project" />`
- Open Graph z "Lovable App" i "Lovable Generated Project"
- Brak `<meta name="theme-color">`

---

## Zmiany do wprowadzenia

### 1. Tytuł strony (linia 7)
```html
<!-- Przed -->
<title>Lovable App</title>

<!-- Po -->
<title>AI Network Assistant — CRM</title>
```

### 2. Opis strony (linia 8)
```html
<!-- Przed -->
<meta name="description" content="Lovable Generated Project" />

<!-- Po -->
<meta name="description" content="Inteligentny system zarządzania kontaktami, firmami i siecią biznesową z AI" />
```

### 3. Open Graph title (linia 12)
```html
<!-- Przed -->
<meta property="og:title" content="Lovable App" />

<!-- Po -->
<meta property="og:title" content="AI Network Assistant — CRM" />
```

### 4. Open Graph description (linia 13)
```html
<!-- Przed -->
<meta property="og:description" content="Lovable Generated Project" />

<!-- Po -->
<meta property="og:description" content="Zarządzaj siecią biznesową z pomocą sztucznej inteligencji" />
```

### 5. Theme color (nowa linia po viewport)
```html
<!-- Dodać po linii 5 -->
<meta name="theme-color" content="#8B5CF6" />
```

### 6. Usunięcie komentarzy TODO (linie 6, 11)
Opcjonalne - usunięcie komentarzy `<!-- TODO: ... -->` które już nie są potrzebne.

---

## Zakres zmian

| Element | Zmiana |
|---------|--------|
| `index.html` | Aktualizacja metadanych |

---

## Bez zmian

- Skrypty i importy w `index.html`
- Pliki `.tsx`
- Edge Functions
- `og:image` i `twitter:image` (pozostają z Lovable CDN)
- `og:type` (pozostaje "website")

---

## Wynikowy nagłówek

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#8B5CF6" />
  <title>AI Network Assistant — CRM</title>
  <meta name="description" content="Inteligentny system zarządzania kontaktami, firmami i siecią biznesową z AI" />
  <meta name="author" content="Lovable" />

  <meta property="og:title" content="AI Network Assistant — CRM" />
  <meta property="og:description" content="Zarządzaj siecią biznesową z pomocą sztucznej inteligencji" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://lovable.dev/opengraph-image-p98pqg.png" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@Lovable" />
  <meta name="twitter:image" content="https://lovable.dev/opengraph-image-p98pqg.png" />
</head>
```
