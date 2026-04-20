import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MoreHorizontal, Plus, Sparkles, Building2, Mail, Phone, Linkedin, AlertCircle } from 'lucide-react';
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
    email?: string | null;
    phone?: string | null;
    linkedin_url?: string | null;
    company_id?: string | null;
    companies?: { id?: string; name: string } | null;
    director_id?: string | null;
  };
  onSelectAction?: (tab: 'note' | 'email' | 'meeting') => void;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
}

export function ContactHeaderTLDR({ contactId, contact, onSelectAction }: ContactHeaderTLDRProps) {
  const { data: tldr, isLoading } = useContactTldr(contactId);
  const [sguOpen, setSguOpen] = useState(false);
  const navigate = useNavigate();

  const hasContactInfo = contact.email || contact.phone || contact.linkedin_url;

  const renderTldr = () => {
    if (isLoading) return <Skeleton className="h-4 w-3/4" />;
    if (tldr?.error === true) {
      return (
        <p className="text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          TL;DR: błąd generowania ({tldr.message ?? 'sprawdź logi funkcji'})
        </p>
      );
    }
    if (!tldr?.tldr || tldr.tldr === 'Brak podsumowania AI') {
      return <p className="text-sm text-muted-foreground italic">Brak podsumowania AI (cache pusty lub LLM nie zwrócił treści)</p>;
    }
    return <p className="text-sm text-muted-foreground">{tldr.tldr}</p>;
  };

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
              {hasContactInfo && (
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 hover:text-foreground">
                      <Mail className="h-4 w-4" />
                      {contact.email}
                    </a>
                  )}
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
                      <Phone className="h-4 w-4" />
                      {contact.phone}
                    </a>
                  )}
                  {contact.linkedin_url && (
                    <a
                      href={contact.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </a>
                  )}
                </div>
              )}
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
                <DropdownMenuItem onSelect={() => onSelectAction?.('note')}>
                  📝 Notatka
                </DropdownMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <DropdownMenuItem disabled>📧 Email</DropdownMenuItem>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>W trakcie naprawy</TooltipContent>
                </Tooltip>
                <DropdownMenuItem onSelect={() => toast.info('Spotkania — wymaga aktualizacji schematu, kolejny sprint')}>
                  📅 Spotkanie
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => toast.info('Zadania — kolejny sprint')}>
                  ✅ Zadanie
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setSguOpen(true)}>⭐ Przekaż do SGU</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5"
              onClick={() => navigate(`/sovra?contextType=contact&contextId=${contactId}`)}
            >
              <Sparkles className="h-4 w-4" /> Zapytaj Sovrę
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => toast.info('Zmiana właściciela — wkrótce')}>
                  Ustaw właściciela
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => toast.info('Edycja kontaktu — wkrótce')}>
                  Edytuj
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => toast.info('Historia zmian — wkrótce')}>
                  Historia
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 px-3 py-2">{renderTldr()}</div>
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
