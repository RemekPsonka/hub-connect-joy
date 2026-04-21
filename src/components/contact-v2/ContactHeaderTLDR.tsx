import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  MoreHorizontal,
  Plus,
  Sparkles,
  Building2,
  Mail,
  Phone,
  Linkedin,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { PushToSGUDialog } from '@/components/sgu/PushToSGUDialog';
import { ContactModal } from '@/components/contacts/ContactModal';
import { AddOwnershipModal } from '@/components/contacts/AddOwnershipModal';
import { SovraMessages } from '@/components/sovra/SovraMessages';
import { SovraInput } from '@/components/sovra/SovraInput';
import { SovraFallbackBanner } from '@/components/sovra/SovraFallbackBanner';
import { useSovraChat } from '@/hooks/useSovraChat';
import type { ContactWithGroup } from '@/hooks/useContacts';

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
  fullContact?: ContactWithGroup | null;
  onSelectAction?: (tab: 'note' | 'email' | 'meeting') => void;
  onRequestHistory?: () => void;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
}

export function ContactHeaderTLDR({
  contactId,
  contact,
  fullContact,
  onSelectAction,
  onRequestHistory,
}: ContactHeaderTLDRProps) {
  const { data: tldr, isLoading } = useContactTldr(contactId);
  const [sguOpen, setSguOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [ownershipOpen, setOwnershipOpen] = useState(false);
  const [sovraDrawerOpen, setSovraDrawerOpen] = useState(false);

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
                <DropdownMenuItem onSelect={() => toast.info('Zadania — kolejny sprint')}>
                  ✅ Zadanie
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setSguOpen(true)}>⭐ Przekaż do lejka</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5"
              onClick={() => setSovraDrawerOpen(true)}
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
                <DropdownMenuItem onSelect={() => setOwnershipOpen(true)}>
                  Ustaw właściciela
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    if (!fullContact) {
                      toast.error('Nie udało się załadować danych kontaktu do edycji');
                      return;
                    }
                    setEditOpen(true);
                  }}
                >
                  Edytuj
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onRequestHistory?.()}>
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

      {fullContact && (
        <ContactModal
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          contact={fullContact}
        />
      )}

      <AddOwnershipModal
        open={ownershipOpen}
        onOpenChange={setOwnershipOpen}
        contactId={contactId}
        contactName={contact.full_name}
      />

      <SovraContactDrawer
        open={sovraDrawerOpen}
        onOpenChange={setSovraDrawerOpen}
        contactId={contactId}
        contactName={contact.full_name}
        companyName={contact.companies?.name ?? null}
      />
    </TooltipProvider>
  );
}

function SovraContactDrawer({
  open,
  onOpenChange,
  contactId,
  contactName,
  companyName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contactId: string;
  contactName: string;
  companyName: string | null;
}) {
  const navigate = useNavigate();
  const chat = useSovraChat({ contextType: 'contact', contextId: contactId });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Sovra · {contactName}
            {companyName ? ` · ${companyName}` : ''}
          </SheetTitle>
        </SheetHeader>

        {chat.lastError === 'unavailable' && (
          <div className="px-4 pt-3">
            <SovraFallbackBanner onRetry={chat.retryLast} onDismiss={chat.clearError} />
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto">
          <SovraMessages
            messages={chat.messages}
            isStreaming={chat.isStreaming}
            onConfirm={chat.confirmAction}
          />
        </div>

        <SovraInput
          onSend={(t) => chat.sendMessage(t)}
          isStreaming={chat.isStreaming}
          contextLabel={`Kontakt: ${contactName}`}
        />

        <div className="px-4 py-2 border-t">
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              navigate(`/sovra?contextType=contact&contextId=${contactId}`);
            }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 w-full justify-end"
          >
            Otwórz w pełnej Sovrze <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
