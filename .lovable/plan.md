
# Plan Implementacji: AI Remek — Asystent Systemowy

## 1. Przegląd projektu

**Cel:** Stworzenie wbudowanego asystenta AI o imieniu "Remek", który pomoże użytkownikom poruszać się po systemie CRM. Remek będzie znał całą architekturę systemu i będzie odpowiadał na pytania typu "jak coś zrobić", "gdzie to jest", "co oznacza ten błąd".

**Różnica Remek vs AI Chat:**
- **AI Chat** (istniejący) — analizuje DANE użytkownika (kontakty, firmy, potrzeby)
- **AI Remek** (nowy) — pomaga z SYSTEMEM (instrukcje, nawigacja, troubleshooting)

---

## 2. Architektura rozwiązania

```text
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
├─────────────────────────────────────────────────────────────────┤
│  RemekChatWidget (floating button + chat panel)                 │
│       ↓ useRemekChat hook                                       │
│       ↓ React Query (cache)                                     │
│  RemekBugReportModal (enhanced bug reporting)                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTP POST
┌─────────────────────────────────────────────────────────────────┐
│                    EDGE FUNCTION: remek-chat                    │
├─────────────────────────────────────────────────────────────────┤
│  1. Autoryzacja (verifyAuth)                                    │
│  2. Wyszukiwanie w remek_knowledge_base                         │
│  3. Pobranie historii z remek_conversations                     │
│  4. Wywołanie Lovable AI Gateway (Gemini 3 Flash)               │
│  5. Zapis odpowiedzi do remek_conversations                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         BAZA DANYCH                              │
├─────────────────────────────────────────────────────────────────┤
│  remek_knowledge_base — baza wiedzy (20+ artykułów)             │
│  remek_conversations — historia rozmów                          │
│  bug_reports — rozszerzone o kontekst Remka                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Etapy implementacji

### ETAP 1: Baza danych (3 migracje)

#### 1.1 Tabela `remek_knowledge_base`
```sql
CREATE TABLE public.remek_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  category TEXT NOT NULL,  -- 'module', 'feature', 'howto', 'faq', 'troubleshooting', 'glossary'
  module TEXT,             -- 'contacts', 'companies', 'consultations', itp.
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  related_articles UUID[] DEFAULT '{}',
  sort_order INT DEFAULT 0,
  is_global BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indeksy dla wydajnego wyszukiwania
CREATE INDEX idx_remek_kb_category ON remek_knowledge_base(category);
CREATE INDEX idx_remek_kb_module ON remek_knowledge_base(module);
CREATE INDEX idx_remek_kb_keywords ON remek_knowledge_base USING GIN(keywords);
CREATE INDEX idx_remek_kb_tenant ON remek_knowledge_base(tenant_id);

-- Full-text search na content
ALTER TABLE remek_knowledge_base ADD COLUMN fts tsvector 
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content,''))) STORED;
CREATE INDEX idx_remek_kb_fts ON remek_knowledge_base USING GIN(fts);

-- RLS
ALTER TABLE remek_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "remek_kb_read" ON remek_knowledge_base
  FOR SELECT USING (is_global = true OR tenant_id = get_current_tenant_id());
  
CREATE POLICY "remek_kb_admin_write" ON remek_knowledge_base
  FOR ALL USING (is_superadmin() OR is_tenant_admin(auth.uid(), tenant_id));
```

#### 1.2 Tabela `remek_conversations`
```sql
CREATE TABLE public.remek_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  director_id UUID,
  assistant_id UUID,
  session_id UUID NOT NULL DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  message TEXT NOT NULL,
  context JSONB DEFAULT '{}',  -- { module, page_url, contact_id, company_id }
  helpful_rating SMALLINT CHECK (helpful_rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_remek_conv_session ON remek_conversations(session_id);
CREATE INDEX idx_remek_conv_director ON remek_conversations(director_id);
CREATE INDEX idx_remek_conv_tenant ON remek_conversations(tenant_id);
CREATE INDEX idx_remek_conv_created ON remek_conversations(created_at DESC);

ALTER TABLE remek_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "remek_conv_own" ON remek_conversations
  FOR ALL USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
```

#### 1.3 Rozszerzenie tabeli `bug_reports`
```sql
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS remek_session_id UUID;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS remek_conversation_snapshot JSONB DEFAULT '[]';
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS current_page_url TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS user_context JSONB DEFAULT '{}';

-- Indeks dla powiązania z Remkiem
CREATE INDEX IF NOT EXISTS idx_bug_reports_remek_session ON bug_reports(remek_session_id);
```

---

### ETAP 2: Edge Function `remek-chat`

**Lokalizacja:** `supabase/functions/remek-chat/index.ts`

**Logika:**
1. Walidacja autoryzacji (reużycie `verifyAuth` z `_shared/auth.ts`)
2. Odbieranie request: `{ message, sessionId, context: { module, pageUrl, contactId?, companyId? } }`
3. Wyszukiwanie w knowledge_base:
   - Po keywords (array overlap: `keywords && ARRAY[...]`)
   - Po module (jeśli podany w context)
   - Po FTS w content (`fts @@ plainto_tsquery(...)`)
4. Pobranie historii (ostatnie 10 wiadomości z sesji)
5. Budowanie system prompt z:
   - Persona Remka (przyjazny, polski, konkretny)
   - Pełna wiedza o modułach systemu
   - Znalezione artykuły jako dodatkowy kontekst
   - Informacje o znanych problemach
6. Wywołanie Lovable AI Gateway (`google/gemini-3-flash-preview`)
7. Zapis do `remek_conversations`
8. Zwrot: `{ message, sessionId, suggestedArticles?, canReportBug: true }`

**Konfiguracja:** Dodanie do `supabase/config.toml`:
```toml
[functions.remek-chat]
verify_jwt = false
```

---

### ETAP 3: Komponenty Frontend

#### 3.1 Hook `useRemekChat` 
**Lokalizacja:** `src/hooks/useRemekChat.ts`

```typescript
interface UseRemekChatReturn {
  sessionId: string;
  messages: RemekMessage[];
  isLoading: boolean;
  sendMessage: (text: string) => Promise<void>;
  reportBug: () => void;
  currentModule: string | null;
  clearSession: () => void;
  rateMessage: (messageId: string, rating: number) => void;
  isReportModalOpen: boolean;
  setReportModalOpen: (open: boolean) => void;
}
```

Funkcjonalność:
- Zarządzanie `sessionId` w localStorage
- Auto-detekcja modułu z `useLocation()`
- React Query dla cache'owania
- Streaming odpowiedzi (jeśli Edge Function to wspiera)

#### 3.2 Komponent `RemekChatWidget`
**Lokalizacja:** `src/components/remek/RemekChatWidget.tsx`

Elementy UI:
- **Floating button** (prawy dolny róg, nad ReportBugButton)
  - Ikona: `MessageCircleQuestion` lub custom robot emoji
  - Badge z "NEW" dla nowych użytkowników
- **Panel czatu** (slide-up z dołu lub modal):
  - Header: "🤖 AI Remek — Asystent Systemu" + przycisk zamknij
  - Obszar wiadomości (ScrollArea):
    - User messages: bąbelki po prawej (bg-primary)
    - Remek messages: bąbelki po lewej (bg-muted) + avatar robota
    - Markdown rendering w odpowiedziach
  - Input z przyciskiem Send
  - Szybkie akcje pod inputem:
    - "📋 Jak dodać kontakt?"
    - "🔍 Jak wyszukiwać?"
    - "🐛 Zgłoś problem"

Powitanie kontekstowe (pierwsza wiadomość):
```typescript
const getWelcomeMessage = (module: string | null): string => {
  switch (module) {
    case 'contacts': return "Hej! 📇 Jesteś w module kontaktów...";
    case 'companies': return "Cześć! 🏭 Widzę że przeglądasz firmy...";
    case 'dashboard': return "Cześć! 👋 Widzę że jesteś na dashboardzie...";
    // ... pozostałe moduły
    default: return "Cześć! 🤖 Jestem Remek — Twój asystent systemu...";
  }
};
```

#### 3.3 Komponent `RemekBugReportModal`
**Lokalizacja:** `src/components/remek/RemekBugReportModal.tsx`

Rozszerzenie istniejącego `ReportBugModal` o:
- Auto-wypełnienie:
  - `remek_session_id` z aktywnej sesji
  - `remek_conversation_snapshot` (ostatnie 20 wiadomości jako JSON)
  - `current_page_url` z `window.location.href`
  - `user_context` z hooka
- Wszystkie pola z oryginalnego modala (tytuł, opis, priorytet, screenshot)
- Po zapisie: wiadomość od Remka w czacie potwierdzająca zgłoszenie

---

### ETAP 4: Integracja z AppLayout

**Modyfikacja:** `src/components/layout/AppLayout.tsx`

```tsx
import { RemekChatWidget } from '@/components/remek/RemekChatWidget';

// W renderze, przed ReportBugButton:
<RemekChatWidget />
<ReportBugButton />
```

Widget musi mieć wyższy z-index niż ReportBugButton i być pozycjonowany tak, aby się nie nakładały.

---

### ETAP 5: Seed danych Knowledge Base

**20 artykułów bazowych:**

| # | Kategoria | Moduł | Tytuł |
|---|-----------|-------|-------|
| 1 | howto | contacts | Jak dodać nowy kontakt |
| 2 | howto | contacts | Jak zaimportować kontakty z LinkedIn |
| 3 | howto | search | Jak wyszukać kontakt |
| 4 | howto | companies | Jak dodać firmę |
| 5 | howto | companies | Jak wzbogacić dane firmy (KRS/AI) |
| 6 | howto | consultations | Jak zaplanować konsultację |
| 7 | howto | meetings | Jak utworzyć spotkanie grupowe |
| 8 | howto | contacts | Jak dodać potrzebę lub ofertę |
| 9 | howto | tasks | Jak utworzyć zadanie |
| 10 | howto | settings | Jak włączyć 2FA |
| 11 | faq | dashboard | Co to jest Daily Serendipity? |
| 12 | faq | contacts | Jak działa matching potrzeb i ofert? |
| 13 | faq | ai_chat | Czym różni się AI Chat od AI Remka? |
| 14 | faq | contacts | Jak działa scoring zdrowia relacji? |
| 15 | faq | bi_interviews | Co to jest Business Interview (BI)? |
| 16 | troubleshooting | network | Graf sieci się zawiesza / jest wolny |
| 17 | troubleshooting | settings | Nie mogę zalogować się do systemu |
| 18 | troubleshooting | contacts | Import kontaktów nie działa |
| 19 | troubleshooting | contacts | AI nie generuje profilu kontaktu |
| 20 | troubleshooting | search | Wyszukiwanie nie zwraca wyników |

Każdy artykuł będzie miał:
- Szczegółową treść w Markdown z krokami 1, 2, 3...
- Keywords do wyszukiwania
- `is_global: true` (widoczne dla wszystkich tenantów)

---

## 4. Szczegóły techniczne

### Mapowanie URL → moduł
```typescript
const moduleMap: Record<string, string> = {
  '/': 'dashboard',
  '/contacts': 'contacts',
  '/companies': 'companies',
  '/consultations': 'consultations',
  '/meetings': 'meetings',
  '/tasks': 'tasks',
  '/ai': 'ai_chat',
  '/network': 'network',
  '/search': 'search',
  '/settings': 'settings',
  '/bug-reports': 'bug_reports',
  '/representatives': 'representatives',
  '/pipeline': 'pipeline',
  '/analytics': 'analytics',
  '/matches': 'matches',
};
```

### System prompt dla Remka (skrócony)
```
Jesteś AI Remek — przyjazny asystent systemowy CRM.

Osobowość:
- Mówisz po polsku, per "Ty"
- Cierpliwy, pomocny, konkretny
- Emoji: ✅ ❌ 💡 👉 ⚠️ (umiarkowanie)

Znasz moduły: Kontakty, Firmy, Wywiady BI, Konsultacje, Spotkania, 
Potrzeby/Oferty, Zadania, Ubezpieczenia, AI Chat, Wyszukiwanie, 
Dashboard, Sieć, Ustawienia, Handlowcy, Zgłoszenia błędów.

Zasady:
1. Odpowiadaj po polsku
2. Dawaj KONKRETNE kroki (Krok 1: ..., Krok 2: ...)
3. Podawaj DOKŁADNE ścieżki menu
4. Gdy nie znasz odpowiedzi → proponuj zgłoszenie błędu
5. Podpowiadaj proaktywnie
```

---

## 5. Pliki do utworzenia/modyfikacji

### Nowe pliki:
1. `supabase/functions/remek-chat/index.ts` — Edge Function
2. `src/hooks/useRemekChat.ts` — hook zarządzający czatem
3. `src/components/remek/RemekChatWidget.tsx` — floating widget
4. `src/components/remek/RemekBugReportModal.tsx` — rozszerzony modal zgłoszenia

### Modyfikacje:
1. `src/components/layout/AppLayout.tsx` — dodanie widgetu
2. `src/hooks/useBugReports.ts` — obsługa nowych pól
3. `supabase/config.toml` — konfiguracja nowej Edge Function

---

## 6. Bezpieczeństwo

- **RLS na wszystkich tabelach:** Izolacja tenant_id
- **Autoryzacja Edge Function:** Reużycie sprawdzonego `verifyAuth()`
- **Brak dostępu do danych użytkownika:** Remek odpowiada tylko o systemie
- **Knowledge base globalna:** `is_global = true` dla wszystkich tenantów
- **Rate limiting:** Brak dedykowanego, ale Lovable AI Gateway ma wbudowane limity

---

## 7. Kolejność implementacji

1. **Migracje bazy danych** (3 operacje)
2. **Edge Function remek-chat** 
3. **Hook useRemekChat**
4. **RemekChatWidget** (podstawowa wersja)
5. **RemekBugReportModal**
6. **Integracja z AppLayout**
7. **Seed 20 artykułów knowledge base**
8. **Testy i poprawki**

---

## 8. Szacowany czas implementacji

| Etap | Czas |
|------|------|
| Migracje DB | 5 min |
| Edge Function | 15 min |
| Hook useRemekChat | 10 min |
| RemekChatWidget | 20 min |
| RemekBugReportModal | 10 min |
| Integracja + seed | 10 min |
| **RAZEM** | ~70 min |
