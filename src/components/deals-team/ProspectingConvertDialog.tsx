import { useState, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle, UserPlus, ClipboardList } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useDealTeams } from '@/hooks/useDealTeams';
import { useTeamMembers } from '@/hooks/useDealsTeamMembers';
import { useCreateAssignment } from '@/hooks/useDealsTeamAssignments';
import { toast } from 'sonner';
import type { MeetingProspect } from '@/hooks/useMeetingProspects';

const TASK_OPTIONS = [
  'Umówić spotkanie',
  'Zadzwonić',
  'Wysłać ofertę',
  'Przygotować audyt',
  'Inne...',
] as const;

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
  teamId?: string;
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

  // Team selection (when teamId not provided)
  const { data: dealTeams = [] } = useDealTeams();
  const [selectedTeamId, setSelectedTeamId] = useState(teamId || '');
  const effectiveTeamId = teamId || selectedTeamId;

  const [email, setEmail] = useState(prospect.email || '');
  const [phone, setPhone] = useState(prospect.phone || '');
  const [linkedin, setLinkedin] = useState(prospect.linkedin_url || '');
  const [category, setCategory] = useState<'cold' | 'lead' | 'top' | 'hot' | '10x' | 'lost' | 'client' | 'audit'>('cold');
  const [loading, setLoading] = useState(false);

  // Task assignment
  const createAssignment = useCreateAssignment();
  const { data: teamMembers = [] } = useTeamMembers(effectiveTeamId || undefined);
  const [createTask, setCreateTask] = useState(true);
  const [taskTitle, setTaskTitle] = useState('Umówić spotkanie');
  const [customTaskTitle, setCustomTaskTitle] = useState('');
  const [taskAssignedTo, setTaskAssignedTo] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskNotes, setTaskNotes] = useState('');

  // Duplicate detection
  const [duplicates, setDuplicates] = useState<FoundContact[]>([]);
  const [searchingDuplicates, setSearchingDuplicates] = useState(false);
  const [mode, setMode] = useState<'new' | string>('new'); // 'new' or contact ID

  /** Auto-create BI record with brief from prospecting (BI 2.0).
   * AI-fill is triggered later via Sovra (tool fill_bi_from_notes). */
  const autoCreateBI = useCallback(async (contactId: string, prospect: MeetingProspect) => {
    if (!tenantId) return;

    const briefContent = [prospect.ai_brief, prospect.prospecting_notes].filter(Boolean).join('\n\n');
    if (!briefContent.trim()) return;

    // Append brief to contact notes (one source of truth dla Sovry)
    const { data: c } = await supabase
      .from('contacts')
      .select('notes')
      .eq('id', contactId)
      .maybeSingle();

    const stamp = new Date().toLocaleString('pl-PL');
    const prefix = `[Prospecting ${stamp}${prospect.source_event ? ` · ${prospect.source_event}` : ''}]`;
    const newNotes = (c?.notes ? c.notes + '\n\n' : '') + `${prefix}\n${briefContent}`;

    await supabase.from('contacts').update({ notes: newNotes }).eq('id', contactId);

    // Seed empty contact_bi row (Sovra wypełni odpowiedzi przez fill_bi_from_notes)
    await supabase
      .from('contact_bi')
      .upsert({ contact_id: contactId, tenant_id: tenantId, answers: {}, filled_by_ai: false }, { onConflict: 'contact_id' });
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
        // Resolve company_id before creating contact
        let companyId: string | null = null;
        if (prospect.company && tenantId) {
          const trimmedName = prospect.company.trim();
          const { data: existingCompany } = await supabase
            .from('companies')
            .select('id')
            .eq('tenant_id', tenantId)
            .ilike('name', trimmedName)
            .limit(1)
            .maybeSingle();

          if (existingCompany) {
            companyId = existingCompany.id;
          } else {
            const { data: newCompany } = await supabase
              .from('companies')
              .insert({ name: trimmedName, tenant_id: tenantId, company_status: 'pending' })
              .select('id')
              .single();
            companyId = newCompany?.id || null;
          }
        }

        // CREATE new contact
        const { data: contact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            full_name: prospect.full_name,
            company: prospect.company,
            company_id: companyId,
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

      if (!effectiveTeamId) {
        toast.error('Wybierz zespół Deals');
        return;
      }

      // Check if contact already in team
      const { data: existingTeamContact } = await supabase
        .from('deal_team_contacts')
        .select('id')
        .eq('team_id', effectiveTeamId)
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
            team_id: effectiveTeamId,
            contact_id: contactId,
            tenant_id: tenantId,
            category,
            priority: 'medium',
            status: category === 'client' ? 'won' : 'active',
            ai_brief: prospect.ai_brief || null,
            ai_brief_generated_at: prospect.ai_brief_generated_at || null,
          })
          .select('id')
          .single();

        if (teamError) throw teamError;
        teamContactId = teamContact.id;
      }

      // Mark prospect as converted
      await supabase
        .from('prospects')
        .update({
          status: 'converted',
          converted_to_contact_id: contactId,
          converted_to_team_contact_id: teamContactId,
          converted_at: new Date().toISOString(),
        })
        .eq('id', prospectId);

      // Create task assignment if enabled
      const finalTaskTitle = taskTitle === 'Inne...' ? customTaskTitle.trim() : taskTitle;
      if (createTask && finalTaskTitle && taskAssignedTo && effectiveTeamId) {
        try {
          await createAssignment.mutateAsync({
            teamContactId,
            teamId: effectiveTeamId,
            assignedTo: taskAssignedTo,
            title: finalTaskTitle,
            description: taskNotes.trim() || undefined,
            dueDate: taskDueDate || undefined,
            priority: 'medium',
          });
        } catch (taskError) {
          console.warn('Task creation failed (non-critical):', taskError);
        }
      }

      // Auto-create BI with brief data from prospecting
      if (prospect.ai_brief || prospect.prospecting_notes) {
        try {
          await autoCreateBI(contactId, prospect);
        } catch (biError) {
          console.warn('Auto-create BI failed (non-critical):', biError);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['meeting-prospects', effectiveTeamId] });
      queryClient.invalidateQueries({ queryKey: ['deal-team-contacts', effectiveTeamId] });
      queryClient.invalidateQueries({ queryKey: ['deal-team-clients', effectiveTeamId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });

      const action = mode !== 'new' ? 'scalony' : 'utworzony';
      toast.success(`${prospect.full_name} — kontakt ${action}, dodany jako ${category === 'client' ? 'KLIENT' : category.toUpperCase()}`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Błąd konwersji: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Konwertuj na kontakt CRM</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Team selection (when no fixed teamId) */}
          {!teamId && (
            <div className="space-y-2">
              <Label>Zespół Deals *</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz zespół..." />
                </SelectTrigger>
                <SelectContent>
                  {dealTeams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
              {(['cold', '10x', 'lead', 'top', 'audit', 'hot', 'client'] as const).map((cat) => (
                <Button
                  key={cat}
                  variant={category === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategory(cat)}
                >
                  {cat === 'client' ? 'KLIENT' : cat === '10x' ? '10x' : cat === 'audit' ? 'AUDYT' : cat.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>

          {/* Task assignment */}
          <div className="space-y-3 border rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="create-task"
                checked={createTask}
                onCheckedChange={(v) => setCreateTask(!!v)}
              />
              <label htmlFor="create-task" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                Pierwsze zadanie
              </label>
            </div>

            {createTask && (
              <div className="space-y-3 pl-6">
                <div className="space-y-2">
                  <Label className="text-xs">Zadanie</Label>
                  <Select value={taskTitle} onValueChange={setTaskTitle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {taskTitle === 'Inne...' && (
                    <Input
                      value={customTaskTitle}
                      onChange={(e) => setCustomTaskTitle(e.target.value)}
                      placeholder="Wpisz tytuł zadania..."
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Przypisz do</Label>
                  <Select value={taskAssignedTo} onValueChange={setTaskAssignedTo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz osobę..." />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((m) => (
                        <SelectItem key={m.director?.id || m.id} value={m.director?.id || m.id}>
                          {m.director?.full_name || 'Członek zespołu'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Termin</Label>
                  <Input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Uwagi</Label>
                  <Textarea
                    value={taskNotes}
                    onChange={(e) => setTaskNotes(e.target.value)}
                    placeholder="Dodatkowe informacje..."
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={handleConvert} disabled={loading || (!teamId && !selectedTeamId)}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode !== 'new' ? 'Scal i konwertuj' : 'Konwertuj'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
