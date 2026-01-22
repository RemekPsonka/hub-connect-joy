import { useState } from 'react';
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
import { Loader2, ImageOff } from 'lucide-react';

interface ReportBugModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenshotBlob: Blob | null;
  screenshotUrl: string | null;
}

export function ReportBugModal({
  open,
  onOpenChange,
  screenshotBlob,
  screenshotUrl,
}: ReportBugModalProps) {
  const location = useLocation();
  const createBugReport = useCreateBugReport();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) return;

    await createBugReport.mutateAsync({
      title: title.trim(),
      description: description.trim(),
      priority,
      screenshotBlob: screenshotBlob || undefined,
      pageUrl: window.location.href,
      contextData: {
        pathname: location.pathname,
        userAgent: navigator.userAgent,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        timestamp: new Date().toISOString(),
      },
    });

    // Reset form
    setTitle('');
    setDescription('');
    setPriority('medium');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            🐛 Zgłoś problem
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Screenshot preview */}
          <div className="space-y-2">
            <Label>Zrzut ekranu</Label>
            {screenshotUrl ? (
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
            <p><strong>Strona:</strong> {location.pathname}</p>
            <p><strong>Rozdzielczość:</strong> {window.innerWidth}x{window.innerHeight}</p>
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
              Dodaj do kolejki
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
