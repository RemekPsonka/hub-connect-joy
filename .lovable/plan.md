

# Ustawienie bezterminowości dla kontaktów Adama Osoby

## Co robimy
Usuwamy datę wygaśnięcia (`expires_at`) dla wszystkich 67 kontaktów poszukiwanych przez "Adam Osoba" (contact ID: `9118a081-386f-4831-ab7b-544dfbec5ff2`), ustawiając je jako bezterminowe.

## Operacja
Jedna komenda SQL (UPDATE) na tabeli `wanted_contacts`:

```text
UPDATE wanted_contacts
SET expires_at = NULL
WHERE requested_by_contact_id = '9118a081-386f-4831-ab7b-544dfbec5ff2'
  AND expires_at IS NOT NULL;
```

Dotyczy 67 rekordów. Zadne zmiany w kodzie nie sa wymagane.
