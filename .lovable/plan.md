

# Dodaj kontakt z poziomu dialogu "Dodaj kontakt do zespolu"

## Opis
Gdy wyszukiwanie w dialogu "Dodaj kontakt do zespolu" nie zwroci wynikow, pojawi sie przycisk "Dodaj nowy kontakt". Klikniecie otwiera standardowy modal dodawania kontaktu (ContactModal). Po zapisaniu nowego kontaktu, jest on automatycznie zaznaczony w dialogu i gotowy do dodania na kanban.

## Zmiany

### 1. `src/components/deals-team/AddContactDialog.tsx`

- Import `ContactModal` z `@/components/contacts/ContactModal`
- Nowy state: `showCreateContact` (boolean)
- W sekcji "Nie znaleziono kontaktow" dodanie przycisku "Dodaj nowy kontakt" (ikona UserPlus)
- Rowniez przycisk "Dodaj nowy kontakt" pod wynikami wyszukiwania (zawsze dostepny)
- Renderowanie `ContactModal` z `isOpen={showCreateContact}`
- Po zamknieciu ContactModal: odswiezenie query kontaktow, automatyczne ustawienie nowo dodanego kontaktu jako `selectedContactId`

Logika auto-zaznaczenia po dodaniu:
- Przed otwarciem ContactModal zapamietujemy `searchQuery`
- Po zamknieciu ContactModal: nasluchiuwanie na `queryClient` invalidation lub uzycie callbacka
- Alternatywnie: subskrypcja na `useCreateContact` mutation cache -- po sukcesie odczytujemy ID nowego kontaktu i ustawiamy go jako wybrany

### 2. Szczegoly techniczne

ContactModal po udanym zapisie:
- Wywoluje `onClose()`
- Mutacja `useCreateContact` zwraca nowy kontakt z `id`

Podejscie: Opakujemy ContactModal tak, zeby po zamknieciu sprawdzic czy dodano nowy kontakt. Uzycie `queryClient.getQueryCache()` do wykrycia nowego kontaktu lub prostsza metoda -- nasluchiuwanie na `onMutate` z `useCreateContact`.

Najlepsza metoda: Rozszerzenie `ContactModal` o opcjonalny callback `onCreated?: (contactId: string, contactName: string) => void` ktory jest wywolywany po udanym utworzeniu kontaktu. W `AddContactDialog` ten callback ustawia `selectedContactId` na nowy ID.

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/contacts/ContactModal.tsx` | Dodanie opcjonalnego callbacka `onCreated` |
| `src/components/deals-team/AddContactDialog.tsx` | Przycisk "Dodaj nowy kontakt", integracja z ContactModal, auto-zaznaczenie |

## Przeplyw

```text
Szukaj kontaktu -> Brak wynikow -> "Dodaj nowy kontakt"
                                         |
                                   ContactModal (otwarty)
                                         |
                                   Uzytkownik wypelnia dane
                                         |
                                   Zapisz -> onCreated(id, name)
                                         |
                                   selectedContactId = id
                                   selectedContact widoczny w podgladzie
                                         |
                                   Klik "Dodaj" -> kontakt na kanbanie
```

