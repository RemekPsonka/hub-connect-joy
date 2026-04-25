// ODPRAWA-03 Faza D1 — useAILiveContext
// SSE streaming z /functions/v1/live-copilot, parser na 3 sekcje (## Kontekst /
// ## Sugerowana akcja / ## Pytania wspierające). Read-only, brak tool callingu write.

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AILiveContextState {
  context: string;
  action: string;
  questions: string;
  isStreaming: boolean;
  error: Error | null;
}

interface Args {
  sessionId: string | null;
  contactId: string | null;
  dealTeamContactId: string | null;
  enabled?: boolean;
}

const SECTION_HEADERS = {
  context: "## Kontekst",
  action: "## Sugerowana akcja",
  questions: "## Pytania wspierające",
} as const;

function parseSections(full: string): { context: string; action: string; questions: string } {
  const idxC = full.indexOf(SECTION_HEADERS.context);
  const idxA = full.indexOf(SECTION_HEADERS.action);
  const idxQ = full.indexOf(SECTION_HEADERS.questions);

  const slice = (start: number, end: number) =>
    start < 0 ? "" : full.slice(start, end < 0 ? undefined : end).trim();

  return {
    context: slice(idxC, idxA >= 0 ? idxA : idxQ).replace(SECTION_HEADERS.context, "").trim(),
    action: slice(idxA, idxQ).replace(SECTION_HEADERS.action, "").trim(),
    questions: slice(idxQ, -1).replace(SECTION_HEADERS.questions, "").trim(),
  };
}

export function useAILiveContext({
  sessionId,
  contactId,
  dealTeamContactId,
  enabled = true,
}: Args): AILiveContextState {
  const [state, setState] = useState<AILiveContextState>({
    context: "",
    action: "",
    questions: "",
    isStreaming: false,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    if (!enabled || !sessionId || !contactId || !dealTeamContactId) {
      setState({ context: "", action: "", questions: "", isStreaming: false, error: null });
      return;
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState({ context: "", action: "", questions: "", isStreaming: true, error: null });

    let cancelled = false;
    let full = "";

    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) throw new Error("Brak sesji użytkownika");

        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/live-copilot`;
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sessionId, contactId, dealTeamContactId }),
          signal: ctrl.signal,
        });

        if (resp.status === 429) {
          toast.error("Limit zapytań AI — spróbuj za chwilę");
          throw new Error("Rate limited");
        }
        if (resp.status === 402) {
          toast.error("Wyczerpany kredyt AI w workspace");
          throw new Error("Payment required");
        }
        if (!resp.ok || !resp.body) {
          const text = await resp.text().catch(() => "");
          throw new Error(`live-copilot ${resp.status}: ${text.slice(0, 120)}`);
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, nl);
            buffer = buffer.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload);
              const delta = parsed?.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta) {
                full += delta;
                const sections = parseSections(full);
                setState((prev) => ({ ...prev, ...sections }));
              }
            } catch {
              // partial JSON across chunks — re-buffer
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }

        if (!cancelled) {
          setState((prev) => ({ ...prev, isStreaming: false }));
        }
      } catch (e) {
        if (cancelled || (e as Error).name === "AbortError") return;
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          error: e instanceof Error ? e : new Error(String(e)),
        }));
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [sessionId, contactId, dealTeamContactId, enabled]);

  return state;
}