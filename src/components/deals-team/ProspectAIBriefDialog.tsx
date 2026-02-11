import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { RefreshCw, Sparkles, X } from 'lucide-react';
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
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
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
          <div className="prose prose-sm dark:prose-invert max-w-none pr-4">
            <ReactMarkdown>{brief}</ReactMarkdown>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
