import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AspectRatio } from '@/components/ui/aspect-ratio';

interface BusinessCardPreviewProps {
  imageUrl: string;
  contactName: string;
}

export function BusinessCardPreview({ imageUrl, contactName }: BusinessCardPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          title="Podgląd wizytówki"
        >
          <CreditCard className="h-4 w-4" />
          <span className="text-xs">Wizytówka</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Wizytówka — {contactName}</DialogTitle>
        </DialogHeader>
        <AspectRatio ratio={16 / 9} className="bg-muted rounded-md overflow-hidden">
          <img
            src={imageUrl}
            alt={`Wizytówka ${contactName}`}
            className="w-full h-full object-contain"
          />
        </AspectRatio>
      </DialogContent>
    </Dialog>
  );
}
