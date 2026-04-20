import { useNavigate } from 'react-router-dom';
import { FileText, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function StickyQuickActions() {
  const navigate = useNavigate();

  return (
    <TooltipProvider>
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
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button size="sm" disabled>
                  <FileText className="h-4 w-4 mr-1.5" />
                  Raport tygodniowy PDF
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Wkrótce (SGU-09)</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
