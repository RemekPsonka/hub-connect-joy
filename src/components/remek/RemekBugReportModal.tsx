import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateBugReport } from '@/hooks/useBugReports';
import { Loader2, ImageOff, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RemekBugReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  conversationSnapshot: Array<{ role: string; message: string; createdAt: string }>;
  userContext: {
    module: string | null;
    pageUrl: string;
    contactId?: string;
    companyId?: string;
  };
}

export function RemekBugReportModal({
  open,
  onOpenChange,
  sessionId,
  conversationSnapshot,
  userContext,
}: RemekBugReportModalProps) {
  const location = useLocation();
  const createBugReport = useCreateBugReport();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [screenshotBlob, setScreenshotBlob] = useState<Blob | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Capture screenshot when modal opens
  useEffect(() => {
    if (open && !screenshotUrl) {
      captureScreenshot();
    }
  }, [open]);

  // Cleanup screenshot URL
  useEffect(() => {
    return () => {
      if (screenshotUrl) {
        URL.revokeObjectURL(screenshotUrl);
      }
    };
  }, [screenshotUrl]);

  const captureScreenshot = async () => {
    setIsCapturing(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
        scale: 0.5,
        ignoreElements: (element) => {
          // Ignore the Remek widget and bug report button
          return element.classList.contains('fixed') && 
                 (element.getAttribute('aria-label')?.includes('Remek') ||
                  element.id === 'report-bug-button');
        },
      });

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
          },
          'image/png',
          0.8
        );
      });

      setScreenshotBlob(blob);
      setScreenshotUrl(URL.createObjectURL(blob));
    } catch (error) {
      console.error('Error capturing screenshot:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) return;

    await createBugReport.mutateAsync({
      title: title.trim(),
      description: description.trim(),
      priority,
      screenshotBlob: screenshotBlob || undefined,
      pageUrl: userContext.pageUrl,
      contextData: {
        pathname: location.pathname,
        userAgent: navigator.userAgent,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        timestamp: new Date().toISOString(),
        module: userContext.module,
        contactId: userContext.contactId,
        companyId: userContext.companyId,
        // Add Remek-specific data
        remekSessionId: sessionId,
        remekConversationSnapshot: conversationSnapshot,
      },
    });

    // Reset form
    setTitle('');
    setDescription('');
    setPriority('medium');
    setScreenshotBlob(null);
    if (screenshotUrl) {
      URL.revokeObjectURL(screenshotUrl);
      setScreenshotUrl(null);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            🐛 Zgłoś problem (przez Remka)
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Screenshot preview */}
          <div className="space-y-2">
            <Label>Zrzut ekranu</Label>
            {isCapturing ? (
              <div className="border rounded-lg p-8 bg-muted flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : screenshotUrl ? (
              <div className="border rounded-lg overflow-hidden bg-muted">
                <img
                  src={screenshotUrl}
                  alt="Zrzut ekranu"
                  className="w-full max-h-48 object-contain"
                />
              </div>
            ) : (
              <div className="border rounded-lg p-8 bg-muted flex flex-col items-center justify-center text-muted-foreground">
                <ImageOff className="h-8 w-8 mb-2" />
                <p className="text-sm">Nie udało się wykonać zrzutu ekranu</p>
              </div>
            )}
          </div>

          {/* Conversation context indicator */}
          {conversationSnapshot.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                Dołączam {conversationSnapshot.length} wiadomości z rozmowy z Remkiem
              </span>
              <Badge variant="secondary" className="ml-auto">
                Automatyczne
              </Badge>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="bug-title">Tytuł problemu *</Label>
            <Input
              id="bug-title"
              placeholder="Krótki opis problemu..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="bug-description">Opis szczegółowy *</Label>
            <Textarea
              id="bug-description"
              placeholder="Co dokładnie nie działa? Jakie kroki wykonałeś/aś? Czego oczekiwałeś/aś?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="bug-priority">Priorytet</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="bug-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">🟢 Niski - drobna niedogodność</SelectItem>
                <SelectItem value="medium">🟡 Średni - utrudnia pracę</SelectItem>
                <SelectItem value="high">🟠 Wysoki - blokuje funkcję</SelectItem>
                <SelectItem value="critical">🔴 Krytyczny - aplikacja nie działa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Context info */}
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg space-y-1">
            <p><strong>Moduł:</strong> {userContext.module || 'nieznany'}</p>
            <p><strong>Strona:</strong> {location.pathname}</p>
            <p><strong>Rozdzielczość:</strong> {window.innerWidth}x{window.innerHeight}</p>
            {userContext.contactId && <p><strong>Kontakt ID:</strong> {userContext.contactId}</p>}
            {userContext.companyId && <p><strong>Firma ID:</strong> {userContext.companyId}</p>}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={createBugReport.isPending || !title.trim() || !description.trim()}
            >
              {createBugReport.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Zgłoś problem
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
