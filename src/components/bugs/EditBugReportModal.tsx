import { useState, useEffect } from 'react';
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
import { Loader2 } from 'lucide-react';
import type { BugReport } from '@/hooks/useBugReports';

interface EditBugReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: BugReport;
  onSave: (data: { title: string; description: string; priority: string }) => void;
  isSaving?: boolean;
}

export function EditBugReportModal({
  open,
  onOpenChange,
  report,
  onSave,
  isSaving,
}: EditBugReportModalProps) {
  const [title, setTitle] = useState(report.title);
  const [description, setDescription] = useState(report.description);
  const [priority, setPriority] = useState<string>(report.priority);

  useEffect(() => {
    if (open) {
      setTitle(report.title);
      setDescription(report.description);
      setPriority(report.priority);
    }
  }, [open, report]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    onSave({ title: title.trim(), description: description.trim(), priority });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edytuj zgłoszenie</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Tytuł *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Opis *</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-priority">Priorytet</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="edit-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">🟢 Niski</SelectItem>
                <SelectItem value="medium">🟡 Średni</SelectItem>
                <SelectItem value="high">🟠 Wysoki</SelectItem>
                <SelectItem value="critical">🔴 Krytyczny</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={isSaving || !title.trim() || !description.trim()}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Zapisz zmiany
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
