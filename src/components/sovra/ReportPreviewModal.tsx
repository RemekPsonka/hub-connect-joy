import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface ReportPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string;
}

export function ReportPreviewModal({ open, onOpenChange, html }: ReportPreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Podgląd raportu email</DialogTitle>
          <DialogDescription>
            Tak będzie wyglądał Twój raport
          </DialogDescription>
        </DialogHeader>

        <div
          className="flex-1 overflow-y-auto rounded-lg border border-border bg-muted/30 p-1"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </DialogContent>
    </Dialog>
  );
}
