import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, Linkedin, Edit, Trash2, ArrowLeft, CalendarPlus, Crown, Building } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/contacts')} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Powrót do kontaktów
      </Button>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        {/* Left side - Avatar and info */}
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-xl bg-primary text-primary-foreground">
              {getInitials(contact.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              {contact.full_name}
              {isOwner && (
                <Badge variant="default" className="gap-1 bg-amber-500 hover:bg-amber-600">
                  <Crown className="h-3 w-3" />
                  Właściciel
                </Badge>
              )}
            </h1>
            <div className="space-y-0.5">
              {contact.position && (
                <p className="text-muted-foreground">{contact.position}</p>
              )}
              {contact.companies ? (
                <>
                  <p className="text-muted-foreground font-medium">
                    {contact.companies.name}
                  </p>
                  {(contact.companies.address || contact.companies.city) && (
                    <p className="text-sm text-muted-foreground">
                      {[
                        contact.companies.address,
                        contact.companies.postal_code,
                        contact.companies.city,
                        contact.companies.country
                      ].filter(Boolean).join(', ')}
                    </p>
                  )}
                </>
              ) : contact.company ? (
                <p className="text-muted-foreground">{contact.company}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <GroupBadge group={contact.contact_groups} />
            </div>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {contact.email && (
            <Button variant="outline" size="sm" asChild>
              <a href={`mailto:${contact.email}`}>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </a>
            </Button>
          )}
          {contact.phone && (
            <Button variant="outline" size="sm" asChild>
              <a href={`tel:${contact.phone}`}>
                <Phone className="h-4 w-4 mr-2" />
                Telefon
              </a>
            </Button>
          )}
          {contact.linkedin_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer">
                <Linkedin className="h-4 w-4 mr-2" />
                LinkedIn
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setIsConsultationModalOpen(true)}>
            <CalendarPlus className="h-4 w-4 mr-2" />
            Konsultacja
          </Button>
          <Button 
            variant={isOwner ? "default" : "outline"} 
            size="sm" 
            onClick={() => toggleOwnerStatus.mutate({ contactId: contact.id, isOwner: !isOwner })}
            disabled={toggleOwnerStatus.isPending}
            className={isOwner ? "bg-amber-500 hover:bg-amber-600" : ""}
          >
            <Crown className="h-4 w-4 mr-2" />
            {isOwner ? "Właściciel" : "Oznacz właściciela"}
          </Button>
          {viewMode === 'company' && company ? (
            <Button variant="outline" size="sm" onClick={() => setIsCompanyModalOpen(true)}>
              <Building className="h-4 w-4 mr-2" />
              Edytuj firmę
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edytuj
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Usuń
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
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Siła relacji:</span>
          <RelationshipStrengthBar 
            value={contact.relationship_strength || 5} 
            className="w-24" 
            showLabel 
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Ostatni kontakt:</span>
          <span className="font-medium">{formatLastContact(contact.last_contact_date)}</span>
        </div>
      </div>

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
