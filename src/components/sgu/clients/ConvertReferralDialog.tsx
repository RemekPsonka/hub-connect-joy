import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useConvertReferral } from '@/hooks/useClientReferrals';
import type { ClientReferralRow } from '@/hooks/useClientReferrals';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referral: ClientReferralRow;
  teamId: string;
}

export function ConvertReferralDialog({ open, onOpenChange, referral, teamId }: Props) {
  const [name, setName] = useState(referral.referred_name);
  const [phone, setPhone] = useState(referral.referred_phone ?? '');
  const [email, setEmail] = useState(referral.referred_email ?? '');
  const qc = useQueryClient();
  const convert = useConvertReferral();

  const createContact = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error('Brak użytkownika');
      const { data: dirData } = await supabase.from('directors').select('id, tenant_id').eq('user_id', userId).maybeSingle();
      if (!dirData?.tenant_id) throw new Error('Brak tenant_id');
      const { data: contact, error } = await supabase
        .from('contacts')
        .insert({
          full_name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          tenant_id: dirData.tenant_id,
          director_id: dirData.id,
          notes: referral.notes ?? null,
        } as never)
        .select('id')
        .single();
      if (error) throw error;
      return contact!.id as string;
    },
  });

  async function handleSubmit() {
    if (name.trim().length < 2) return;
    try {
      const contactId = await createContact.mutateAsync();
      await convert.mutateAsync({
        referralId: referral.id,
        referrerId: referral.referrer_deal_team_contact_id,
        teamId,
        contactId,
      });
      qc.invalidateQueries({ queryKey: ['contacts'] });
      onOpenChange(false);
    } catch (e) {
      toast.error('Konwersja nieudana', { description: (e as Error).message });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Konwertuj polecenie do prospektu</DialogTitle>
          <DialogDescription>
            Tworzy nowy kontakt CRM i dodaje go do lejka jako Prospekt. Status polecenia zmieni się
            na „added".
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="conv-name">Imię i nazwisko *</Label>
            <Input id="conv-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="conv-phone">Telefon</Label>
              <Input id="conv-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="conv-email">Email</Label>
              <Input id="conv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createContact.isPending || convert.isPending || name.trim().length < 2}
          >
            Konwertuj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
