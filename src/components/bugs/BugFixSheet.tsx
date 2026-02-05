import { useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import {
  ExternalLink,
  Send,
  CheckCircle2,
  FlaskConical,
  X,
  Monitor,
  Clock,
  MapPin,
  Loader2,
  Rocket,
  Copy,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { generateBugFixPrompt } from '@/utils/bugFixPrompt';
import type { BugReport } from '@/hooks/useBugReports';

interface FixNote {
  text: string;
  timestamp: string;
  author?: string;
}

interface BugFixSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: BugReport;
  onUpdateStatus: (status: string, notes?: string) => void;
  onAddNote: (note: string) => void;
  isUpdating?: boolean;
}

const priorityLabels = {
  critical: '🔴 Krytyczny',
  high: '🟠 Wysoki',
  medium: '🟡 Średni',
  low: '🟢 Niski',
};

export function BugFixSheet({
  open,
  onOpenChange,
  report,
  onUpdateStatus,
  onAddNote,
  isUpdating,
}: BugFixSheetProps) {
  const [newNote, setNewNote] = useState('');
  const [isStartingAIFix, setIsStartingAIFix] = useState(false);

  const fixNotes: FixNote[] = (report.context_data as Record<string, unknown>)?.fix_notes as FixNote[] || [];
  const contextData = report.context_data as Record<string, unknown> || {};

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    onAddNote(newNote.trim());
    setNewNote('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
  };

  const handleStartAIFix = async () => {
    setIsStartingAIFix(true);
    try {
      // Generate the prompt
      const prompt = generateBugFixPrompt(report);
      
      // Copy to clipboard
      await navigator.clipboard.writeText(prompt);
      
      // Add note about AI fix
      onAddNote('🤖 Uruchomiono naprawę AI - prompt skopiowany do schowka');
      
      // Update status to in_progress if not already
      if (report.status === 'new') {
        onUpdateStatus('in_progress');
      }
      
      // Show success toast
      toast.success('Prompt skopiowany do schowka!', {
        description: 'Wklej go w oknie czatu Lovable aby rozpocząć naprawę.',
        duration: 6000,
      });
    } catch (error) {
      console.error('Failed to copy prompt:', error);
      toast.error('Nie udało się skopiować prompta');
    } finally {
      setIsStartingAIFix(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="flex items-center gap-2">
            🔧 Naprawa: {report.title}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-6 pb-6">
              {/* Screenshot */}
              {report.screenshot_url && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Zrzut ekranu</h4>
                  <div className="border rounded-lg overflow-hidden bg-muted">
                    <img
                      src={report.screenshot_url}
                      alt="Zrzut ekranu"
                      className="w-full max-h-64 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(report.screenshot_url!, '_blank')}
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Opis problemu</h4>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  {report.description}
                </p>
              </div>

              {/* Context info */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Kontekst</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Badge variant="outline">{priorityLabels[report.priority]}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {format(new Date(report.created_at), 'd MMM yyyy, HH:mm', { locale: pl })}
                  </div>
                  {report.page_url && (
                    <div className="col-span-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={report.page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        {new URL(report.page_url).pathname}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {typeof contextData.screenWidth === 'number' && typeof contextData.screenHeight === 'number' && (
                    <div className="col-span-2 flex items-center gap-2 text-muted-foreground">
                      <Monitor className="h-4 w-4" />
                      {contextData.screenWidth} × {contextData.screenHeight}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* AI Fix Section */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <h4 className="font-medium text-sm">Naprawa z pomocą AI</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Kliknij aby wygenerować prompt dla Lovable AI. Prompt zawiera pełny kontekst błędu wraz ze screenshotem.
                        </p>
                      </div>
                      <Button
                        onClick={handleStartAIFix}
                        disabled={isStartingAIFix || isUpdating}
                        className="w-full"
                      >
                        {isStartingAIFix ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generowanie...
                          </>
                        ) : (
                          <>
                            <Rocket className="h-4 w-4 mr-2" />
                            Uruchom naprawę AI
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        <Copy className="h-3 w-3 inline mr-1" />
                        Prompt zostanie skopiowany do schowka
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* Fix notes / chat */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Notatki naprawy</h4>
                
                {/* Notes list */}
                {fixNotes.length > 0 ? (
                  <div className="space-y-2">
                    {fixNotes.map((note, index) => (
                      <div key={index} className="bg-muted p-3 rounded-lg text-sm">
                        <p>{note.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(note.timestamp), 'd MMM, HH:mm', { locale: pl })}
                          {note.author && ` • ${note.author}`}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Brak notatek. Dodaj pierwszą notatkę o postępie naprawy.
                  </p>
                )}

                {/* Add note input */}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Opisz postęp naprawy..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={2}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="icon"
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || isUpdating}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Actions footer */}
          <div className="p-4 border-t bg-background flex flex-wrap gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onUpdateStatus('cancelled')}
              disabled={isUpdating}
            >
              <X className="h-4 w-4 mr-1" />
              Anuluj naprawę
            </Button>
            <Button
              variant="secondary"
              onClick={() => onUpdateStatus('testing')}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <FlaskConical className="h-4 w-4 mr-1" />
              )}
              Testowanie
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => onUpdateStatus('resolved')}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1" />
              )}
              Rozwiązane
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
