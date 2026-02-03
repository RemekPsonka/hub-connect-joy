-- ============================================
-- TABELA 1: remek_knowledge_base (baza wiedzy)
-- tenant_id nullable dla globalnych artykułów
-- ============================================
CREATE TABLE public.remek_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  module TEXT,
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
CREATE INDEX idx_remek_kb_global ON remek_knowledge_base(is_global) WHERE is_global = true;

-- Full-text search na content
ALTER TABLE remek_knowledge_base ADD COLUMN fts tsvector 
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content,''))) STORED;
CREATE INDEX idx_remek_kb_fts ON remek_knowledge_base USING GIN(fts);

-- RLS
ALTER TABLE remek_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "remek_kb_read" ON remek_knowledge_base
  FOR SELECT USING (is_global = true OR tenant_id = get_current_tenant_id());
  
CREATE POLICY "remek_kb_admin_write" ON remek_knowledge_base
  FOR ALL USING (is_superadmin() OR (tenant_id IS NOT NULL AND is_tenant_admin(auth.uid(), tenant_id)));

-- Trigger dla updated_at
CREATE TRIGGER update_remek_kb_updated_at
  BEFORE UPDATE ON remek_knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABELA 2: remek_conversations (historia czatu)
-- ============================================
CREATE TABLE public.remek_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  director_id UUID REFERENCES public.directors(id) ON DELETE SET NULL,
  assistant_id UUID REFERENCES public.assistants(id) ON DELETE SET NULL,
  session_id UUID NOT NULL DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  message TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  helpful_rating SMALLINT CHECK (helpful_rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_remek_conv_session ON remek_conversations(session_id);
CREATE INDEX idx_remek_conv_director ON remek_conversations(director_id);
CREATE INDEX idx_remek_conv_assistant ON remek_conversations(assistant_id);
CREATE INDEX idx_remek_conv_tenant ON remek_conversations(tenant_id);
CREATE INDEX idx_remek_conv_created ON remek_conversations(created_at DESC);

ALTER TABLE remek_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "remek_conv_own" ON remek_conversations
  FOR ALL USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- ============================================
-- ROZSZERZENIE TABELI bug_reports
-- ============================================
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS remek_session_id UUID;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS remek_conversation_snapshot JSONB DEFAULT '[]';
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS user_context JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_bug_reports_remek_session ON bug_reports(remek_session_id);

-- ============================================
-- SEED: 20 artykułów globalnych (tenant_id = NULL)
-- ============================================
INSERT INTO remek_knowledge_base (tenant_id, category, module, title, content, keywords, is_global, sort_order) VALUES
-- HOWTO articles (1-10)
(NULL, 'howto', 'contacts', 'Jak dodać nowy kontakt', 
'## Dodawanie nowego kontaktu

**Krok 1:** Przejdź do menu **Kontakty** w lewym pasku nawigacji.

**Krok 2:** Kliknij przycisk **+ Dodaj kontakt** w prawym górnym rogu.

**Krok 3:** Wypełnij formularz:
- **Imię i nazwisko** (wymagane)
- Email, telefon, firma, stanowisko (opcjonalne)
- Grupa kontaktów (opcjonalne)

**Krok 4:** Kliknij **Zapisz**.

💡 **Wskazówka:** Możesz też szybko dodać kontakt przez import z LinkedIn, CSV lub skan wizytówki!', 
ARRAY['dodać', 'kontakt', 'nowy', 'utworzyć', 'add', 'contact'], true, 1),

(NULL, 'howto', 'contacts', 'Jak zaimportować kontakty z LinkedIn',
'## Import kontaktów z LinkedIn

**Krok 1:** Wyeksportuj kontakty z LinkedIn:
- Wejdź na LinkedIn → Ustawienia → Pobierz dane → Connections

**Krok 2:** W systemie przejdź do **Kontakty** → kliknij **Import** → wybierz **LinkedIn CSV**.

**Krok 3:** Przeciągnij pobrany plik CSV lub kliknij aby wybrać.

**Krok 4:** Sprawdź mapowanie kolumn i potwierdź import.

⚠️ **Uwaga:** LinkedIn może eksportować dane w różnych formatach. Jeśli import nie działa, sprawdź czy plik ma kolumny: First Name, Last Name, Email.',
ARRAY['import', 'linkedin', 'csv', 'zaimportować', 'wczytać'], true, 2),

(NULL, 'howto', 'search', 'Jak wyszukać kontakt',
'## Wyszukiwanie kontaktów

**Szybkie wyszukiwanie (Ctrl+K):**
Naciśnij **Ctrl+K** (lub **⌘K** na Mac) aby otworzyć globalne wyszukiwanie.

**Wyszukiwanie w module Kontakty:**
1. Przejdź do **Kontakty**
2. Użyj pola wyszukiwania u góry listy
3. Możesz szukać po: imieniu, nazwisku, firmie, email, stanowisku

**Wyszukiwanie semantyczne:**
System rozumie synonimy! Wpisując "prezes" znajdziesz też "CEO", "dyrektor zarządzający" itp.

💡 **Wskazówka:** Wyszukiwanie działa hybrydowo — łączy klasyczne dopasowanie tekstu z AI!',
ARRAY['szukać', 'wyszukać', 'znajdź', 'search', 'ctrl+k'], true, 3),

(NULL, 'howto', 'companies', 'Jak dodać firmę',
'## Dodawanie nowej firmy

**Krok 1:** Przejdź do **Firmy** w menu.

**Krok 2:** Kliknij **+ Dodaj firmę**.

**Krok 3:** Wypełnij dane:
- **Nazwa firmy** (wymagane)
- NIP, KRS, REGON (opcjonalne, ale przydatne do enrichmentu)
- Branża, strona WWW, adres

**Krok 4:** Kliknij **Zapisz**.

💡 **Wskazówka:** Jeśli podasz NIP lub KRS, system może automatycznie pobrać dane z rejestrów!',
ARRAY['firma', 'dodać', 'nowa', 'company', 'utworzyć'], true, 4),

(NULL, 'howto', 'companies', 'Jak wzbogacić dane firmy (KRS/AI)',
'## Enrichment danych firmy

**Automatyczny enrichment:**
Po dodaniu firmy z NIP/KRS, kliknij **🔄 Wzbogać dane** aby:
- Pobrać dane z KRS (forma prawna, kapitał, zarząd)
- Przeskanować stronę WWW (AI analizuje ofertę, produkty)
- Pobrać dane finansowe (przychody, zysk za 3 lata)

**Pełna analiza AI:**
Kliknij **🧠 Pełna analiza** aby wygenerować 16-sekcyjny profil firmy:
- Model biznesowy, konkurencja, klienci
- Historia, lokalizacje, certyfikaty
- Potencjał współpracy

⚠️ **Uwaga:** Pełna analiza może trwać 1-2 minuty.',
ARRAY['enrichment', 'wzbogacić', 'krs', 'dane', 'analiza', 'ai'], true, 5),

(NULL, 'howto', 'consultations', 'Jak zaplanować konsultację',
'## Planowanie konsultacji

**Krok 1:** Przejdź do **Konsultacje** w menu.

**Krok 2:** Kliknij **+ Nowa konsultacja**.

**Krok 3:** Wypełnij:
- Wybierz **kontakt** z listy
- Ustaw **datę i godzinę**
- Wybierz typ (wirtualna/stacjonarna)
- Dodaj agendę (opcjonalne)

**Krok 4:** Zapisz.

💡 **Wskazówka:** Przed konsultacją kliknij **Przygotuj brief** — AI wygeneruje podsumowanie kontaktu i sugestie tematów!',
ARRAY['konsultacja', 'spotkanie', 'zaplanować', 'umówić', 'meeting'], true, 6),

(NULL, 'howto', 'meetings', 'Jak utworzyć spotkanie grupowe',
'## Tworzenie spotkania grupowego

**Krok 1:** Przejdź do **Spotkania** w menu.

**Krok 2:** Kliknij **+ Nowe spotkanie**.

**Krok 3:** Wypełnij szczegóły:
- Nazwa spotkania
- Data, godzina, lokalizacja
- Opis/agenda

**Krok 4:** Dodaj uczestników:
- Kliknij **Dodaj uczestnika**
- Wybierz kontakty z listy lub wpisz dane gości

**Krok 5:** Zapisz.

💡 **Wskazówka:** Po spotkaniu AI może wygenerować rekomendacje "kogo z kim połączyć" na podstawie profili uczestników!',
ARRAY['spotkanie', 'grupowe', 'meeting', 'event', 'wydarzenie'], true, 7),

(NULL, 'howto', 'contacts', 'Jak dodać potrzebę lub ofertę',
'## Dodawanie potrzeb i ofert

**Krok 1:** Otwórz profil kontaktu.

**Krok 2:** Przejdź do zakładki **Potrzeby & Oferty**.

**Krok 3:** Kliknij **+ Potrzeba** lub **+ Oferta**.

**Krok 4:** Wypełnij:
- **Tytuł** (krótki opis)
- **Opis szczegółowy**
- Kategoria, priorytet, termin (opcjonalne)

**Krok 5:** Zapisz.

💡 **Wskazówka:** System automatycznie dopasowuje potrzeby do ofert innych kontaktów! Sprawdź stronę **Dopasowania** aby zobaczyć propozycje.',
ARRAY['potrzeba', 'oferta', 'need', 'offer', 'dopasowanie', 'matching'], true, 8),

(NULL, 'howto', 'tasks', 'Jak utworzyć zadanie',
'## Tworzenie zadań

**Krok 1:** Przejdź do **Zadania** w menu.

**Krok 2:** Kliknij **+ Nowe zadanie**.

**Krok 3:** Wypełnij:
- **Tytuł** (wymagane)
- Opis, termin, priorytet
- Kategoria (np. Follow-up, Spotkanie, Research)
- Powiązane kontakty (opcjonalne)

**Krok 4:** Zapisz.

💡 **Wskazówka:** AI też tworzy zadania! W AI Chat możesz poprosić "utwórz zadanie follow-up z Janem Kowalskim" i agent to zrobi.',
ARRAY['zadanie', 'task', 'utworzyć', 'dodać', 'todo'], true, 9),

(NULL, 'howto', 'settings', 'Jak włączyć 2FA',
'## Włączanie uwierzytelniania dwuskładnikowego (2FA)

**Krok 1:** Przejdź do **Ustawienia** → **Bezpieczeństwo**.

**Krok 2:** Kliknij **Włącz 2FA**.

**Krok 3:** Zeskanuj kod QR aplikacją authenticator (np. Google Authenticator, Authy).

**Krok 4:** Wpisz 6-cyfrowy kod z aplikacji aby potwierdzić.

**Krok 5:** Zapisz kody zapasowe w bezpiecznym miejscu!

⚠️ **Ważne:** Po włączeniu 2FA będziesz musiał podawać kod przy każdym logowaniu.',
ARRAY['2fa', 'mfa', 'bezpieczeństwo', 'authenticator', 'weryfikacja'], true, 10),

-- FAQ articles (11-15)
(NULL, 'faq', 'dashboard', 'Co to jest Daily Serendipity?',
'## Daily Serendipity — Codzienne odkrycia AI

**Daily Serendipity** to funkcja AI, która codziennie analizuje Twoją sieć kontaktów i proponuje:

- 🤝 **Potencjalne połączenia** — osoby które mogłyby się znać
- 💡 **Nieoczywiste podobieństwa** — wspólne zainteresowania, branże
- 📅 **Przypomnienia o kontaktach** — osoby z którymi dawno nie rozmawiałeś

**Gdzie to znajdę?**
Na dashboardzie, w sekcji "Daily Serendipity" po prawej stronie.

💡 Serendipity to "szczęśliwy przypadek" — AI pomaga odkryć połączenia których sam byś nie zauważył!',
ARRAY['serendipity', 'daily', 'odkrycia', 'ai', 'rekomendacje'], true, 11),

(NULL, 'faq', 'contacts', 'Jak działa matching potrzeb i ofert?',
'## System dopasowań (Matching)

System automatycznie łączy **potrzeby** jednych kontaktów z **ofertami** innych.

**Jak to działa:**
1. AI analizuje treść potrzeby i oferty
2. Tworzy "embeddingi" — matematyczne reprezentacje znaczenia
3. Porównuje podobieństwo semantyczne (nie tylko słowa kluczowe!)
4. Wyświetla dopasowania z wynikiem podobieństwa (0-100%)

**Gdzie to zobaczyć:**
Przejdź do **Dopasowania** w menu — zobaczysz wszystkie propozycje.

💡 **Przykład:** Potrzeba "szukam dostawcy usług IT" dopasuje się do oferty "świadczymy outsourcing IT" mimo różnych słów!',
ARRAY['matching', 'dopasowanie', 'potrzeby', 'oferty', 'podobieństwo'], true, 12),

(NULL, 'faq', 'ai_chat', 'Czym różni się AI Chat od AI Remka?',
'## AI Chat vs AI Remek

**AI Chat (Master Agent):**
- Analizuje **Twoje DANE** — kontakty, firmy, potrzeby, oferty
- Odpowiada na pytania typu "kto w mojej sieci zna się na IT?"
- Może wykonywać akcje: tworzyć zadania, notatki, potrzeby

**AI Remek (ja! 🤖):**
- Pomaga z **SYSTEMEM** — jak coś zrobić, gdzie to jest
- Odpowiada na pytania typu "jak dodać kontakt?"
- Nie ma dostępu do Twoich danych, zna tylko instrukcje systemu

**Podsumowanie:**
- Pytania o DANE → idź do AI Chat
- Pytania o SYSTEM → pytaj mnie (Remka)!',
ARRAY['remek', 'chat', 'ai', 'różnica', 'agent', 'master'], true, 13),

(NULL, 'faq', 'contacts', 'Jak działa scoring zdrowia relacji?',
'## Relationship Health Score

**Scoring zdrowia relacji** to automatyczna ocena (0-100) jakości Twojej relacji z kontaktem.

**Co wpływa na wynik:**
- ✅ Częstotliwość kontaktów (spotkania, konsultacje)
- ✅ Aktywność (notatki, zadania, wymiana potrzeb/ofert)
- ✅ Czas od ostatniego kontaktu
- ✅ Kompletność profilu

**Interpretacja:**
- 🟢 80-100: Silna, aktywna relacja
- 🟡 50-79: Relacja wymaga odświeżenia
- 🔴 0-49: Relacja zaniedbana

**Gdzie to zobaczyć:**
W profilu kontaktu, obok avatara, jako kolorowy wskaźnik.',
ARRAY['scoring', 'relacja', 'health', 'zdrowie', 'relationship'], true, 14),

(NULL, 'faq', 'bi_interviews', 'Co to jest Business Interview (BI)?',
'## Business Interview — Wywiad biznesowy

**Business Interview** to ustrukturyzowany formularz do zbierania informacji o kontakcie.

**Co zawiera:**
- Podstawowe dane (rola, decyzyjność)
- Profil firmy (skala, branża, wyzwania)
- Cele i potrzeby biznesowe
- Wartość dla organizacji
- Zaangażowanie w networking

**Jak przeprowadzić:**
1. Otwórz profil kontaktu
2. Przejdź do zakładki **Wywiad BI**
3. Wypełniaj sekcje lub użyj **AI Interview** — agent przeprowadzi wywiad w formie czatu

💡 **Wskazówka:** AI na podstawie wywiadu automatycznie wygeneruje propozycje zadań, połączeń i brakujących informacji!',
ARRAY['bi', 'interview', 'wywiad', 'biznesowy', 'formularz'], true, 15),

-- Troubleshooting articles (16-20)
(NULL, 'troubleshooting', 'network', 'Graf sieci się zawiesza / jest wolny',
'## Problem: Graf sieci działa wolno

**Przyczyna:**
Wizualizacja grafu (Sigma.js) może być wolna przy dużej liczbie kontaktów (>500 węzłów).

**Rozwiązania:**

1. **Filtruj widok:**
   - Użyj filtrów aby pokazać tylko wybraną grupę kontaktów
   - Ogranicz głębokość połączeń

2. **Wyłącz animacje:**
   - W ustawieniach grafu wyłącz "Auto-layout"

3. **Użyj innej przeglądarki:**
   - Chrome/Edge działają najszybciej
   - Safari może być wolniejszy

⚠️ **Znane ograniczenie:** Przy >1000 kontaktów graf może być bardzo wolny. Pracujemy nad optymalizacją.',
ARRAY['graf', 'sieć', 'wolny', 'zawiesza', 'network', 'sigma'], true, 16),

(NULL, 'troubleshooting', 'settings', 'Nie mogę zalogować się do systemu',
'## Problem: Nie mogę się zalogować

**Sprawdź kolejno:**

1. **Caps Lock:**
   - Upewnij się że Caps Lock jest wyłączony

2. **Poprawny email:**
   - Sprawdź czy nie ma literówki w adresie email

3. **Reset hasła:**
   - Kliknij "Zapomniałem hasła" i zresetuj przez email
   - ⚠️ Link ważny 1 godzinę!

4. **2FA:**
   - Jeśli masz włączone 2FA, upewnij się że wpisujesz aktualny kod

5. **Konto zablokowane:**
   - Po 5 nieudanych próbach konto może być tymczasowo zablokowane
   - Poczekaj 15 minut lub skontaktuj się z administratorem

❌ **Nadal nie działa?** Zgłoś problem przez formularz — dołącz dokładny komunikat błędu.',
ARRAY['logowanie', 'login', 'hasło', 'password', 'błąd', 'nie działa'], true, 17),

(NULL, 'troubleshooting', 'contacts', 'Import kontaktów nie działa',
'## Problem: Import kontaktów nie działa

**Sprawdź format pliku:**

1. **CSV z LinkedIn:**
   - Musi zawierać kolumny: First Name, Last Name
   - Kodowanie: UTF-8

2. **Własny CSV:**
   - Pierwsza linia = nagłówki kolumn
   - Separatory: przecinek (,) lub średnik (;)
   - Kodowanie: UTF-8 (bez BOM)

3. **Mapowanie kolumn:**
   - Sprawdź czy kolumny zostały prawidłowo zmapowane
   - "First Name" → Imię, "Last Name" → Nazwisko

**Rozwiązania:**
- Otwórz CSV w Excelu i zapisz jako "CSV UTF-8"
- Sprawdź czy nie ma pustych wierszy na końcu pliku
- Ogranicz import do max 500 kontaktów naraz

❌ **Nadal nie działa?** Zgłoś problem i dołącz fragment pliku CSV.',
ARRAY['import', 'csv', 'nie działa', 'błąd', 'kontakty', 'linkedin'], true, 18),

(NULL, 'troubleshooting', 'contacts', 'AI nie generuje profilu kontaktu',
'## Problem: AI nie generuje profilu

**Możliwe przyczyny:**

1. **Brak danych:**
   - Profil AI wymaga minimum: imię, nazwisko + (email LUB firma LUB LinkedIn)
   - Dodaj więcej informacji do kontaktu

2. **Timeout:**
   - Generowanie może trwać do 60 sekund
   - Poczekaj i odśwież stronę

3. **Brak połączenia:**
   - Sprawdź połączenie internetowe
   - Spróbuj ponownie za chwilę

4. **Limit API:**
   - Przy dużej liczbie żądań może wystąpić kolejka
   - Spróbuj ponownie za kilka minut

**Rozwiązanie:**
Kliknij ponownie **Generuj profil AI** — powinno zadziałać przy drugiej próbie.',
ARRAY['profil', 'ai', 'generowanie', 'nie działa', 'błąd'], true, 19),

(NULL, 'troubleshooting', 'search', 'Wyszukiwanie nie zwraca wyników',
'## Problem: Wyszukiwanie nic nie znajduje

**Sprawdź:**

1. **Literówki:**
   - Upewnij się że szukana fraza jest poprawna

2. **Zbyt szczegółowe zapytanie:**
   - Spróbuj krótszego zapytania
   - "Jan Kowalski IT Warszawa" → "Kowalski"

3. **Filtry:**
   - Sprawdź czy nie masz aktywnych filtrów ograniczających wyniki

4. **Indeksowanie:**
   - Nowo dodane kontakty mogą potrzebować chwili na indeksację
   - Poczekaj 1-2 minuty i spróbuj ponownie

5. **Semantyka:**
   - Wyszukiwanie rozumie synonimy
   - Zamiast "CEO" spróbuj "prezes" lub "dyrektor zarządzający"

💡 **Wskazówka:** Użyj globalnego wyszukiwania (Ctrl+K) — przeszukuje kontakty, potrzeby i oferty jednocześnie.',
ARRAY['wyszukiwanie', 'search', 'nie znajduje', 'brak wyników', 'szukanie'], true, 20);