import DOMPurify from 'dompurify';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'h1','h2','h3','h4','h5','h6','p','br','strong','em','b','i','u',
    'ul','ol','li','table','thead','tbody','tfoot','tr','th','td',
    'div','span','a','img','hr','blockquote','pre','code',
  ],
  ALLOWED_ATTR: ['href','src','alt','style','class','colspan','rowspan','target','width','height'],
  ALLOW_DATA_ATTR: false,
};

interface ReportPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string;
}

export function ReportPreviewModal({ open, onOpenChange, html }: ReportPreviewModalProps) {
  const sanitizedHtml = DOMPurify.sanitize(html, SANITIZE_CONFIG);

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
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      </DialogContent>
    </Dialog>
  );
}
