import { useState } from 'react';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useAddContactToTeam } from '@/hooks/useDealsTeamContacts';
import { useUpdateProspect } from '@/hooks/useDealsTeamProspects';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DealTeamProspect } from '@/types/dealTeam';

interface ConvertProspectDialogProps {
  prospect: DealTeamProspect;
  teamId: string;
  open: boolean;
  onClose: () => void;
}

export function ConvertProspectDialog({
  prospect,
  teamId,
  open,
  onClose,
}: ConvertProspectDialogProps) {
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;
  const queryClient = useQueryClient();

  const addContactToTeam = useAddContactToTeam();
  const updateProspect = useUpdateProspect();

  // Check if prospect already has a contact_id
  const hasExistingContact = !!prospect.converted_to_contact_id;

  // Form state for creating new contact (Scenario B)
  const [fullName, setFullName] = useState(prospect.prospect_name || '');
  const [company, setCompany] = useState(prospect.prospect_company || '');
  const [email, setEmail] = useState(prospect.prospect_email || '');
  const [phone, setPhone] = useState(prospect.prospect_phone || '');
  const [position, setPosition] = useState(prospect.prospect_position || '');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = hasExistingContact || fullName.trim();

  const handleSubmit = async () => {
    if (!canSubmit || !tenantId) return;
    setIsSubmitting(true);

    try {
      let contactId = prospect.converted_to_contact_id;

      // Scenario B: Create new contact if needed
      if (!hasExistingContact) {
        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            tenant_id: tenantId,
            full_name: fullName.trim(),
            company: company.trim() || null,
            email: email.trim() || null,
            phone: phone.trim() || null,
            position: position.trim() || null,
            source: 'prospect',
          })
          .select('id')
          .single();

        if (contactError) throw contactError;
        contactId = newContact.id;
      }

      if (!contactId) throw new Error('Brak ID kontaktu');

      // Add contact to team as LEAD
      await addContactToTeam.mutateAsync({
        teamId,
        contactId,
        category: 'lead',
        priority: prospect.priority || 'medium',
        notes: prospect.prospect_notes || undefined,
      });

      // Update prospect status to converted
      await updateProspect.mutateAsync({
        id: prospect.id,
        teamId,
        status: 'converted',
      });

      // Also update converted_to_contact_id
      await supabase
        .from('prospects')
        .update({ converted_to_contact_id: contactId })
        .eq('id', prospect.id);

      queryClient.invalidateQueries({ queryKey: ['deal-team-prospects', teamId] });
      queryClient.invalidateQueries({ queryKey: ['deal-team-contacts', teamId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });

      toast.success('Skonwertowano do LEAD');
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Błąd konwersji';
      
      if (message.includes('już dodany do zespołu')) {
        toast.error('Ten kontakt jest już dodany do tego zespołu');
      } else {
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Konwertuj do LEAD</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{prospect.prospect_name}</span>
            {prospect.prospect_company && ` — ${prospect.prospect_company}`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Scenario A: Existing contact */}
          {hasExistingContact && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Kontakt już istnieje w CRM</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Zostanie automatycznie powiązany z zespołem jako LEAD.
                </p>
              </div>
            </div>
          )}

          {/* Scenario B: Create new contact */}
          {!hasExistingContact && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/30">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                <div>
                  <p className="font-medium text-sm">
                    Kontakt nie istnieje w CRM
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Zostanie utworzony automatycznie z poniższych danych.
                  </p>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label>Imię i nazwisko *</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jan Kowalski"
                />
              </div>

              {/* Company */}
              <div className="space-y-2">
                <Label>Firma</Label>
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Nazwa firmy"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jan@firma.pl"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+48 123 456 789"
                />
              </div>

              {/* Position */}
              <div className="space-y-2">
                <Label>Stanowisko</Label>
                <Input
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Dyrektor handlowy"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Anuluj
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {hasExistingContact ? '✅ Konwertuj do LEAD' : '✅ Utwórz i konwertuj'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
