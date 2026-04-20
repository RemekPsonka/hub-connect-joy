import { Link } from 'react-router-dom';
import { FilePlus2, ListTodo, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function StickyQuickActions() {
  return (
    <div className="sticky bottom-0 left-0 right-0 z-20 -mx-4 mt-2 border-t bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-end gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to="/sgu/sprzedaz">
            <UserPlus className="h-4 w-4 mr-1.5" />
            Dodaj kontakt
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/sgu/zadania">
            <ListTodo className="h-4 w-4 mr-1.5" />
            Nowe zadanie
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/sgu/admin/products">
            <FilePlus2 className="h-4 w-4 mr-1.5" />
            Nowa polisa
          </Link>
        </Button>
      </div>
    </div>
  );
}
