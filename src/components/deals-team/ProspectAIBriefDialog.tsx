import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { RefreshCw, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospectName: string;
  company: string | null;
  brief: string;
  generatedAt: string | null;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

interface BriefSection {
  title: string;
  content: string;
}

function parseBriefSections(brief: string): BriefSection[] {
  const parts = brief.split(/^## /m).filter(Boolean);
  return parts.map((part) => {
    const lines = part.split('\n');
    const title = lines[0].trim();
    const content = lines.slice(1).join('\n').trim();
    return { title, content };
  });
}

function getSectionColor(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('osoba') || lower.includes('👤')) return 'bg-purple-600';
  if (lower.includes('firma') || lower.includes('🏢')) return 'bg-blue-600';
  if (lower.includes('ubezpiecz') || lower.includes('🛡')) return 'bg-orange-600';
  if (lower.includes('temat') || lower.includes('💬')) return 'bg-emerald-600';
  return 'bg-muted-foreground';
}

export function ProspectAIBriefDialog({
  open,
  onOpenChange,
  prospectName,
  company,
  brief,
  generatedAt,
  onRegenerate,
  isRegenerating,
}: Props) {
  const sections = parseBriefSections(brief);
  const hasStructuredSections = sections.length > 0 && sections[0].title !== brief.trim();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Brief do pierwszej rozmowy — {prospectName}
          </SheetTitle>
          {company && (
            <p className="text-sm text-muted-foreground">{company}</p>
          )}
        </SheetHeader>

        <div className="mt-4 flex items-center justify-between">
          {generatedAt && (
            <p className="text-xs text-muted-foreground">
              Wygenerowano: {format(new Date(generatedAt), 'd MMM yyyy, HH:mm', { locale: pl })}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            {isRegenerating ? 'Generuję...' : 'Odśwież'}
          </Button>
        </div>

        <ScrollArea className="mt-4 h-[calc(100vh-200px)]">
          <div className="pr-4 space-y-4">
            {hasStructuredSections ? (
              sections.map((section, idx) => {
                const colorClass = getSectionColor(section.title);
                const cleanTitle = section.title
                  .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
                  .trim()
                  .toUpperCase();

                return (
                  <div key={idx} className="rounded-lg overflow-hidden border border-border">
                    <div className={`${colorClass} px-4 py-2`}>
                      <span className="text-sm font-semibold text-white tracking-wide">
                        {cleanTitle}
                      </span>
                    </div>
                    <div className="bg-card p-4 prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{section.content}</ReactMarkdown>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{brief}</ReactMarkdown>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
