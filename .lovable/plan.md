## Plan naprawy

1. **Przyczyna**
   - W `UnifiedKanbanCard` listener DnD jest podpięty tylko do małej ikonki uchwytu po lewej stronie karty.
   - Reszta karty otwiera panel szczegółów albo zatrzymuje `pointerdown`, więc przeciąganie „dowolnej karty” faktycznie nie startuje.

2. **Zmiana UX**
   - Podłączę `dragListeners` i `dragAttributes` do głównego wrappera karty, żeby kartę dało się chwycić z całej powierzchni.
   - Elementy interaktywne wewnątrz karty (`badge`, przyciski, szybka edycja składki, następny krok, zadania, milestone, akcje) nadal będą zatrzymywać `pointerdown`, żeby kliknięcia i edycja nie odpalały dragowania.
   - Ikonka uchwytu zostanie jako wizualna wskazówka, ale nie będzie jedynym miejscem startu drag.

3. **Zakres techniczny**
   - Edycja tylko `src/components/sgu/sales/UnifiedKanbanCard.tsx` i ewentualnie minimalnie wrappera w `UnifiedKanban.tsx`, jeśli będzie potrzebne dopięcie atrybutów na zewnętrzny `div`.
   - Bez zmian w bazie, migracjach i logice etapów.

4. **Weryfikacja**
   - Sprawdzę TypeScript dla zmienionych plików / kompilację.
   - Sprawdzę lint edytowanego pliku.
   - Zweryfikuję w preview, że kartę da się chwycić z powierzchni karty, a przyciski na karcie nadal działają kliknięciem.