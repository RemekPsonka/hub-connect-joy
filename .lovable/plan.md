

# Etap 3: Sanityzacja HTML -- XSS w ReportPreviewModal

## Zakres

Instalacja pakietu `dompurify` oraz modyfikacja jednego pliku frontend.

---

## Zmiana 3a: Instalacja pakietu `dompurify`

Dodac zaleznosc `dompurify` (oraz `@types/dompurify` dla TypeScript).

---

## Zmiana 3b: Sanityzacja HTML w `ReportPreviewModal.tsx`

**Obecny stan** (linia 28):
```text
dangerouslySetInnerHTML={{ __html: html }}
```

**Nowy stan**:
```text
import DOMPurify from 'dompurify';

const sanitizedHtml = DOMPurify.sanitize(html, {
  ALLOWED_TAGS: [
    'h1','h2','h3','h4','h5','h6','p','br','strong','em','b','i','u',
    'ul','ol','li','table','thead','tbody','tfoot','tr','th','td',
    'div','span','a','img','hr','blockquote','pre','code'
  ],
  ALLOWED_ATTR: ['href','src','alt','style','class','colspan','rowspan','target','width','height'],
  ALLOW_DATA_ATTR: false,
});

<div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
```

**Analiza wplywu**: Raport email generowany przez edge function `sovra-weekly-report` uzywa standardowych tagow HTML (tabele, naglowki, akapity, listy). Wszystkie te tagi sa na liscie dozwolonych. Tagi `<script>`, `<iframe>`, event handlery (`onclick`, `onerror`) zostana usuniete. Wizualnie raport bedzie wygladal identycznie.

---

## Podsumowanie

| Zmiana | Typ | Ryzyko zlamania |
|---|---|---|
| 3a: Instalacja dompurify | Pakiet npm | Zerowe |
| 3b: Sanityzacja HTML | Kod frontend | Zerowe -- wszystkie uzywane tagi sa dozwolone |

