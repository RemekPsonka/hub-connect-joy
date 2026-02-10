
# Dodanie obslugi plikow do importu poszukiwanych

## Co sie zmieni

Dialog "Importuj liste poszukiwanych" bedzie obslugiwac nie tylko wklejanie tekstu, ale rowniez wczytywanie plikow: zdjec (PNG/JPG), PDF, arkuszy Excel (XLSX/CSV). Uzytkownik wybiera plik lub wkleja tekst -- oba sposoby prowadza do tego samego kroku review z kartami.

## Zmiany w plikach

### 1. `src/components/wanted/ImportWantedDialog.tsx`

- Dodac przycisk "Wczytaj plik" z ukrytym `<input type="file" accept=".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp" />`
- Pokazac nazwe wczytanego pliku z mozliwoscia usuniecia
- Przy analizie:
  - CSV: `file.text()` -> wyslac jako `{ content, contentType: "csv" }`
  - XLSX/XLS: uzyc biblioteki `xlsx` (juz zainstalowana) do konwersji na CSV -> wyslac jako `{ content, contentType: "csv" }`
  - PDF: `file.text()` -> wyslac jako `{ content, contentType: "pdf" }`
  - Obrazy (PNG/JPG/WEBP): konwersja do base64 przez `FileReader.readAsDataURL` -> wyslac jako `{ content, contentType: "image" }`
- Przycisk "Analizuj z AI" aktywny gdy jest tekst LUB plik (+ wybrany requestedBy)
- Nowe stanu: `uploadedFile: File | null`
- Dodac ikone `Upload` z lucide-react

### 2. `supabase/functions/parse-wanted-list/index.ts`

- Rozszerzyc o obsluge `contentType` w body (`"text" | "csv" | "pdf" | "image"`)
- Dla `image`: uzyc multimodalnego promptu z `image_url` (ten sam pattern co w `parse-contacts-list`)
- Dla `csv`/`pdf`: tekst trafia do user prompt jako dane do analizy
- Dodac walidacje rozmiaru contentu (max 5MB)
- System prompt bez zmian -- AI i tak rozpozna tabelaryczne dane

## Uklad UI (etap input)

```text
Kto szuka *
[select kontakt]

Wklej liste lub wczytaj plik
[textarea - wklej tekst...]

[przycisk: Wczytaj plik (CSV, Excel, PDF, zdjecie)]
[jesli plik: badge z nazwa pliku + X do usuniecia]

Termin poszukiwania
[select: miesiac / kwartal / rok / bez limitu]

[Anuluj] [Analizuj z AI]
```

Jesli uzytkownik wkleil tekst I wczytal plik -- priorytet ma plik.

## Szczegoly techniczne

### Konwersja plikow (frontend)

Wzorowane na istniejacym `useAIImport.ts` (linia 282-302):

- CSV: `await file.text()`
- XLSX: `XLSX.read(arrayBuffer)` -> `XLSX.utils.sheet_to_csv(sheet)`
- PDF: `await file.text()` (tekst z PDF)
- Obrazy: `FileReader.readAsDataURL(file)` -> base64 string

### Edge function - obsluga image

Dla `contentType === 'image'`, wiadomosc do AI bedzie miala format multimodalny:
```json
{
  "role": "user",
  "content": [
    { "type": "text", "text": "prompt..." },
    { "type": "image_url", "image_url": { "url": "data:image/png;base64,..." } }
  ]
}
```

Ten sam pattern co w istniejacym `parse-contacts-list/index.ts` (linia 118-127).
