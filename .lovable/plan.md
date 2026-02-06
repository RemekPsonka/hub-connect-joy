

# Fix: Sovra gubi watek — historia konwersacji z klienta + persistence w DB

## Problem

Sovra traci kontekst rozmowy. Uzytkownik pisze wiadomosc, Sovra odpowiada, uzytkownik kontynuuje — a Sovra zachowuje sie jakby rozmowa dopiero sie zaczynala.

Przyczyna: **race condition** w zapisie sesji. Zapis do DB nastepuje ASYNCHRONICZNIE po zakonczeniu streamu (w bloku `finally`). Jesli uzytkownik wyslal nastepna wiadomosc zanim zapis sie zakonczyl — backend laduje pusta historie z bazy.

## Rozwiazanie

Podejscie hybrydowe — najlepsze z obu swiatow:

1. **Frontend wysyla historie aktywnej rozmowy** w kazdym uzyciu — zero race condition, natychmiastowy kontekst
2. **Baza danych nadal zapisuje** kazda wymiane — persistence dla sidebara, wznawiania sesji, dlugich watkow
3. **Ladowanie z DB** tylko przy wznawianiu starych sesji z sidebara (fallback)

```text
AKTYWNA ROZMOWA (szybka sciezka):
  Frontend: messages[] w useState → wysyla z requestem
  Backend: uzywa history z body → AI ma pelny kontekst
  Baza: zapisuje w tle (persistence)

WZNOWIENIE SESJI (z sidebara):
  Frontend: loadSession(id) → pobiera z DB
  Backend: brak history w body → fallback na DB
```

## Co sie zmieni

| Zmiana | Plik |
|--------|------|
| Wysylanie historii w body requestu | `src/hooks/useSovraChat.ts` |
| Priorytetyzacja historii z klienta | `supabase/functions/sovra-chat/index.ts` |

Tylko 2 pliki. Brak nowych plikow. Brak zmian schematu DB.

---

## Szczegoly techniczne

### 1. Frontend — useSovraChat.ts

W funkcji `sendMessage`, dodanie pola `history` do body requestu:

```text
body: JSON.stringify({
  message: text,
  session_id: sessionId,
  context_type: ...,
  context_id: ...,
  history: messages                         // NOWE POLE
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .filter(m => m.content.trim() !== '')
    .map(m => ({ role: m.role, content: m.content }))
})
```

Filtrowanie:
- Tylko role `user` i `assistant` (pomijamy `tool_results` — to jest UI-only)
- Pomijamy puste wiadomosci (np. placeholder assistant przed streamem)
- Mapujemy do prostego `{role, content}` — bez timestamp, bez actions

### 2. Edge Function — sovra-chat/index.ts

Zmiana w sekcji pobierania historii konwersacji (linia ~627):

```text
// OBECNY KOD (race condition):
const previousMessages = sessionId 
  ? await loadConversationHistory(serviceClient, sessionId, directorId) 
  : [];

// NOWY KOD (priorytet klienta):
const history = body.history as Array<{ role: string; content: string }> | undefined;

let previousMessages: ChatMessage[] = [];

if (Array.isArray(history) && history.length > 0) {
  // Sciezka 1: Historia z klienta (aktywna rozmowa — zero race condition)
  previousMessages = history
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-MAX_HISTORY_MESSAGES)
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
} else if (sessionId) {
  // Sciezka 2: Fallback z DB (wznowienie sesji z sidebara)
  previousMessages = await loadConversationHistory(serviceClient, sessionId, directorId);
}
```

Logika:
- Jesli frontend przeslal `history` (tablica z elementami) — uzyj bezposrednio
- Jesli nie ma `history` ale jest `session_id` — zaladuj z DB (wznowienie starej sesji)
- Limit: ostatnie 20 wiadomosci (`MAX_HISTORY_MESSAGES`) — bez zmian
- Filtrowanie rol na backendzie (tylko user/assistant) — ochrona przed prompt injection

### Co NIE zmienia sie

- Caly zapis sesji do DB (`finally` block) — nadal dziala identycznie jako persistence
- `loadConversationHistory()` — zostaje jako fallback
- `loadSession()` na froncie — nadal laduje z DB (dla sidebara)
- Tool calling, context fetching, streaming — bez zmian
- Rate limiting — bez zmian
- Inne Edge Functions — bez zmian
- Inne komponenty Sovra — bez zmian

## Bezpieczenstwo

- Historia przesylana w autoryzowanym HTTPS request (Bearer token)
- Backend filtruje role do user/assistant (ignoruje system/tool/inne)
- Limit 20 wiadomosci w kontekscie AI (istniejacy MAX_HISTORY_MESSAGES)
- Rate limit 10/min bez zmian
- Brak mozliwosci wstrzykniecia system promptu — role walidowane na backendzie

