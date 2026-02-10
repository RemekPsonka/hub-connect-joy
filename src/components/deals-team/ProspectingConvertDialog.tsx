import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { MeetingProspect } from '@/hooks/useMeetingProspects';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospectId: string;
  teamId: string;
  prospect: MeetingProspect;
}

export function ProspectingConvertDialog({
  open,
  onOpenChange,
  prospectId,
  teamId,
  prospect,
}: Props) {
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;
  const directorId = director?.id;
  const queryClient = useQueryClient();

  const [email, setEmail] = useState(prospect.email || '');
  const [phone, setPhone] = useState(prospect.phone || '');
  const [linkedin, setLinkedin] = useState(prospect.linkedin_url || '');
  const [category, setCategory] = useState<'lead' | 'top' | 'hot'>('lead');
  const [loading, setLoading] = useState(false);

  const handleConvert = async () => {
    if (!tenantId || !directorId) {
      toast.error('Brak autoryzacji');
      return;
    }

    setLoading(true);
    try {
      // 1. Create contact in CRM
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          full_name: prospect.full_name,
          company: prospect.company,
          position: prospect.position,
          email: email || null,
          phone: phone || null,
          linkedin_url: linkedin || null,
          tenant_id: tenantId,
          director_id: directorId,
          source: `Prospecting: ${prospect.source_event || 'Import'}`,
          met_source: prospect.source_event || null,
        })
        .select('id')
        .single();

      if (contactError) throw contactError;

      // 2. Add to deal team as LEAD/TOP/HOT
      const { data: teamContact, error: teamError } = await supabase
        .from('deal_team_contacts')
        .insert({
          team_id: teamId,
          contact_id: contact.id,
          tenant_id: tenantId,
          category,
          priority: 'medium',
          status: 'active',
        })
        .select('id')
        .single();

      if (teamError) throw teamError;

      // 3. Update meeting prospect as converted
      await (supabase as any)
        .from('meeting_prospects')
        .update({
          prospecting_status: 'converted',
          converted_to_contact_id: contact.id,
          converted_to_team_contact_id: teamContact.id,
          converted_at: new Date().toISOString(),
        })
        .eq('id', prospectId);

      queryClient.invalidateQueries({ queryKey: ['meeting-prospects', teamId] });
      queryClient.invalidateQueries({ queryKey: ['deal-team-contacts', teamId] });
      toast.success(`${prospect.full_name} skonwertowany na kontakt (${category.toUpperCase()})`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Błąd konwersji: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Konwertuj na kontakt CRM</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="font-medium">{prospect.full_name}</p>
            <div className="text-sm text-muted-foreground">
              {prospect.company && <span>{prospect.company}</span>}
              {prospect.position && <span> • {prospect.position}</span>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@firma.pl" />
          </div>

          <div className="space-y-2">
            <Label>Telefon</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+48..." />
          </div>

          <div className="space-y-2">
            <Label>LinkedIn</Label>
            <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
          </div>

          <div className="space-y-2">
            <Label>Kategoria na Kanban</Label>
            <div className="flex gap-2">
              {(['lead', 'top', 'hot'] as const).map((cat) => (
                <Button
                  key={cat}
                  variant={category === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategory(cat)}
                >
                  {cat.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={handleConvert} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Konwertuj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
