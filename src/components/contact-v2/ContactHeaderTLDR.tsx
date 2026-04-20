import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreHorizontal, Plus, Sparkles, Building2 } from 'lucide-react';
import { useContactTldr } from '@/hooks/useContactTldr';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PushToSGUDialog } from '@/components/sgu/PushToSGUDialog';

interface ContactHeaderTLDRProps {
  contactId: string;
  contact: {
    id: string;
    full_name: string;
    position?: string | null;
    company_id?: string | null;
    companies?: { id?: string; name: string } | null;
    director_id?: string | null;
  };
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
}

export function ContactHeaderTLDR({ contactId, contact }: ContactHeaderTLDRProps) {
  const { data: tldr, isLoading } = useContactTldr(contactId);
  const [sguOpen, setSguOpen] = useState(false);

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="text-lg">{initials(contact.full_name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold truncate">{contact.full_name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {contact.position && <span className="truncate">{contact.position}</span>}
                {contact.companies?.name && contact.company_id && (
                  <Link
                    to={`/companies/${contact.company_id}`}
                    className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-foreground hover:bg-muted"
                  >
                    <Building2 className="h-3 w-3" />
                    {contact.companies.name}
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" /> Nowa akcja
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>📝 Notatka</DropdownMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <DropdownMenuItem disabled>📧 Email</DropdownMenuItem>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>W trakcie naprawy</TooltipContent>
                </Tooltip>
                <DropdownMenuItem>📅 Spotkanie</DropdownMenuItem>
                <DropdownMenuItem>✅ Zadanie</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setSguOpen(true)}>⭐ Przekaż do SGU</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" variant="secondary" className="gap-1.5">
              <Sparkles className="h-4 w-4" /> Zapytaj Sovrę
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Udostępnij</DropdownMenuItem>
                <DropdownMenuItem>Ustaw właściciela</DropdownMenuItem>
                <DropdownMenuItem>Edytuj</DropdownMenuItem>
                <DropdownMenuItem>Historia</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 px-3 py-2">
          {isLoading ? (
            <Skeleton className="h-4 w-3/4" />
          ) : (
            <p className="text-sm text-muted-foreground">{tldr?.tldr ?? 'Brak podsumowania AI'}</p>
          )}
        </div>
      </div>

      <PushToSGUDialog
        open={sguOpen}
        onOpenChange={setSguOpen}
        contactId={contactId}
        contactName={contact.full_name}
      />
    </TooltipProvider>
  );
}
