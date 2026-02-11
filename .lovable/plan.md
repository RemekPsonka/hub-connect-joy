

# Przenoszenie briefu AI z prospectingu do karty kontaktu

## Problem

Podczas konwersji prospekta na kontakt dealowy (Kanban), brief AI (`ai_brief`) jest kopiowany tylko do arkusza Business Interview (BI), ale **nie jest zapisywany** w kolumnie `deal_team_contacts.ai_brief`. Dlatego w popupie kontaktu (DealContactDetailSheet) brief jest pusty i wyswietla sie "Brak briefu".

## Rozwiazanie

W pliku `ProspectingConvertDialog.tsx`, w momencie insertu do `deal_team_contacts` (linia 216-223), nalezy dodac pole `ai_brief` oraz `ai_brief_generated_at` z danych prospekta.

## Plik do modyfikacji

| Plik | Zmiana |
|---|---|
| `src/components/deals-team/ProspectingConvertDialog.tsx` | Dodanie `ai_brief` i `ai_brief_generated_at` do insertu `deal_team_contacts` |

## Szczegoly techniczne

W insercie do `deal_team_contacts` (linia 216-223) dodac:

```text
// Przed:
.insert({
  team_id: teamId,
  contact_id: contactId,
  tenant_id: tenantId,
  category,
  priority: 'medium',
  status: 'active',
})

// Po:
.insert({
  team_id: teamId,
  contact_id: contactId,
  tenant_id: tenantId,
  category,
  priority: 'medium',
  status: 'active',
  ai_brief: prospect.ai_brief || null,
  ai_brief_generated_at: prospect.ai_brief_generated_at || null,
})
```

Dodatkowo, jesli kontakt juz istnial w zespole (`existingTeamContact`), brief powinien zostac zaktualizowany jesli jest pusty:

```text
if (existingTeamContact) {
  teamContactId = existingTeamContact.id;
  // Update brief if missing
  if (prospect.ai_brief) {
    await supabase
      .from('deal_team_contacts')
      .update({
        ai_brief: prospect.ai_brief,
        ai_brief_generated_at: prospect.ai_brief_generated_at || new Date().toISOString(),
      })
      .eq('id', existingTeamContact.id)
      .is('ai_brief', null);
  }
  toast.info('Kontakt juz byl w zespole -- zaktualizowano');
}
```

Zmiana dotyczy tylko jednego pliku i dwoch miejsc w kodzie (insert nowego kontaktu + update istniejacego).
