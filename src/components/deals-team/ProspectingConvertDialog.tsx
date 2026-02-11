import { useState, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle, UserPlus } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { MeetingProspect } from '@/hooks/useMeetingProspects';

interface FoundContact {
  id: string;
  full_name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  position: string | null;
}

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
  const [category, setCategory] = useState<'cold' | 'lead' | 'top' | 'hot'>('cold');
  const [loading, setLoading] = useState(false);

  // Duplicate detection
  const [duplicates, setDuplicates] = useState<FoundContact[]>([]);
  const [searchingDuplicates, setSearchingDuplicates] = useState(false);
  const [mode, setMode] = useState<'new' | string>('new'); // 'new' or contact ID

  /** Auto-create BI record with brief from prospecting and trigger AI fill */
  const autoCreateBI = useCallback(async (contactId: string, prospect: MeetingProspect) => {
    if (!tenantId) return;

    // Check if BI already exists for this contact
    const { data: existingBI } = await supabase
      .from('business_interviews')
      .select('id')
      .eq('contact_id', contactId)
      .maybeSingle();

    const briefContent = [prospect.ai_brief, prospect.prospecting_notes].filter(Boolean).join('\n\n');

    if (existingBI) {
      // Update existing BI with brief if section_a_basic.podpowiedzi_brief is empty
      const { data: biRow } = await supabase
        .from('business_interviews')
        .select('section_a_basic')
        .eq('id', existingBI.id)
        .single();

      const sectionA = (biRow?.section_a_basic as Record<string, any>) || {};
      if (!sectionA.podpowiedzi_brief) {
        await supabase
          .from('business_interviews')
          .update({
            section_a_basic: { ...sectionA, podpowiedzi_brief: briefContent } as any,
          })
          .eq('id', existingBI.id);
      }
    } else {
      // Create new BI record
      await supabase
        .from('business_interviews')
        .insert({
          contact_id: contactId,
          tenant_id: tenantId,
          status: 'draft',
          section_a_basic: {
            podpowiedzi_brief: briefContent,
            zrodlo_kontaktu: prospect.source_event || 'Prospecting',
          } as any,
        });
    }

    // Trigger AI fill-from-note in background (fire-and-forget)
    if (briefContent.trim()) {
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bi-fill-from-note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          note: briefContent,
          contactName: prospect.full_name,
          companyName: prospect.company || undefined,
        }),
      }).catch(() => {});
    }
  }, [tenantId]);

  useEffect(() => {
    if (!open || !tenantId || !prospect.full_name) return;

    const search = async () => {
      setSearchingDuplicates(true);
      try {
        let query = supabase
          .from('contacts')
          .select('id, full_name, company, email, phone, position')
          .eq('tenant_id', tenantId)
          .ilike('full_name', `%${prospect.full_name.trim()}%`)
          .limit(5);

        const { data } = await query;
        setDuplicates(data || []);
        // Auto-select first duplicate if found
        if (data && data.length > 0) {
          setMode(data[0].id);
        } else {
          setMode('new');
        }
      } catch {
        setDuplicates([]);
        setMode('new');
      } finally {
        setSearchingDuplicates(false);
      }
    };

    search();
  }, [open, tenantId, prospect.full_name]);

  const handleConvert = async () => {
    if (!tenantId || !directorId) {
      toast.error('Brak autoryzacji');
      return;
    }

    setLoading(true);
    try {
      let contactId: string;

      if (mode !== 'new') {
        // MERGE: update existing contact with missing fields
        contactId = mode;
        const updates: Record<string, string> = {};
        const existing = duplicates.find((d) => d.id === contactId);

        if (email && !existing?.email) updates.email = email;
        if (phone && !existing?.phone) updates.phone = phone;
        if (linkedin) updates.linkedin_url = linkedin;

        if (Object.keys(updates).length > 0) {
          await supabase.from('contacts').update(updates).eq('id', contactId);
        }
      } else {
        // CREATE new contact
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
        contactId = contact.id;
      }

      // Check if contact already in team
      const { data: existingTeamContact } = await supabase
        .from('deal_team_contacts')
        .select('id')
        .eq('team_id', teamId)
        .eq('contact_id', contactId)
        .maybeSingle();

      let teamContactId: string;

      if (existingTeamContact) {
        teamContactId = existingTeamContact.id;
        // Update brief if missing
        if (prospect.ai_brief) {
          await supabase
            .from('deal_team_contacts')
            .update({
              ai_brief: prospect.ai_brief,
              ai_brief_generated_at: prospect.ai_brief_generated_at || new Date().toISOString(),
            })
            .eq('id', existingTeamContact.id)
            .is('ai_brief', null);
        }
        toast.info('Kontakt już był w zespole — zaktualizowano');
      } else {
        const { data: teamContact, error: teamError } = await supabase
          .from('deal_team_contacts')
          .insert({
            team_id: teamId,
            contact_id: contactId,
            tenant_id: tenantId,
            category,
            priority: 'medium',
            status: 'active',
            ai_brief: prospect.ai_brief || null,
            ai_brief_generated_at: prospect.ai_brief_generated_at || null,
          })
          .select('id')
          .single();

        if (teamError) throw teamError;
        teamContactId = teamContact.id;
      }

      // Mark prospect as converted
      await (supabase as any)
        .from('meeting_prospects')
        .update({
          prospecting_status: 'converted',
          converted_to_contact_id: contactId,
          converted_to_team_contact_id: teamContactId,
          converted_at: new Date().toISOString(),
        })
        .eq('id', prospectId);

      // Auto-create BI with brief data from prospecting
      if (prospect.ai_brief || prospect.prospecting_notes) {
        try {
          await autoCreateBI(contactId, prospect);
        } catch (biError) {
          console.warn('Auto-create BI failed (non-critical):', biError);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['meeting-prospects', teamId] });
      queryClient.invalidateQueries({ queryKey: ['deal-team-contacts', teamId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });

      const action = mode !== 'new' ? 'scalony' : 'utworzony';
      toast.success(`${prospect.full_name} — kontakt ${action}, dodany jako ${category.toUpperCase()}`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Błąd konwersji: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Konwertuj na kontakt CRM</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Prospect info */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="font-medium">{prospect.full_name}</p>
            <div className="text-sm text-muted-foreground">
              {prospect.company && <span>{prospect.company}</span>}
              {prospect.position && <span> • {prospect.position}</span>}
            </div>
          </div>

          {/* Duplicate detection */}
          {searchingDuplicates ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              Szukam duplikatów...
            </div>
          ) : duplicates.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Znaleziono podobne kontakty</Label>
              <RadioGroup value={mode} onValueChange={setMode}>
                {duplicates.map((dup) => (
                  <div
                    key={dup.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      mode === dup.id ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                    onClick={() => setMode(dup.id)}
                  >
                    <RadioGroupItem value={dup.id} id={dup.id} className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-medium text-sm">{dup.full_name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {dup.company && <span>{dup.company}</span>}
                        {dup.email && <span> • {dup.email}</span>}
                      </div>
                    </div>
                  </div>
                ))}
                <div
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    mode === 'new' ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => setMode('new')}
                >
                  <RadioGroupItem value="new" id="new-contact" className="mt-0.5" />
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Utwórz nowy kontakt</span>
                  </div>
                </div>
              </RadioGroup>
            </div>
          ) : null}

          {/* Contact fields */}
          <div className="space-y-3">
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
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Kategoria na Kanban</Label>
            <div className="flex gap-2">
              {(['cold', 'lead', 'top', 'hot'] as const).map((cat) => (
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
            {mode !== 'new' ? 'Scal i konwertuj' : 'Konwertuj'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
