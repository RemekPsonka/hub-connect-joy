

# B-FIX.7 — Spójny status w lejku (Kanban ↔ Sheet)

## Problem

Kanban używa `deriveStage()` do mapowania raw `category` na 4 kolumny:
- `hot`, `top`, `10x`, `cold` → **Lead**
- `audit`, `offering` → **Ofertowanie**
- `client` → **Klient**
- reszta → **Prospekt**

Ale "STATUS W LEJKU" w `ContactTasksSheet` (linia 277) wyświetla surowy `contact.category` (`categoryLabels[contact.category]`), np. "Audyt", "Hot". Stąd rozbieżność — kontakt jest w kolumnie "Ofertowanie" na Kanbanie, ale Sheet pokazuje "Audyt".

## Rozwiązanie

W sekcji "STATUS W LEJKU" w `ContactTasksSheet.tsx` zamienić badge `categoryLabels[contact.category]` na badge pokazujący **derived stage** (etap kolumny Kanbana) + opcjonalnie sub-kategorię (temperature / source / client_status / offering_stage).

### Szczegóły zmiany

**Plik: `src/components/deals-team/ContactTasksSheet.tsx`**

1. Import `deriveStage` z `../sgu/sales/UnifiedKanban` (już eksportowana).
2. Dodać mapę etykiet dla derived stage:
   ```tsx
   const stageLabels: Record<string, string> = {
     prospect: 'Prospekt',
     lead: 'Lead',
     offering: 'Ofertowanie',
     client: 'Klient',
     lost: 'Utracony',
   };
   ```
3. W sekcji "STATUS W LEJKU" (linia ~276-283) zamienić badge'e na:
   ```tsx
   <Badge variant="outline">
     {stageLabels[deriveStage(contact)] || contact.category}
   </Badge>
   <Badge variant="secondary">
     {statusLabels[contact.status] || contact.status}
   </Badge>
   <Badge variant="secondary">
     {priorityLabels[contact.priority] || contact.priority}
   </Badge>
   {/* Sub-stage badge — temperatura, source, offering_stage */}
   {contact.offering_stage && CATEGORIES_WITH_SUBSTAGES.has(contact.category) && (
     <Badge variant="secondary">
       {subStageLabels[contact.offering_stage] || contact.offering_stage}
     </Badge>
   )}
   ```

Jedyna zmiana to linia 277: `categoryLabels[contact.category]` → `stageLabels[deriveStage(contact)]`.

### Pliki

| # | Plik | Akcja |
|---|---|---|
| 1 | `src/components/deals-team/ContactTasksSheet.tsx` | EDIT — import `deriveStage`, dodać `stageLabels`, zamienić badge etapu |

### Efekt

- Kontakt z `category='audit'` → Sheet pokaże "Ofertowanie" (zgodnie z Kanbanem) + "Handshake" (offering_stage)
- Kontakt z `category='hot'` → Sheet pokaże "Lead" (zgodnie z Kanbanem)
- Kontakt z `category='client'` → Sheet pokaże "Klient" (bez zmian — tu było spójne)

### Weryfikacja

```bash
npx tsc --noEmit   # 0 errors
```

Manual smoke:
- Otwórz Sheet kontaktu z kolumny Ofertowanie → "STATUS W LEJKU" pokazuje "Ofertowanie", nie "Audyt"
- Otwórz Sheet kontaktu z kolumny Lead → pokazuje "Lead", nie "Hot"/"Top"

