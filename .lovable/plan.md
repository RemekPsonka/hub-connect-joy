

# Tygodniowy raport Sovra -- Edge Function + konfiguracja w Settings

## Podsumowanie

Dodajemy automatyczny raport email generowany przez Sovre: Edge Function zbiera statystyki tygodnia (zadania, projekty, kontakty, aktywnosc), generuje podsumowanie AI (Gemini 2.5 Flash) i wysyla email HTML przez Resend. Konfiguracja raportow dostepna w Settings w zakladce Integracje.

## Wazne ustalenia z analizy codebase

| Element | Stan |
|---------|------|
| Tabela `sovra_report_config` | Nie istnieje -- wymaga migracji |
| `RESEND_API_KEY` | **Nie skonfigurowany** -- fallback: zapis do `sovra_sessions` bez wysylki |
| `FRONTEND_URL` | Skonfigurowany |
| `contact_activity_log` | Istnieje (id, tenant_id, contact_id, activity_type, description, metadata, created_at) |
| `sovra_sessions` | Istnieje (id, tenant_id, director_id, type, title, content, tasks_created, notes_created, started_at, ended_at, metadata) |
| Kolumna kontaktow | `last_contact_date` (date), `relationship_strength` (integer) -- bez `relationship_health` |
| Auth pattern | Identyczny jak `sovra-reminder-trigger`: service_role vs JWT |
| Settings Integracje | Zakladka `integrations` z `GoogleCalendarSettings` -- dodamy pod spodem |

## Co sie zmieni

| Zmiana | Plik / Zasob |
|--------|-------------|
| Nowa tabela | Migracja: `sovra_report_config` + RLS |
| Nowa Edge Function | `supabase/functions/sovra-weekly-report/index.ts` |
| Wpis config | `supabase/config.toml` |
| Nowy hook | `src/hooks/useSovraReportConfig.ts` |
| Nowy komponent | `src/components/sovra/SovraReportSettings.tsx` |
| Nowy komponent | `src/components/sovra/ReportPreviewModal.tsx` |
| Modyfikacja | `src/pages/Settings.tsx` (dodanie sekcji w zakladce Integracje) |

---

## Szczegoly techniczne

### 1. Migracja bazy danych

```text
CREATE TABLE sovra_report_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  director_id uuid NOT NULL REFERENCES directors(id),
  enabled boolean DEFAULT false,
  frequency text DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly')),
  day_of_week int2 DEFAULT 1 CHECK (day_of_week BETWEEN 0 AND 6),
  time_of_day time DEFAULT '08:00',
  email_override text,
  include_sections jsonb DEFAULT '["summary","tasks","projects","contacts","calendar"]',
  last_sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, director_id)
);

ALTER TABLE sovra_report_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sovra_report_config_own" ON sovra_report_config
  FOR ALL USING (
    tenant_id = get_current_tenant_id() 
    AND director_id = get_current_director_id()
  );
```

### 2. Edge Function -- sovra-weekly-report

Wzorzec autoryzacji identyczny jak `sovra-reminder-trigger`:

```text
Sciezka A: service_role token (cron)
  - Pobierz directorow z sovra_report_config WHERE enabled = true
  - Dla kazdego sprawdz schedule:
    - weekly: day_of_week = EXTRACT(DOW FROM NOW()) AND last_sent_at < CURRENT_DATE
    - daily: last_sent_at < CURRENT_DATE
  - Przetworz kazdego pasujacego

Sciezka B: JWT token (manual preview z frontendu)
  - verifyAuth(req) -> tylko ten director
  - Pomin schedule check (generuj od razu)
  - Zwroc preview_html w response
```

Zbieranie danych za okres (7 dni dla weekly, 1 dzien dla daily):

```text
1. tasks_completed: COUNT tasks WHERE status='done' AND updated_at >= period_start AND assigned_to = director_id
2. tasks_created: COUNT tasks WHERE created_at >= period_start AND assigned_to = director_id
3. tasks_overdue: tasks WHERE due_date < NOW() AND status NOT IN ('done','cancelled') AND assigned_to = director_id
4. upcoming_deadlines: tasks WHERE due_date BETWEEN NOW() AND NOW()+7days AND status NOT IN ('done','cancelled')
5. projects_active: projects WHERE owner_id = director_id AND status IN ('new','in_progress','analysis')
6. Dla kazdego projektu: tasks done / tasks total (progress %)
7. contacts_added: COUNT contacts WHERE created_at >= period_start AND tenant_id = X
8. interactions: COUNT contact_activity_log WHERE created_at >= period_start AND tenant_id = X
9. sovra_sessions: COUNT sovra_sessions WHERE started_at >= period_start AND director_id = X GROUP BY type
10. sovra_reminders: COUNT sovra_reminders WHERE scheduled_at >= period_start AND director_id = X
```

Generowanie AI summary (Lovable AI -- Gemini 2.5 Flash):

```text
POST https://ai.lovable.dev/chat
{
  "model": "gemini-2.5-flash",
  "messages": [{
    "role": "system",
    "content": "Jestes Sovra. Napisz krotkie podsumowanie tygodnia pracy (3-5 zdan) po polsku. 
     Badz konkretna -- podaj liczby. Styl: profesjonalny, pozytywny ale rzeczowy. 
     Jesli sa problemy (zaleglosci, brak aktywnosci) -- wspomnij taktownie. 
     Zakoncz 1 zdaniem motywacji na przyszly tydzien."
  }, {
    "role": "user",
    "content": JSON.stringify(stats)
  }],
  "temperature": 0.5
}
Authorization: Bearer LOVABLE_API_KEY
```

Email HTML -- inline styles, table-based layout (email-safe):

```text
- Max-width: 600px, table-based centering
- Header: gradient violet->indigo, logo "S", tytul, okres
- AI Summary: bg fioletowy, border-left, italic
- Sekcja Zadania: 3 stat boxy (ukonczone/utworzone/zalegle), upcoming deadlines lista
- Sekcja Projekty: kazdy z progress bar (table-based), X/Y zadan
- Sekcja Kontakty: nowych X, interakcji Y
- Sekcja Sovra: briefow X, chatow Y, debriefow Z, przypomnien N
- Sekcja Przyszly tydzien: deadlines
- Footer: "Wygenerowane przez Sovra", linki do Settings
- Wszystkie sekcje warunkowo wg include_sections z config
```

Wysylka emaila:

```text
Jesli RESEND_API_KEY istnieje:
  POST https://api.resend.com/emails
  {
    "from": "Sovra <sovra@domena>",
    "to": [director.email LUB config.email_override],
    "subject": "Sovra -- Twoj tydzien w liczbach (27 sty -- 2 lut 2026)",
    "html": htmlContent
  }

Jesli BRAK RESEND_API_KEY:
  - Zapisz raport do sovra_sessions (type='weekly_report')
  - Loguj warning: "RESEND_API_KEY not configured, report saved but not sent"
  - Nie rzucaj bledu -- preview nadal dziala
```

Po wyslaniu/zapisaniu:
- UPDATE sovra_report_config SET last_sent_at = NOW()
- INSERT sovra_sessions z type='weekly_report', content = { stats, ai_summary, html }

Response:

```text
// Cron mode:
{ reports_sent: number, reports_skipped: number }

// Preview mode (JWT):
{ preview_html: string, stats: {...} }
```

### 3. config.toml

Nowy wpis:
```text
[functions.sovra-weekly-report]
verify_jwt = false
```

### 4. Hook -- useSovraReportConfig.ts

```text
Type SovraReportConfig:
{
  id: string
  enabled: boolean
  frequency: 'daily' | 'weekly'
  day_of_week: number
  time_of_day: string
  email_override: string | null
  include_sections: string[]
  last_sent_at: string | null
}

A) useReportConfig():
   - queryKey: ['sovra-report-config']
   - SELECT * FROM sovra_report_config WHERE director_id = me (via RLS)
   - Zwraca: { config: SovraReportConfig | null, isLoading }

B) useSaveReportConfig():
   - Mutation: UPSERT sovra_report_config
   - Potrzebuje tenant_id i director_id z useAuth()
   - onConflict: (tenant_id, director_id)
   - onSuccess: invalidate + showToast.success

C) usePreviewReport():
   - Mutation: fetch sovra-weekly-report Edge Function z JWT
   - Zwraca: { preview_html: string }
   - Brak toast na success -- otwieramy modal z previewem
```

### 5. SovraReportSettings.tsx

Komponent Card w zakladce Integracje (pod GoogleCalendarSettings):

```text
A) Header: "Raporty Sovry" + Switch (enabled/disabled)

B) Gdy disabled:
   - Info text: "Wlacz automatyczne raporty email z podsumowaniem Twojej aktywnosci."
   - Switch ON -> upsert config z enabled=true + domyslne wartosci

C) Gdy enabled -- formularz:
   - Frequency: dwa radio buttony w ramkach
     - "Tygodniowo" + "Raport co tydzien w wybrany dzien"
     - "Codziennie" + "Raport kazdego dnia rano"
     - Aktywny: border-primary bg-primary/5

   - Day of week (tylko gdy weekly):
     - Select: Poniedzialek(1) ... Niedziela(0)
     - Domyslnie: Poniedzialek

   - Time: Input type="time" defaultValue="08:00"
     - Helper: "Raport bedzie wysylany okolo tej godziny"

   - Email override: Input z placeholder={director.email}
     - Helper: "Domyslnie na Twoj email. Wpisz inny jesli chcesz wyslac gdzie indziej."

   - Sekcje: Checkboxes
     - "Podsumowanie AI" -- checked, disabled (zawsze wlaczone)
     - "Zadania" -- default checked
     - "Projekty" -- default checked
     - "Kontakty" -- default checked
     - "Kalendarz" -- default checked

   - last_sent_at: jesli istnieje -> "Ostatni raport: 3 lut 2026, 08:05"

   - Buttons: "Zapisz" primary + "Podglad raportu" outline z Sparkles icon

D) Podglad: klik -> usePreviewReport() -> open ReportPreviewModal z preview_html
```

### 6. ReportPreviewModal.tsx

```text
- Dialog max-w-2xl
- Header: "Podglad raportu email" + close button
- Body: div z dangerouslySetInnerHTML={{ __html: previewHtml }}
  - max-h-[70vh] overflow-y-auto
  - Bezpieczne: HTML pochodzi z naszego wlasnego Edge Function
- Footer: "Tak bedzie wygladal Twoj raport" text-xs text-muted-foreground
```

### 7. Settings.tsx -- modyfikacja

W zakladce `integrations` (linia 643-645), dodanie pod GoogleCalendarSettings:

```text
<TabsContent value="integrations" className="space-y-6">
  <GoogleCalendarSettings />
  <SovraReportSettings />      {/* NOWE */}
</TabsContent>
```

Import: `import { SovraReportSettings } from '@/components/sovra/SovraReportSettings';`

---

## RESEND_API_KEY

Klucz `RESEND_API_KEY` **nie jest skonfigurowany**. Edge Function obsluguje to gracefully:
- Jesli brak klucza: raport generowany i zapisywany do `sovra_sessions`, ale nie wysylany emailem
- Preview w UI dziala normalnie (nie wymaga Resend)
- Uzytkownik moze pozniej dodac klucz aby wlaczyc wysylke

Jesli chcesz wlaczyc wysylke emailowa, trzeba bedzie skonfigurowac klucz Resend.

## Bezpieczenstwo

- Edge Function: autoryzacja wewnetrzna (service_role LUB JWT) -- brak publicznego dostepu
- RLS na sovra_report_config: tylko wlasny director moze czytac/edytowac swoja konfiguracje
- Filtracja po director_id/tenant_id we wszystkich query -- izolacja danych
- last_sent_at guard: max 1 raport dziennie per director
- dangerouslySetInnerHTML: tylko na HTML z wlasnego Edge Function (bezpieczne)
- Email override: walidacja formatu na froncie (opcjonalna)

## Co NIE zostanie zmienione

- Edge Functions: sovra-chat, sovra-debrief, sovra-morning-session, sovra-reminder-trigger, sovra-suggest-contacts, sovra-generate-embeddings -- bez zmian
- Tabela sovra_reminders, sovra_sessions -- bez zmian schematu
- Istniejace komponenty Settings -- bez zmian (GoogleCalendarSettings zachowany 1:1)
- Inne strony/hooki -- bez zmian

