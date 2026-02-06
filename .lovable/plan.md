

# Add Contact Name to Activity Entries in "Ostatnia aktywnosc"

## Problem

The "Ostatnia aktywnosc" section on `/my-day` shows activity descriptions like "Zainicjalizowano agenta AI z regeneracja embeddingu" but does not display which contact the activity relates to. The data is already fetched (the query joins `contacts:contact_id(id, full_name)`), it just needs to be rendered.

## What changes

- **1 file modified**: `src/pages/MyDay.tsx` -- update the activity entry rendering to show the contact name

## Implementation

In the activity list rendering (around line 277-293), update each entry to display the contact name alongside the description.

Current rendering:
```text
{entry.description || `Aktywnosc: ${entry.activity_type}`}
```

New rendering will show the contact name as a bold prefix or suffix:
```text
<p className="text-sm text-foreground flex-1 min-w-0">
  <span className="truncate block">
    {entry.description || `Aktywnosc: ${entry.activity_type}`}
  </span>
  {entry.contacts?.full_name && (
    <span className="text-xs text-muted-foreground">
      {entry.contacts.full_name}
    </span>
  )}
</p>
```

This adds the contact's full name as a secondary line below the activity description, styled in `text-xs text-muted-foreground` to differentiate it from the main description text.

## Visual result

Each activity row will look like:

```text
[Icon]  Zainicjalizowano agenta AI z regeneracja embeddingu     5 dni temu
        Jan Kowalski
```

## What is NOT changed

- No hook changes (data is already fetched correctly)
- No database changes
- No other pages or components modified

