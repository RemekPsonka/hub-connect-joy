# Smoke QA — ROZLICZENIA-02 (lista polis + holding + dopasowanie)

## Wymagania wstępne
- ROZLICZENIA-01 zaaplikowane (4 tabele: `policy_entries`, `policy_import_batches`, `policy_import_rows`, `import_client_mappings`).
- Edge function `import-policies` wgrana i wykonany przynajmniej jeden import pliku.
- 4 nowe RPC (`get_policies_list`, `get_company_holding_tree`, `get_unmatched_import_clients`, `match_import_client`) zaaplikowane.
- Edge function `reprocess-unmatched-rows` wdrożona.

## Scenariusz

1. Otwórz `/sgu/rozliczenia/polisy`.
2. Kliknij "Klientów do dopasowania". Lista powinna pokazać 9 nieznanych kodów (po przykładowym imporcie Remka).
3. Dla **SIS (524992645)** wpisz w polu wyszukiwania `SIS` lub NIP, wybierz odpowiednią firmę z systemu, kliknij **Dopasuj i przelicz**.
4. Toast: "Dopasowano. Dodano N pozycji."
5. Lista nieznanych skraca się do 8 kodów.
6. Wróć do `/sgu/rozliczenia/polisy` — widać polisy SIS (≈ 439 polis, Σ składka ≈ 2 099 630 PLN).
7. Wpisz w filtr `SIS` — lista zawężona, kliknij polisę → otwiera się Sheet z pozycjami (1 pozycja na polisę).
8. Znajdź polisę `498000009447` (RISER) — kolumna **Pozycji = 2**. Kliknij wiersz: w Sheet pokazują się 2 pozycje z różnymi `commission_gross` (0 i 1035) i różnymi `sale_type`.
9. Wejdź na `/sgu/rozliczenia/klienci/<sis_company_id>`:
   - KPI: 439 polis, ~2 099 630 PLN składek.
   - Wykres miesięczny + pie produktów.
10. **Holding RISER**: w `companies` ustaw drugi NIP RISER jako `parent_company_id` pierwszego (ręcznie). Otwórz `/sgu/rozliczenia/klienci/<riser_id>` → drzewo holdingowe pokazuje obie firmy z sumami YTD. Przycisk **Widok holdingowy** agreguje KPI z obu spółek.
11. **Idempotentność**: ponowne kliknięcie "Dopasuj" dla SIS nie tworzy duplikatów (`policy_entries.dedup_hash` UNIQUE, `import_client_mappings` UNIQUE).

## Acceptance ✅
- Lista polis działa z grupowaniem i filtrami.
- Drill-down pokazuje wszystkie pozycje + flagi (korekta, anulowana).
- Drzewo holdingowe pokazuje całą strukturę z agregatami.
- Dopasowanie + reprocess kompletny w jednej akcji UI.
- Brak duplikatów po retry.
