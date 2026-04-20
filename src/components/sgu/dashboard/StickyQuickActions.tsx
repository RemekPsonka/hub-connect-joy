import { useNavigate } from 'react-router-dom';
import { FileText, Sparkles, Upload, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function StickyQuickActions() {
  const navigate = useNavigate();

  return (
    <div className="sticky bottom-0 left-0 right-0 z-20 -mx-4 mt-2 border-t bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('/sgu/sprzedaz?action=new-client')}
        >
          <UserPlus className="h-4 w-4 mr-1.5" />
          Dodaj klienta
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('/sgu/admin?tab=import')}
        >
          <Upload className="h-4 w-4 mr-1.5" />
          Import CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('/sgu/admin?tab=ai-krs')}
        >
          <Sparkles className="h-4 w-4 mr-1.5" />
          AI KRS scan
        </Button>
        <Button
          size="sm"
          onClick={() =>
            toast.info('Raport tygodniowy PDF', {
              description: 'Zaplanowane na Sprint SGU-08',
            })
          }
        >
          <FileText className="h-4 w-4 mr-1.5" />
          Raport tygodniowy PDF
        </Button>
      </div>
    </div>
  );
}
