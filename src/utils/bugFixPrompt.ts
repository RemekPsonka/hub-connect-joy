import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { BugReport } from '@/hooks/useBugReports';

const priorityLabels: Record<string, string> = {
  critical: 'Krytyczny',
  high: 'Wysoki',
  medium: 'Średni',
  low: 'Niski',
};

export function generateBugFixPrompt(report: BugReport): string {
  const contextData = (report.context_data as Record<string, unknown>) || {};

  let prompt = `🔧 NAPRAWA BŁĘDU #${report.id.slice(0, 8)}

**Tytuł:** ${report.title}
**Priorytet:** ${priorityLabels[report.priority] || report.priority}
**Strona:** ${report.page_url || 'Nieznana'}

## Opis problemu
${report.description}

## Kontekst techniczny
- Data zgłoszenia: ${format(new Date(report.created_at), 'd MMMM yyyy, HH:mm', { locale: pl })}`;

  if (contextData.screenWidth && contextData.screenHeight) {
    prompt += `\n- Rozdzielczość ekranu: ${contextData.screenWidth}x${contextData.screenHeight}`;
  }

  if (contextData.pathname) {
    prompt += `\n- Ścieżka w aplikacji: ${contextData.pathname}`;
  }

  if (contextData.userAgent) {
    prompt += `\n- Przeglądarka: ${String(contextData.userAgent).slice(0, 100)}...`;
  }

  if (report.screenshot_url) {
    prompt += `\n\n## Zrzut ekranu
Przeanalizuj ten screenshot aby zrozumieć problem wizualnie:
${report.screenshot_url}`;
  }

  prompt += `\n\n---
**ZADANIE:** Przeanalizuj powyższe informacje, znajdź przyczynę problemu w kodzie i napraw go. Jeśli na screenshocie widać błąd UI, zlokalizuj odpowiedni komponent i wprowadź poprawki.`;

  return prompt;
}
