
User chce pełny audyt systemu po Sprintach 19a/19b/19c-α. Tryb READ-ONLY — robię recon + raport.

## Plan audytu

### 1. Sanity check kompilacji
- `tsc --noEmit` (build check) + lint w tle.
- `grep` na zakazane wzorce: `console.log`, `any`, legacy edge fn (`enrich-company-data`, `bulk-merge-contacts`, `ocr-business-card[s-batch]?`, `analyze-linkedin-profile|generate-contact-profile|enrich-person-data` w `src/`).

### 2. Backend (DB + edge fn)
- `supabase--read_query`:
  - kolumny `companies` (czy A5 RENAME nie został przypadkiem zrobiony?)
  - `pg_trigger` — `trg_sync_company_data_sources` (powinien jeszcze istnieć — A3 odłożone)
  - `archive.companies_backup_20260419` count vs `public.companies`
  - `cron.job` — czy jakieś legacy funkcje mają jeszcze schedule (`enrich-company-data`, `bulk-merge-contacts`, `ocr-business-card*`, `sovra-weekly-report`)
  - `ai_usage_log` policy (S19a fix) — czy WITH CHECK true zniknął
  - `unified_meetings` COMMENT
  - `archive.deprecated_*_20260418` — w archive schemacie
- `supabase--linter` — generic security scan
- `ls supabase/functions/` — czy fizycznie skasowane: `bulk-merge-contacts`, `ocr-business-card`, `ocr-business-cards-batch`, `sovra-weekly-report`, `ai-chat`, `remek-chat`, `learn-contact-agent`, `bi-fill-from-note`, `process-bi-ai`, `bi-agent-interview`, etc.

### 3. Flow audyt — kluczowe akcje E2E (czytane z kodu)
- **Enrich Company**: FE wciąż woła `enrich-company-data` (E odłożone) — sprawdzić call-sites, czy nie psuje to że plik istnieje. Worker `enrich-company-worker` + `enqueue-enrich-company` istnieją równolegle.
- **OCR wizytówek**: `useBusinessCardOCR.ts` po refactorze → `ocr-business-cards` z `{items}`. Sprawdzić że kontrakt zgodny z `ocr-business-cards/index.ts`.
- **Enrich Person**: orchestrator `enrich-person` z `steps`. Sprawdzić call-sites i body shape.
- **Merge contacts**: `merge-contacts` z 3 shapes. Sprawdzić `useContacts.ts` że woła `pairs`.
- **Sovra (chat)**: nie ruszane — sanity check że istnieje.
- **Background jobs**: realtime + JobsBell.
- **BI 2.0**: ContactBI nie ruszane.
- **Pipeline / Lejek (deal-team)**: nie ruszane.

### 4. Tech debt zostawiony świadomie (sprint 19c-β)
- Companies dual-write — pełen FE refactor + RENAME kolumn.
- Kasacja `enrich-company-data` monolitu.
- Drop trigger `trg_sync_company_data_sources`.

### 5. Format raportu (krótki, biznesowy + sekcja techniczna)

```
## ✅ Co działa
- ...
## ⚠️ Co wymaga dokończenia (sprint 19c-β)
- ...
## 🐛 Ewentualne bugi / regresje
- ...
## 🔒 Security
- ...
## 📋 Rekomendowana kolejność dalej
1. ...
```

## Tool calls (równolegle gdzie się da)

**Round 1** (recon, wszystko równolegle):
- `code--exec`: `npx tsc --noEmit 2>&1 | head -100 & ls supabase/functions/ | sort & grep -rn "enrich-company-data\|bulk-merge-contacts\|ocr-business-card\b\|ocr-business-cards-batch\|analyze-linkedin-profile\|generate-contact-profile\|enrich-person-data" src/ 2>/dev/null & wait`
- `supabase--read_query`: kolumny companies + trg_sync + archive count + cron.job + unified_meetings comment (jednym multi-statement nie wolno → kilka równoległych)
- `supabase--linter`

**Round 2** (po wynikach):
- `code--view`: kluczowe pliki które wymagają walidacji (np. `useBusinessCardOCR.ts`, `useContacts.ts`, `merge-contacts/index.ts`, `enrich-person/index.ts`) — tylko jeśli recon wskaże podejrzenia.

**Round 3**: raport końcowy z 4-5 sekcjami + lista TODO dla 19c-β + decyzja czy są blockery do natychmiastowego fixu.

Bez zmian w kodzie (tryb READ-ONLY).
