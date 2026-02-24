

# Przebudowa kolejnosci sekcji w panelu bocznym zadania

## Obecna kolejnosc (po bloku metadanych)
1. Etykiety
2. Dodatkowe pola
3. Zaleznosci
4. Powiazane kontakty
5. Subtaski
6. Opis
7. Zalaczniki
8. Sledzenie czasu
9. Spotkania GCal
10. Historia zmian
11. Komentarze

## Nowa kolejnosc (zgodnie z referencja)
1. **Opis** (przeniesiony w gore)
2. **Historia zmian** (przeniesiona w gore)
3. **Komentarze** (przeniesione w gore)
4. Etykiety
5. Dodatkowe pola
6. Zaleznosci
7. Powiazane kontakty
8. Subtaski
9. Zalaczniki
10. Sledzenie czasu
11. Spotkania GCal

## Plan techniczny

### Plik: `src/components/tasks/TaskDetailSheet.tsx`

Przeorganizowanie sekcji w renderze (linie 856-1045). Blok metadanych (linia 692-856) pozostaje bez zmian. Po nim:

1. Przeniesienie sekcji "Opis" (linie 1005-1029) zaraz po zamknieciu `</div>` metadanych (linia 856)
2. Przeniesienie "Activity Log" (linia 1041) po opisie
3. Przeniesienie "Comments" (linie 1043-1045) po historii
4. Nastepnie pozostale sekcje w dotychczasowej kolejnosci (Labels, Custom Fields, Dependencies, Related contacts, Subtasks, Attachments, Time Tracker, Linked meetings)

Zadna logika ani stanu nie ulega zmianie -- to czysto przeorganizowanie kolejnosci renderowania sekcji JSX.

