

## Plan: Naprawa błędu zapętlania przy zapisie konsultacji

### Zidentyfikowany problem

W pliku `src/components/consultations/ConsultationQuestionnaire.tsx`:

1. **Linia 96**: Pole `next_meeting_date` jest inicjalizowane jako pusty string `''`
2. **Linie 166-174**: useEffect z debounce 1500ms automatycznie wywołuje `saveFormData`
3. **Linie 142-163**: `saveFormData` wysyła pusty string `""` do bazy danych
4. PostgreSQL odrzuca pusty string dla kolumny typu `date` z błędem: `invalid input syntax for type date: ""`
5. Błąd jest logowany, toast wyświetlany, ale `formData` się nie zmienia
6. Po 1500ms auto-save próbuje ponownie → **nieskończona pętla błędów**

---

### Rozwiązanie

#### Plik: `src/components/consultations/ConsultationQuestionnaire.tsx`

**Zmiana w funkcji `saveFormData` (linie 142-163)**

Przed wysłaniem danych do bazy, zamienić puste stringi na `null` dla pól typu `date`:

```typescript
// Obecny kod (linia 145-151):
await upsertQuestionnaire.mutateAsync({
  consultationId: consultation.id,
  data: {
    ...data,
    group_engagement_rating: data.group_engagement_rating,
  },
});

// Nowy kod:
await upsertQuestionnaire.mutateAsync({
  consultationId: consultation.id,
  data: {
    ...data,
    // Zamień puste stringi na null dla pól daty - PostgreSQL nie akceptuje ""
    next_meeting_date: data.next_meeting_date || null,
    group_engagement_rating: data.group_engagement_rating,
  },
});
```

---

### Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `src/components/consultations/ConsultationQuestionnaire.tsx` | Sanityzacja pustego stringa `next_meeting_date` na `null` przed zapisem |

### Oczekiwany rezultat

1. Błąd zapętlenia zostanie naprawiony
2. Auto-save będzie działać poprawnie
3. Toast "Nie udało się zapisać danych" przestanie się pojawiać w pętli
4. Konsultacja z Adamem Osoba pojawi się poprawnie na dashboardzie (cache się odświeży po pomyślnym zapisie)

