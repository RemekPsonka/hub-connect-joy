/**
 * Single source of truth: które kategorie deal_team_contacts.category to "lejek
 * sprzedaży" (Odprawa + Kanban), które to "klienci" (moduł /sgu/klienci),
 * a które to stany terminalne (lost).
 *
 * Dokument źródłowy: audyt 2026-04-25 (AUDIT-FIX-01) — naprawa rozjazdu
 * 3 list (Odprawa / Kanban / Klienci). Przed audytem każda lista miała
 * własną, nieudokumentowaną definicję "kogo pokazuje".
 *
 * Reguła: NIE umieszczaj klientów w lejku sprzedaży, NIE umieszczaj
 * lejka w module Klienci. RPC `get_odprawa_agenda` wyklucza klientów,
 * `useTeamContacts` (Kanban) też. `useSGUClientsPortfolio` filtruje
 * jawnie `category='client'`.
 */
export const SALES_CATEGORIES = [
  'prospect',
  'lead',
  'hot',
  'top',
  'cold',
  '10x',
  'offering',
  'audit',
] as const;

export const CLIENT_CATEGORIES = ['client'] as const;

export const TERMINAL_CATEGORIES = ['lost'] as const;

export type SalesCategory = (typeof SALES_CATEGORIES)[number];
export type ClientCategory = (typeof CLIENT_CATEGORIES)[number];
export type TerminalCategory = (typeof TERMINAL_CATEGORIES)[number];

export function isSalesCategory(cat: string | null | undefined): cat is SalesCategory {
  return !!cat && (SALES_CATEGORIES as readonly string[]).includes(cat);
}

export function isClientCategory(cat: string | null | undefined): cat is ClientCategory {
  return !!cat && (CLIENT_CATEGORIES as readonly string[]).includes(cat);
}

export function isTerminalCategory(cat: string | null | undefined): cat is TerminalCategory {
  return !!cat && (TERMINAL_CATEGORIES as readonly string[]).includes(cat);
}
