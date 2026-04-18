
# Naprawa wyszukiwania „kentla krzysztof”

## Diagnoza
Problem nie jest już w samej obecności kontaktu w bazie ani w prostym wyszukiwaniu po `last_name`. Obecny kod w `AddContactDialog` i `AddClientDialog` szuka całej frazy jako jednego ciągu:
- `full_name ilike %kentla krzysztof%`
- `first_name ilike %kentla krzysztof%`
- `last_name ilike %kentla krzysztof%`

To działa dla `krzysztof kentla`, ale nie dla odwróconej kolejności `kentla krzysztof`, bo żadne pojedyncze pole nie zawiera takiej frazy.

## Co zmienię
### 1. Uodpornię wyszukiwanie na kolejność słów
W obu dialogach:
- rozbiję wpisaną frazę na tokeny, np. `kentla krzysztof` → `["kentla", "krzysztof"]`
- zrobię szersze pobranie po jednym tokenie serwerowo
- następnie odfiltruję wyniki po stronie klienta tak, aby **każdy token** musiał wystąpić w złączonym tekście kontaktu:
  - `full_name`
  - `first_name`
  - `last_name`
  - `company`
  - `email`

Dzięki temu zadziała:
- `krzysztof kentla`
- `kentla krzysztof`
- `krzysztof`
- `kentla`

### 2. Ujednolicę logikę w obu miejscach
Poprawka trafi do:
- `src/components/deals-team/AddContactDialog.tsx`
- `src/components/deals-team/AddClientDialog.tsx`

Żeby oba modale działały identycznie.

## Technicznie
Podejście:
1. `trim()`
2. `split(/\s+/)`
3. `tokens = [...].filter(Boolean)`
4. pobranie kontaktów po najbardziej zawężającym tokenie
5. lokalny filtr:
```text
haystack = [full_name, first_name, last_name, company, email].join(' ').toLowerCase()
wynik przechodzi tylko jeśli każdy token jest w haystack
```

To jest bezpieczniejsze niż próba budowania bardzo złożonego filtra SQL/PostgREST dla wielu słów i różnych kolejności.

## Efekt
Po wdrożeniu kontakt „Krzysztof Kentla” będzie znajdowany także po wpisaniu:
- `kentla krzysztof`

bez zmiany działania dla dotychczasowych przypadków.
