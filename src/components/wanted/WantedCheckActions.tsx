import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';
import { Loader2, Database, Sparkles, ExternalLink } from 'lucide-react';

interface CheckResult {
  isDuplicate: boolean;
  existingContact: {
    id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    position: string | null;
  } | null;
}

interface EnrichResult {
  position?: string | null;
  summary?: string | null;
  industry?: string | null;
}

interface WantedCheckActionsProps {
  personName: string;
  companyName: string;
  onEnrichResult: (result: EnrichResult) => void;
  compact?: boolean;
}

function splitName(fullName: string): { first_name: string; last_name: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return { first_name: parts[0] || '', last_name: '' };
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
}

export function WantedCheckActions({ personName, companyName, onEnrichResult, compact }: WantedCheckActionsProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);

  const handleCheckDB = async () => {
    if (!personName.trim() && !companyName.trim()) {
      showToast.warning('Podaj imię i nazwisko lub nazwę firmy');
      return;
    }
    setIsChecking(true);
    setCheckResult(null);

    try {
      const { first_name, last_name } = splitName(personName);

      const { data, error } = await supabase.functions.invoke('check-duplicate-contact', {
        body: { contact: { first_name, last_name, email: null, phone: null } },
      });

      if (error) throw error;

      setCheckResult(data as CheckResult);

      if (data?.isDuplicate) {
        showToast.info(`Znaleziono: ${data.existingContact?.full_name}`);
      } else {
        showToast.info('Nie znaleziono podobnego kontaktu w bazie');
      }
    } catch (err: any) {
      console.error('Check DB error:', err);
      showToast.error('Błąd sprawdzania bazy');
    } finally {
      setIsChecking(false);
    }
  };

  const handleEnrichAI = async () => {
    if (!personName.trim()) {
      showToast.warning('Podaj imię i nazwisko do wzbogacenia');
      return;
    }
    setIsEnriching(true);

    try {
      const { first_name, last_name } = splitName(personName);

      const { data, error } = await supabase.functions.invoke('enrich-person-data', {
        body: { first_name, last_name, company: companyName || undefined },
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        const enriched = data.data;

        // Extract position from profile summary
        let position: string | null = null;
        const posMatch = enriched.profile_summary?.match(/(?:aktualne?\s+stanowisko|pozycja)[:\s]*([^\n]+)/i);
        if (posMatch) position = posMatch[1].replace(/[*#]/g, '').trim();

        // Extract industry from tags
        const industry = enriched.tags?.length > 0
          ? enriched.tags.slice(0, 3).join(', ')
          : null;

        // Short summary (first 500 chars of profile_summary)
        const summary = enriched.profile_summary
          ? enriched.profile_summary.substring(0, 1500)
          : null;

        onEnrichResult({ position, summary, industry });
        showToast.success('Uzupełniono dane z AI');
      } else {
        showToast.warning('AI nie znalazło danych o tej osobie');
      }
    } catch (err: any) {
      console.error('Enrich AI error:', err);
      showToast.error(err.message || 'Błąd wzbogacania danych AI');
    } finally {
      setIsEnriching(false);
    }
  };

  const btnSize = compact ? 'sm' : 'default';

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size={btnSize}
          onClick={handleCheckDB}
          disabled={isChecking || isEnriching || (!personName.trim() && !companyName.trim())}
          className="gap-1.5"
        >
          {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
          {compact ? 'Sprawdź' : 'Sprawdź w bazie'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size={btnSize}
          onClick={handleEnrichAI}
          disabled={isEnriching || isChecking || !personName.trim()}
          className="gap-1.5"
        >
          {isEnriching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {compact ? 'AI' : 'Uzupełnij dane AI'}
        </Button>
      </div>

      {/* Check result inline */}
      {checkResult && (
        <div className={`text-sm px-3 py-2 rounded-md ${
          checkResult.isDuplicate
            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800'
            : 'bg-muted text-muted-foreground'
        }`}>
          {checkResult.isDuplicate && checkResult.existingContact ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span>Znaleziono: <strong>{checkResult.existingContact.full_name}</strong></span>
              {checkResult.existingContact.company && (
                <Badge variant="secondary" className="text-xs">{checkResult.existingContact.company}</Badge>
              )}
              <a
                href={`/contacts/${checkResult.existingContact.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs underline hover:no-underline"
              >
                Zobacz <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ) : (
            <span>Nie znaleziono podobnego kontaktu w bazie</span>
          )}
        </div>
      )}
    </div>
  );
}
