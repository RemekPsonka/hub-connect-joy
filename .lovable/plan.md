
# Naprawa powiazania konta remek@ideecom.pl

## Zidentyfikowany problem

Konto `remek@ideecom.pl` istnieje w bazie jako **director**, ale jest powiazane z **nieaktualnym user_id**.

| Element | Wartosc |
|---------|---------|
| Aktualny auth user_id | `bec7a137-ec33-4cb6-b13c-3a47d9e53972` |
| user_id w tabeli directors | `fc25bc35-3d29-4b81-887e-af1ae18232a4` (stary) |

System przy logowaniu szuka directora/assistanta po `user_id`, nie znajduje dopasowania i odrzuca logowanie z komunikatem "konto nie jest powiazane z organizacja".

## Rozwiazanie

Jedna operacja SQL - aktualizacja `user_id` w tabeli `directors`:

```sql
UPDATE directors
SET user_id = 'bec7a137-ec33-4cb6-b13c-3a47d9e53972'
WHERE id = '98a271e8-d923-49cb-a6aa-45f3ac0064d8'
  AND email = 'remek@ideecom.pl';
```

## Dodatkowa poprawka kodu (bonus)

Przy okazji naprawienie problemu z zablokowanymi przyciskami logowania w `Login.tsx`:
- Reset `isGoogleLoading` po kazdym wyniku logowania Google (nie tylko przy bledzie)
- Reset stanow ladowania przy wyswietleniu komunikatu o odrzuceniu konta

## Efekt

Po aktualizacji user_id bedziesz mogl zalogowac sie normalnie mailem `remek@ideecom.pl` - zarowno haslem jak i przez Google.
