import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, Linkedin, Edit, Trash2, ArrowLeft, CalendarPlus, Crown, Building, Globe, Share2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { RelationshipStrengthBar } from './RelationshipStrengthBar';
import { GroupBadge } from './GroupBadge';
import { useDeleteContact, type ContactWithDetails } from '@/hooks/useContacts';
import { useToggleOwnerStatus } from '@/hooks/useOwnership';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ConsultationModal } from '@/components/consultations/ConsultationModal';
import { CompanyModal } from '@/components/contacts/CompanyModal';
import { ShareContactDialog } from '@/components/contacts/ShareContactDialog';
import { SovraOpenButton } from '@/components/sovra/SovraOpenButton';


interface ContactDetailHeaderProps {
  contact: ContactWithDetails;
  onEdit: () => void;
  viewMode?: 'person' | 'company';
}

export function ContactDetailHeader({ contact, onEdit, viewMode = 'person' }: ContactDetailHeaderProps) {
  const navigate = useNavigate();
  const deleteContact = useDeleteContact();
  const toggleOwnerStatus = useToggleOwnerStatus();
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

  const isOwner = (contact as any).is_owner || false;
  const company = contact.companies;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleDelete = async () => {
    await deleteContact.mutateAsync(contact.id);
    navigate('/contacts');
  };

  const formatLastContact = (date: string | null) => {
    if (!date) return 'Brak kontaktu';
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: pl });
  };

  return (
    <div className="space-y-5">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/contacts')} className="gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" />
        Powrót do kontaktów
      </Button>

      {/* SEKCJA 1: Osoba + Akcje + Firma */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        {/* Left side - Avatar and person info */}
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg bg-primary text-primary-foreground">
              {getInitials(contact.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            {/* Name + Owner badge */}
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">
                {contact.full_name}
              </h1>
              {isOwner && (
                <Badge variant="default" className="gap-1 bg-amber-500 hover:bg-amber-600 text-xs">
                  <Crown className="h-3 w-3" />
                  Właściciel
                </Badge>
              )}
            </div>

            {/* Relationship strength - directly under name */}
            {viewMode === 'person' && (
              <RelationshipStrengthBar 
                value={contact.relationship_strength || 5} 
                className="w-28" 
                showLabel 
              />
            )}
            
            {/* Position */}
            {contact.position && (
              <p className="text-muted-foreground text-sm">{contact.position}</p>
            )}
            
            {/* Contact links - inline text style */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm">
              {contact.email && (
                <a 
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>{contact.email}</span>
                </a>
              )}
              {contact.phone && (
                <a 
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>{contact.phone}</span>
                </a>
              )}
              {(contact as any).phone_business && (
                <a 
                  href={`tel:${(contact as any).phone_business}`}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span className="text-xs text-muted-foreground/70">służb.</span>
                  <span>{(contact as any).phone_business}</span>
                </a>
              )}
              {contact.linkedin_url && (
                <a 
                  href={contact.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Linkedin className="h-3.5 w-3.5" />
                  <span>LinkedIn</span>
                </a>
              )}
              {(contact as any).email_secondary && (
                <a 
                  href={`mailto:${(contact as any).email_secondary}`}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span className="text-xs text-muted-foreground/70">dod.</span>
                  <span>{(contact as any).email_secondary}</span>
                </a>
              )}
            </div>
            
            {/* Group badge - small */}
            <div className="pt-1">
              <GroupBadge group={contact.contact_groups} className="text-xs py-0 px-1.5" />
            </div>
          </div>
        </div>

        {/* Right side - Actions + Company data */}
        <div className="flex flex-col items-end gap-3">
          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <ShareContactDialog contactId={contact.id} contactName={contact.full_name} />
            <SovraOpenButton scopeType="contact" scopeId={contact.id} />
            <Button variant="outline" size="sm" onClick={() => setIsConsultationModalOpen(true)}>
              <CalendarPlus className="h-4 w-4 mr-1.5" />
              Konsultacja
            </Button>
            <Button 
              variant={isOwner ? "secondary" : "outline"} 
              size="sm" 
              onClick={() => toggleOwnerStatus.mutate({ contactId: contact.id, isOwner: !isOwner })}
              disabled={toggleOwnerStatus.isPending}
              className={isOwner ? "bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-300" : ""}
            >
              <Crown className="h-4 w-4 mr-1.5" />
              {isOwner ? "Właściciel" : "Ustaw właściciela"}
            </Button>
            {viewMode === 'company' && company ? (
              <Button variant="outline" size="sm" onClick={() => setIsCompanyModalOpen(true)}>
                <Edit className="h-4 w-4 mr-1.5" />
                Edytuj firmę
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-1.5" />
                Edytuj
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Usunąć kontakt?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Czy na pewno chcesz usunąć kontakt {contact.full_name}? Ta operacja jest nieodwracalna.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Usuń</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Company data - compact block under actions */}
          {contact.companies ? (
            <div className="text-right text-sm space-y-0.5 max-w-xs">
              <div className="flex items-center justify-end gap-1.5">
                <Building className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{contact.companies.name}</span>
                {(contact.companies as any).legal_form && (
                  <Badge variant="outline" className="text-xs font-normal py-0 px-1">
                    {(contact.companies as any).legal_form}
                  </Badge>
                )}
              </div>
              
              {/* Registry IDs - single line */}
              {((contact.companies as any).nip || (contact.companies as any).krs || (contact.companies as any).regon) && (
                <p className="text-xs text-muted-foreground font-mono">
                  {[
                    (contact.companies as any).nip && `NIP: ${(contact.companies as any).nip}`,
                    (contact.companies as any).krs && `KRS: ${(contact.companies as any).krs}`,
                    (contact.companies as any).regon && `REGON: ${(contact.companies as any).regon}`
                  ].filter(Boolean).join(' · ')}
                </p>
              )}
              
              {/* Address */}
              {(contact.companies.address || contact.companies.city) && (
                <p className="text-xs text-muted-foreground">
                  {[contact.companies.address, (contact.companies as any).postal_code, contact.companies.city].filter(Boolean).join(', ')}
                </p>
              )}
              
              {/* Website */}
              {(contact.companies as any).website && (
                <a 
                  href={(contact.companies as any).website.startsWith('http') ? (contact.companies as any).website : `https://${(contact.companies as any).website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center justify-end gap-1"
                >
                  <Globe className="h-3 w-3" />
                  {(contact.companies as any).website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          ) : contact.company ? (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building className="h-3.5 w-3.5" />
              <span>{contact.company}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* SEKCJA 2: Ostatni kontakt - tylko dla widoku OSOBA */}
      {viewMode === 'person' && (
        <div className="flex flex-wrap items-center gap-6 text-sm border-t border-b border-border/50 py-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Ostatni kontakt:</span>
            <span className="font-medium">{formatLastContact(contact.last_contact_date)}</span>
          </div>
        </div>
      )}

      <ConsultationModal
        isOpen={isConsultationModalOpen}
        onClose={() => setIsConsultationModalOpen(false)}
        prefilledContactId={contact.id}
      />

      {company && (
        <CompanyModal
          open={isCompanyModalOpen}
          onOpenChange={setIsCompanyModalOpen}
          company={company as any}
          ownerContactId={contact.id}
        />
      )}
    </div>
  );
}
