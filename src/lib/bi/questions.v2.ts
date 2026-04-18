// Sprint 07 — BI 2.0 questions schema
// TODO: Remek dostarcza 15 finalnych pytań — na razie 3 placeholdery.

export type BIQuestionType = 'text' | 'textarea' | 'select' | 'number' | 'date';

export interface BIQuestion {
  id: string;
  section: string;
  label: string;
  type: BIQuestionType;
  placeholder?: string;
  options?: { value: string; label: string }[];
  helpText?: string;
}

export const BI_SECTIONS: { id: string; label: string }[] = [
  { id: 'basics', label: 'Podstawy' },
];

export const BI_QUESTIONS_V2: BIQuestion[] = [
  // TODO: Remek dostarcza 15 finalnych pytań
  {
    id: 'business_focus',
    section: 'basics',
    label: 'Czym zajmuje się biznes kontaktu?',
    type: 'textarea',
    placeholder: 'Krótki opis działalności, branża, segment klientów...',
  },
  {
    id: 'top_priority',
    section: 'basics',
    label: 'Główny priorytet biznesowy na najbliższe 12 miesięcy',
    type: 'textarea',
    placeholder: 'Np. ekspansja, M&A, nowy produkt, sukcesja...',
  },
  {
    id: 'how_can_we_help',
    section: 'basics',
    label: 'W czym możemy pomóc?',
    type: 'textarea',
    placeholder: 'Konkretne potrzeby: kontakty, doradztwo, finansowanie...',
  },
];

export type BIAnswers = Record<string, string | number | null>;
