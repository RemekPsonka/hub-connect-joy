// Sprint 05 — Sovra tool definitions + execution
// 11 tools: 5 read (RPC), 4 write (pending_action), 2 stub (pending_action + integration_ready=false)

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export interface ToolContext {
  tenantId: string;
  actorId: string; // director.id
  conversationId: string;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// Tool registry — wysyłane do LLM gateway
export const TOOLS: ToolDefinition[] = [
  // ============ READ TOOLS ============
  {
    type: 'function',
    function: {
      name: 'search_contacts',
      description: 'Wyszukuje kontakty w bazie po nazwisku, e-mailu, fragmencie tekstu. Użyj zawsze gdy Remek pyta o konkretną osobę.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Tekst do wyszukania (nazwisko, fragment imienia, fragment e-maila)' },
          company_id: { type: 'string', description: 'Opcjonalny filtr po ID firmy' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_companies',
      description: 'Wyszukuje firmy po nazwie lub numerze NIP.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Nazwa firmy lub NIP (10 cyfr)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_deals',
      description: 'Wyszukuje szanse sprzedaży (deal_team_contacts) z filtrami. Użyj gdy Remek pyta o lejek, status szans, najbliższe akcje.',
      parameters: {
        type: 'object',
        properties: {
          team_id: { type: 'string', description: 'ID zespołu sprzedażowego' },
          status: { type: 'string', description: 'Status szansy (np. active, won, lost, postponed)' },
          category: { type: 'string', description: 'Kategoria/etap lejka' },
          contact_id: { type: 'string', description: 'ID konkretnego kontaktu' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_contact_details',
      description: 'Pobiera pełne szczegóły kontaktu wraz z firmą i powiązanymi szansami sprzedaży. Użyj po znalezieniu kontaktu przez search_contacts.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'UUID kontaktu' },
        },
        required: ['contact_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_pipeline',
      description: 'Analizuje lejek sprzedaży — zwraca podział szans po etapie i statusie.',
      parameters: {
        type: 'object',
        properties: {
          team_id: { type: 'string', description: 'Opcjonalny filtr po zespole sprzedażowym' },
        },
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'search_emails',
      description: 'Wyszukuje wiadomości w skrzynce Gmail (zsynchronizowane). Użyj gdy Remek pyta o e-maile od/do osoby, na temat, ostatnie wiadomości. Read-only, bez potwierdzenia.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Tekst do wyszukania (temat, treść, nadawca). Może być pusty jeśli filtrujesz po contact_id/from.' },
          contact_id: { type: 'string', description: 'Opcjonalny UUID kontaktu — zawęża do wątków powiązanych z tym kontaktem.' },
          from: { type: 'string', description: 'Opcjonalny fragment adresu nadawcy.' },
          since_days: { type: 'number', description: 'Ile dni wstecz (domyślnie 30).' },
          limit: { type: 'number', description: 'Max liczba wyników (domyślnie 10, max 50).' },
        },
      },
    },
  },

  // ============ WRITE TOOLS (wymagają potwierdzenia) ============
  {
    type: 'function',
    function: {
      name: 'create_contact',
      description: 'Proponuje utworzenie nowego kontaktu. Wymaga potwierdzenia Remka. Wymagane: full_name. Opcjonalne: e-mail, telefon, firma.',
      parameters: {
        type: 'object',
        properties: {
          full_name: { type: 'string', description: 'Imię i nazwisko' },
          email: { type: 'string' },
          phone: { type: 'string' },
          company: { type: 'string', description: 'Nazwa firmy (tekstowo)' },
          position: { type: 'string', description: 'Stanowisko' },
          notes: { type: 'string', description: 'Krótka notatka kontekstowa' },
        },
        required: ['full_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Proponuje utworzenie zadania powiązanego z konkretnym kontaktem. Wymaga potwierdzenia. Wymaga contact_id.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'UUID kontaktu, do którego zadanie się odnosi (OBOWIĄZKOWE)' },
          title: { type: 'string', description: 'Krótki tytuł zadania' },
          description: { type: 'string' },
          due_date: { type: 'string', description: 'Data w ISO 8601, np. 2026-04-25' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
        required: ['contact_id', 'title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_note',
      description: 'Proponuje dopisanie notatki do kontaktu (append do contacts.notes). Wymaga potwierdzenia.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string' },
          note: { type: 'string', description: 'Treść notatki' },
        },
        required: ['contact_id', 'note'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_deal_stage',
      description: 'Proponuje zmianę etapu (kategorii) szansy sprzedaży. Wymaga potwierdzenia.',
      parameters: {
        type: 'object',
        properties: {
          deal_id: { type: 'string', description: 'UUID rekordu deal_team_contacts' },
          new_category: { type: 'string', description: 'Nowa kategoria/etap lejka' },
          reason: { type: 'string', description: 'Krótkie uzasadnienie' },
        },
        required: ['deal_id', 'new_category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fill_bi_from_notes',
      description: 'Wypełnia ankietę BI 2.0 (contact_bi.answers + ai_summary) na podstawie notatek kontaktu i historii konsultacji. Wymaga potwierdzenia. Wymaga contact_id.',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'UUID kontaktu' },
        },
        required: ['contact_id'],
      },
    },
  },

  // ============ ANALYTICS READ TOOLS (Sprint 06) ============
  {
    type: 'function',
    function: {
      name: 'get_task_analytics',
      description: 'Zwraca statystyki zadań (total, completed, overdue, by_status) w zadanym przedziale czasu. Użyj zawsze gdy Remek pyta o liczby zadań ("ile mam zadań w tym tygodniu", "ile zaległych"). Daty w ISO 8601.',
      parameters: {
        type: 'object',
        properties: {
          range: {
            type: 'object',
            description: 'Zakres czasowy (created_at)',
            properties: {
              from: { type: 'string', description: 'Początek (ISO, inclusive)' },
              to: { type: 'string', description: 'Koniec (ISO, exclusive)' },
            },
            required: ['from', 'to'],
          },
          filters: {
            type: 'object',
            description: 'Opcjonalne filtry',
            properties: {
              assigned_to: { type: 'string', description: 'UUID osoby, do której przypisane' },
              status: { type: 'string', description: 'Status zadania (np. todo, in_progress, done)' },
            },
          },
        },
        required: ['range'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_team_report',
      description: 'Zwraca tygodniowy raport zespołu: liczbę utworzonych szans, odbytych konsultacji i zakończonych zadań. Użyj gdy Remek pyta o tygodniowe podsumowanie pracy zespołu lub własne.',
      parameters: {
        type: 'object',
        properties: {
          week_start: { type: 'string', description: 'Data początku tygodnia (YYYY-MM-DD), poniedziałek.' },
          team_id: { type: 'string', description: 'Opcjonalny UUID zespołu sprzedażowego. Pominięcie = wszystkie zespoły.' },
        },
        required: ['week_start'],
      },
    },
  },

  // ============ INTEGRATION TOOLS ============
  {
    type: 'function',
    function: {
      name: 'draft_email',
      description: 'Tworzy szkic e-maila w Gmailu (Sprint 15). Wymaga potwierdzenia. Wymagane: to, subject, body.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Adres odbiorcy' },
          subject: { type: 'string' },
          body: { type: 'string' },
          cc: { type: 'string' },
          contact_id: { type: 'string', description: 'UUID powiązanego kontaktu (opcjonalne)' },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'Wysyła e-mail przez Gmail (Sprint 15). Wymaga potwierdzenia. Wymagane: to, subject, body.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Adres odbiorcy' },
          subject: { type: 'string' },
          body: { type: 'string' },
          cc: { type: 'string' },
          contact_id: { type: 'string', description: 'UUID powiązanego kontaktu (opcjonalne)' },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_calendar_event',
      description: 'Proponuje utworzenie wydarzenia w kalendarzu (integracja Google Calendar planowana na później). Wymaga potwierdzenia.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          start: { type: 'string', description: 'ISO 8601 datetime' },
          end: { type: 'string', description: 'ISO 8601 datetime' },
          contact_id: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['title', 'start'],
      },
    },
  },
];

const READ_TOOLS = new Set([
  'search_contacts',
  'search_companies',
  'search_deals',
  'get_contact_details',
  'analyze_pipeline',
  'get_task_analytics',
  'get_team_report',
  'search_emails',
]);
// Sprint 14/15: wszystkie integracje są realne.
const STUB_TOOLS = new Set<string>();

export function isReadTool(name: string): boolean {
  return READ_TOOLS.has(name);
}
export function isStubTool(name: string): boolean {
  return STUB_TOOLS.has(name);
}
export function isKnownTool(name: string): boolean {
  return TOOLS.some((t) => t.function.name === name);
}

// ============ EXECUTION ============

export async function executeReadTool(
  name: string,
  args: Record<string, unknown>,
  userClient: SupabaseClient,
): Promise<unknown> {
  switch (name) {
    case 'search_contacts': {
      const q = String(args.query ?? '');
      const filters: Record<string, unknown> = {};
      if (args.company_id) filters.company_id = args.company_id;
      const { data, error } = await userClient.rpc('rpc_sovra_search_contacts', {
        p_query: q,
        p_filters: filters,
      });
      if (error) return { error: error.message };
      return { results: data ?? [] };
    }
    case 'search_companies': {
      const { data, error } = await userClient.rpc('rpc_sovra_search_companies', {
        p_query: String(args.query ?? ''),
        p_filters: {},
      });
      if (error) return { error: error.message };
      return { results: data ?? [] };
    }
    case 'search_deals': {
      const filters: Record<string, unknown> = {};
      for (const k of ['team_id', 'status', 'category', 'contact_id']) {
        if (args[k]) filters[k] = args[k];
      }
      const { data, error } = await userClient.rpc('rpc_sovra_search_deals', { p_filters: filters });
      if (error) return { error: error.message };
      return { results: data ?? [] };
    }
    case 'get_contact_details': {
      const { data, error } = await userClient.rpc('rpc_sovra_get_contact_details', {
        p_contact_id: String(args.contact_id),
      });
      if (error) return { error: error.message };
      return data ?? { error: 'Nie znaleziono kontaktu' };
    }
    case 'analyze_pipeline': {
      const { data, error } = await userClient.rpc('rpc_sovra_analyze_pipeline', {
        p_team_id: args.team_id ? String(args.team_id) : null,
      });
      if (error) return { error: error.message };
      return data ?? {};
    }
    case 'get_task_analytics': {
      const range = (args.range as { from?: string; to?: string }) ?? {};
      if (!range.from || !range.to) return { error: 'range.from i range.to są wymagane' };
      const filters = (args.filters as Record<string, unknown>) ?? {};
      const { data, error } = await userClient.rpc('rpc_task_analytics', {
        p_range: range,
        p_filters: filters,
      });
      if (error) return { error: error.message };
      return data ?? {};
    }
    case 'get_team_report': {
      if (!args.week_start) return { error: 'week_start jest wymagane (YYYY-MM-DD)' };
      const { data, error } = await userClient.rpc('rpc_team_report', {
        p_week_start: String(args.week_start),
        p_team_id: args.team_id ? String(args.team_id) : null,
      });
      if (error) return { error: error.message };
      return data ?? {};
    }
    case 'search_emails': {
      const query = String(args.query ?? '').trim();
      const sinceDays = Math.max(1, Math.min(365, Number(args.since_days ?? 30)));
      const limit = Math.max(1, Math.min(50, Number(args.limit ?? 10)));
      const sinceIso = new Date(Date.now() - sinceDays * 86400_000).toISOString();

      let q = userClient
        .from('gmail_messages')
        .select('id, gmail_message_id, thread_id, "from", "to", subject, body_plain, date, gmail_threads!inner(contact_id, gmail_thread_id)')
        .gte('date', sinceIso)
        .order('date', { ascending: false })
        .limit(limit);

      if (query) q = q.textSearch('fts', query, { type: 'plain', config: 'simple' });
      if (args.contact_id) q = q.eq('gmail_threads.contact_id', String(args.contact_id));
      if (args.from) q = q.ilike('from', `%${String(args.from)}%`);

      const { data, error } = await q;
      if (error) return { error: error.message };
      const results = (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id,
        thread_id: r.thread_id,
        gmail_message_id: r.gmail_message_id,
        from: r.from,
        to: r.to,
        subject: r.subject,
        date: r.date,
        snippet: typeof r.body_plain === 'string' ? r.body_plain.slice(0, 200) : null,
        contact_id: (r.gmail_threads as { contact_id?: string } | null)?.contact_id ?? null,
      }));
      return { results };
    }
  }
}

export function humanSummary(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case 'create_contact':
      return `Utworzę kontakt: ${args.full_name ?? '?'}${args.email ? ` (${args.email})` : ''}${args.company ? `, firma: ${args.company}` : ''}.`;
    case 'create_task':
      return `Utworzę zadanie: "${args.title ?? '?'}"${args.due_date ? ` na ${args.due_date}` : ''}.`;
    case 'create_note':
      return `Dopiszę notatkę do kontaktu: "${String(args.note ?? '').slice(0, 100)}${String(args.note ?? '').length > 100 ? '...' : ''}".`;
    case 'update_deal_stage':
      return `Zmienię etap szansy sprzedaży na: ${args.new_category ?? '?'}${args.reason ? ` (${args.reason})` : ''}.`;
    case 'fill_bi_from_notes':
      return `Wypełnię ankietę BI kontaktu (id: ${args.contact_id ?? '?'}) na podstawie notatek i konsultacji. Potwierdzasz?`;
    case 'draft_email': {
      const preview = String(args.body ?? '').slice(0, 100);
      return `Zapiszę szkic e-maila do ${args.to ?? '?'}: "${args.subject ?? '?'}"${preview ? ` — "${preview}${String(args.body ?? '').length > 100 ? '...' : ''}"` : ''}.`;
    }
    case 'send_email': {
      const preview = String(args.body ?? '').slice(0, 100);
      return `Wyślę e-mail do ${args.to ?? '?'}: "${args.subject ?? '?'}"${preview ? ` — "${preview}${String(args.body ?? '').length > 100 ? '...' : ''}"` : ''}.`;
    }
    case 'create_calendar_event':
      return `Utworzę wydarzenie w Google Calendar: "${args.title ?? '?'}"${args.start ? ` o ${args.start}` : ''}.`;
    default:
      return `Wykonam akcję: ${name}.`;
  }
}

export interface PendingActionResult {
  requires_confirmation: true;
  pending_action_id: string;
  tool: string;
  human_summary: string;
  integration_ready: boolean;
}

export async function createPendingAction(
  serviceClient: SupabaseClient,
  ctx: ToolContext,
  toolName: string,
  args: Record<string, unknown>,
): Promise<PendingActionResult | { error: string }> {
  const summary = humanSummary(toolName, args);
  const integrationReady = !isStubTool(toolName);

  const { data, error } = await serviceClient
    .from('sovra_pending_actions')
    .insert({
      tenant_id: ctx.tenantId,
      actor_id: ctx.actorId,
      conversation_id: ctx.conversationId,
      tool: toolName,
      args,
      human_summary: summary,
      metadata: { integration_ready: integrationReady },
    })
    .select('id')
    .single();

  if (error || !data) {
    return { error: error?.message ?? 'Failed to create pending action' };
  }

  return {
    requires_confirmation: true,
    pending_action_id: data.id,
    tool: toolName,
    human_summary: summary,
    integration_ready: integrationReady,
  };
}
