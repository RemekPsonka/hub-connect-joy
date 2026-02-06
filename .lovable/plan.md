

# Inteligentne sugestie kontaktow Sovra — pgvector semantic matching

## Podsumowanie

Dodajemy system sugestii kontaktow oparty o pgvector: Sovra analizuje projekt, generuje embedding, wyszukuje semantycznie podobne kontakty z CRM i podaje rekomendacje z uzasadnieniem AI.

## Krytyczne roznice vs specyfikacja

Istniejacy system juz uzywa pgvector z **1536 wymiarami** (nie 768). 2112 z 2113 kontaktow juz ma embeddingi w kolumnie `profile_embedding`. Nowy kod musi byc z tym spojny — uzywa tych samych wymiarow i istniejacych danych.

| Element | Spec uzytkownika | Rzeczywistosc |
|---------|-----------------|---------------|
| Wymiary wektora | 768 | **1536** (istniejace) |
| Kolumna kontaktow | `embedding` | **`profile_embedding`** (istniejaca) |
| Index kontaktow | IVFFlat do stworzenia | **HNSW juz istnieje** |
| pgvector extension | Do wlaczenia | **Juz wlaczony** |
| Embeddingi kontaktow | Do wygenerowania | **2112/2113 juz gotowe** |
| Model | text-embedding-3-small 768D | **text-embedding-3-small 1536D** (domyslny) |

## Co sie zmieni

| Zmiana | Plik / Zasob |
|--------|-------------|
| Nowa kolumna + funkcja SQL | Migracja DB |
| Nowa Edge Function | `supabase/functions/sovra-suggest-contacts/index.ts` |
| Nowa Edge Function | `supabase/functions/sovra-generate-embeddings/index.ts` |
| Wpisy config | `supabase/config.toml` |
| Nowy hook | `src/hooks/useSovraContactSuggestions.ts` |
| Nowy komponent | `src/components/projects/SovraSuggestionsSection.tsx` |
| Modyfikacja | `src/components/projects/ProjectContactsTab.tsx` |
| Modyfikacja | `supabase/functions/sovra-chat/index.ts` (kontekst sugestii) |

---

## Szczegoly techniczne

### 1. Migracja bazy danych (SQL)

```text
A) Dodanie kolumny embedding do projects:
   ALTER TABLE projects ADD COLUMN IF NOT EXISTS embedding vector(1536);

B) Index HNSW na projektach:
   CREATE INDEX IF NOT EXISTS idx_projects_embedding 
   ON projects USING hnsw (embedding vector_cosine_ops) 
   WITH (m = 16, ef_construction = 64);

C) Funkcja similarity search:
   CREATE OR REPLACE FUNCTION match_contacts_by_project(
     query_embedding vector(1536),     -- 1536D zeby pasowac do profile_embedding
     match_tenant_id uuid,
     match_threshold float DEFAULT 0.6,
     match_count int DEFAULT 10,
     exclude_ids uuid[] DEFAULT '{}'
   )
   RETURNS TABLE (
     id uuid,
     full_name text,
     company text,
     position text,
     similarity float
   )
   LANGUAGE sql STABLE
   AS $$
     SELECT
       c.id,
       c.full_name,
       c.company,
       c.position,
       1 - (c.profile_embedding <=> query_embedding) as similarity
     FROM contacts c
     WHERE c.tenant_id = match_tenant_id
       AND c.profile_embedding IS NOT NULL
       AND c.id != ALL(exclude_ids)
       AND 1 - (c.profile_embedding <=> query_embedding) > match_threshold
     ORDER BY c.profile_embedding <=> query_embedding
     LIMIT match_count;
   $$;
```

Uwaga: Funkcja uzywa `profile_embedding` (istniejaca kolumna 1536D) — NIE `embedding`.

### 2. Edge Function — sovra-generate-embeddings

Generuje embeddingi dla projektow (i opcjonalnie kontaktow bez embeddingu).

```text
A) Autoryzacja: verifyAuth(req) — tylko director
B) Zod: { type: 'contacts' | 'projects' | 'single', record_id?: uuid }
C) Dla type='projects':
   - SELECT id, name, description, status FROM projects 
     WHERE tenant_id = X AND embedding IS NULL LIMIT 50
   - Dla kazdego: zbuduj tekst z name, description, status
   - Pobierz tez nazwy kontaktow z project_contacts
   - Batch call OpenAI text-embedding-3-small (1536D — domyslny bez parametru dimensions)
   - UPDATE projects SET embedding = vector WHERE id = X
D) Dla type='contacts':
   - SELECT id FROM contacts WHERE tenant_id = X AND profile_embedding IS NULL LIMIT 50
   - Dla kazdego wywolaj istniejacy generate-embedding (reuse logiki)
   - LUB zbuduj tekst i batch call OpenAI (jak dla projektow)
E) Dla type='single':
   - record_id wymagane
   - Wykryj czy to projekt (sprawdz w projects) czy kontakt
   - Wygeneruj i zapisz embedding
F) Rate limit: Upstash slidingWindow(5, '1m')
G) Response: { processed: number, type: string }
```

### 3. Edge Function — sovra-suggest-contacts

```text
A) Autoryzacja: verifyAuth(req) — tylko director
B) Rate limit: slidingWindow(10, '1m')
C) Zod: { project_id: uuid, limit: int 1-20 default 5 }
D) Pobierz projekt:
   - SELECT id, name, description, embedding FROM projects WHERE id = X AND tenant_id = Y
   - Pobierz istniejace kontakty: SELECT contact_id FROM project_contacts WHERE project_id = X
E) Jesli projekt nie ma embedding:
   - Zbuduj tekst: name + description + status + nazwy kontaktow
   - Call OpenAI text-embedding-3-small (1536D)
   - UPDATE projects SET embedding = vector
F) Wywolaj match_contacts_by_project(embedding, tenant_id, 0.6, limit, exclude_ids)
G) Jesli wyniki > 0, wzbogac z Lovable AI (gemini-2.5-flash):
   - System prompt: "Dla kazdego kontaktu napisz 1 zdanie po polsku DLACZEGO ta osoba 
     moze byc wartosciowa dla projektu. Odpowiedz JSON: [{contact_id, reason}]"
   - Jesli AI call fail → zwroc sugestie BEZ reasons (graceful fallback)
H) Merge reasons z similarity scores
I) Response: {
     project_id, 
     suggestions: [{ contact_id, full_name, company, position, similarity, reason }]
   }
```

### 4. config.toml — nowe wpisy

```text
[functions.sovra-generate-embeddings]
verify_jwt = false

[functions.sovra-suggest-contacts]
verify_jwt = false
```

verify_jwt = false bo autoryzacja wewnetrzna (verifyAuth).

### 5. Hook — useSovraContactSuggestions.ts

```text
Type ContactSuggestion:
{
  contact_id: string
  full_name: string
  company: string | null
  position: string | null
  similarity: number
  reason: string | null
}

A) useSuggestContacts(projectId):
   - queryKey: ['sovra-suggestions', projectId]
   - enabled: !!projectId
   - staleTime: 10 * 60 * 1000 (10 min cache)
   - queryFn: invoke sovra-suggest-contacts edge function
   - Zwraca: { suggestions, isLoading, error, refetch }

B) useAddSuggestedContact():
   - Reuse istniejacego useAddProjectContact z useProjects.ts
   - Po dodaniu: invalidate ['sovra-suggestions', projectId] + ['project-contacts', projectId]
   - role_in_project: 'Sugerowany przez Sovra'

C) useDismissSuggestion():
   - useState<Set<string>> — lokalne dismissed IDs
   - Filtrowanie suggestions bez zapisywania w DB
   - Reset po odmontowaniu komponentu

D) useRegenerateEmbeddings():
   - Mutation: invoke sovra-generate-embeddings z type='projects'
   - onSuccess: invalidate ['sovra-suggestions'] + toast
```

### 6. Komponent — SovraSuggestionsSection.tsx

Sekcja pod lista kontaktow projektu:

```text
A) Divider: Sparkles icon + "Sugestie Sovry" text-sm font-semibold text-violet-600

B) Loading: 3x Skeleton pulse z Sparkles

C) Lista sugestii (max 5):
   - bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-950/20
   - rounded-xl p-4 mb-3 border border-violet-100 dark:border-violet-900/50
   - Avatar z inicjalami
   - full_name + company + position
   - reason (italic, od Sovry)
   - Similarity bar: Progress w-24 h-1.5 bg-violet-500 + "87% dopasowanie"
   - Przyciski: "Dodaj" (primary) + "Pomin" (ghost)

D) Po dodaniu: animacja znikania, kontakt pojawia sie w liscie powyzej

E) Empty state: "Sovra nie znalazla pasujacych kontaktow"

F) Brak embeddingu projektu: 
   - Banner amber z info "Sovra musi przygotowac analize"
   - Button "Przygotuj analize" → useRegenerateEmbeddings()
```

### 7. Modyfikacja ProjectContactsTab.tsx

Dodanie SovraSuggestionsSection pod istniejaca liste kontaktow:

```text
return (
  <>
    <DataCard title="Kontakty projektu (X)">
      {/* istniejaca lista kontaktow — BEZ ZMIAN */}
    </DataCard>
    
    {/* Nowa sekcja sugestii */}
    <SovraSuggestionsSection projectId={projectId} />
  </>
);
```

Takze: obsluzyc przypadek gdy projectContacts jest puste — wyswietl empty state + sugestie pod spodem.

### 8. Modyfikacja sovra-chat (kontekst sugestii)

W `fetchCRMContext`, gdy `contextType === 'project'`:

```text
// Po pobraniu project i projectTasks...
// Dodaj top 3 sugestie kontaktow do specificContext:

const { data: suggestions } = await serviceClient
  .rpc('match_contacts_by_project', {
    query_embedding: project.embedding,   // moze byc null
    match_tenant_id: tenantId,
    match_threshold: 0.65,
    match_count: 3,
    exclude_ids: existingContactIds
  });

if (suggestions?.length > 0) {
  specificContext += `\n\nSUGEROWANE KONTAKTY DLA PROJEKTU:
${suggestions.map(s => `- ${s.full_name} (${s.position || ''} @ ${s.company || ''}) — dopasowanie: ${Math.round(s.similarity * 100)}%`).join('\n')}`;
}
```

Tylko jesli projekt ma embedding. Jesli nie — pomijamy (graceful).

---

## Bezpieczenstwo

- Oba Edge Functions: autoryzacja wewnetrzna (verifyAuth) — tylko zalogowani directorzy
- Wszystkie query filtruja po tenant_id — izolacja danych
- exclude_ids w match function — nie sugeruje kontaktow juz w projekcie
- Rate limit: 10/min suggest, 5/min embeddings (Upstash)
- OpenAI API key i Lovable API key jako env vars — nie hardcoded
- Fallback: jesli AI reasoning fail → sugestie bez reasons (nie blokuje flow)

## Co NIE zostanie zmienione

- Istniejace kontakty i ich profile_embedding (2112 rekordow) — uzywamy ich as-is
- Edge Function generate-embedding — bez zmian (nadal obsluguje pojedyncze kontakty)
- Edge Functions: sovra-chat (minimalna zmiana kontekstu), sovra-debrief, sovra-morning-session, sovra-reminder-trigger — bez zmian (poza kontekstem w chat)
- Istniejacy search_all_hybrid — bez zmian
- Inne strony/hooki/komponenty — bez zmian

