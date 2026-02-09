import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConnectionContactSelect } from '@/components/network/ConnectionContactSelect';
import { useCreateWantedContact, useCompanyByNip } from '@/hooks/useWantedContacts';
import { User, Building2, Loader2 } from 'lucide-react';

interface WantedContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedContactId?: string;
}

export function WantedContactModal({ open, onOpenChange, preselectedContactId }: WantedContactModalProps) {
  const createWanted = useCreateWantedContact();

  const [requestedBy, setRequestedBy] = useState<string | null>(preselectedContactId || null);
  const [personName, setPersonName] = useState('');
  const [personPosition, setPersonPosition] = useState('');
  const [personContext, setPersonContext] = useState('');
  const [personEmail, setPersonEmail] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [personLinkedin, setPersonLinkedin] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyNip, setCompanyNip] = useState('');
  const [companyRegon, setCompanyRegon] = useState('');
  const [companyIndustry, setCompanyIndustry] = useState('');
  const [companyContext, setCompanyContext] = useState('');
  const [searchContext, setSearchContext] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [notes, setNotes] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);

  const { data: nipCompany, isFetching: nipLoading } = useCompanyByNip(companyNip);

  useEffect(() => {
    if (nipCompany) {
      setCompanyName(nipCompany.name);
      setCompanyIndustry(nipCompany.industry || '');
      setCompanyId(nipCompany.id);
    } else {
      setCompanyId(null);
    }
  }, [nipCompany]);

  useEffect(() => {
    if (preselectedContactId) setRequestedBy(preselectedContactId);
  }, [preselectedContactId]);

  const canSubmit = !!requestedBy && (!!personName.trim() || !!companyName.trim());

  const handleSubmit = () => {
    if (!canSubmit) return;
    createWanted.mutate(
      {
        requested_by_contact_id: requestedBy!,
        person_name: personName.trim() || null,
        person_position: personPosition.trim() || null,
        person_email: personEmail.trim() || null,
        person_phone: personPhone.trim() || null,
        person_linkedin: personLinkedin.trim() || null,
        person_context: personContext.trim() || null,
        company_name: companyName.trim() || null,
        company_nip: companyNip.trim() || null,
        company_regon: companyRegon.trim() || null,
        company_industry: companyIndustry.trim() || null,
        company_id: companyId,
        company_context: companyContext.trim() || null,
        search_context: searchContext.trim() || null,
        notes: notes.trim() || null,
        urgency,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          resetForm();
        },
      }
    );
  };

  const resetForm = () => {
    setRequestedBy(preselectedContactId || null);
    setPersonName('');
    setPersonPosition('');
    setPersonContext('');
    setPersonEmail('');
    setPersonPhone('');
    setPersonLinkedin('');
    setCompanyName('');
    setCompanyNip('');
    setCompanyRegon('');
    setCompanyIndustry('');
    setCompanyContext('');
    setSearchContext('');
    setUrgency('normal');
    setNotes('');
    setCompanyId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dodaj poszukiwany kontakt</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Kto szuka */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Kto szuka *</Label>
            <ConnectionContactSelect
              value={requestedBy}
              onChange={setRequestedBy}
              placeholder="Wybierz kontakt, który szuka..."
            />
          </div>

          {/* Kogo szukamy */}
          <Tabs defaultValue="person">
            <Label className="text-sm font-semibold">Kogo szukamy (przynajmniej jedno)</Label>
            <TabsList className="mt-2 w-full grid grid-cols-2">
              <TabsTrigger value="person" className="gap-1.5">
                <User className="h-3.5 w-3.5" /> Osoba
              </TabsTrigger>
              <TabsTrigger value="company" className="gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Firma
              </TabsTrigger>
            </TabsList>

            <TabsContent value="person" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Imię i nazwisko</Label>
                  <Input value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="np. Krzysztof Kowalski" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Stanowisko</Label>
                  <Input value={personPosition} onChange={(e) => setPersonPosition(e.target.value)} placeholder="np. CEO, CTO" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Opis osoby</Label>
                <Textarea value={personContext} onChange={(e) => setPersonContext(e.target.value)} placeholder="np. znany lekarz, ekspert od AI, profesor na politechnice..." rows={2} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input value={personEmail} onChange={(e) => setPersonEmail(e.target.value)} type="email" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Telefon</Label>
                  <Input value={personPhone} onChange={(e) => setPersonPhone(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">LinkedIn</Label>
                  <Input value={personLinkedin} onChange={(e) => setPersonLinkedin(e.target.value)} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="company" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">NIP firmy</Label>
                  <div className="relative">
                    <Input value={companyNip} onChange={(e) => setCompanyNip(e.target.value)} placeholder="np. 1234567890" />
                    {nipLoading && <Loader2 className="h-4 w-4 animate-spin absolute right-2 top-2.5 text-muted-foreground" />}
                  </div>
                  {nipCompany && <p className="text-xs text-green-500">Znaleziono: {nipCompany.name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">REGON</Label>
                  <Input value={companyRegon} onChange={(e) => setCompanyRegon(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nazwa firmy</Label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="np. ABC Sp. z o.o." />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Branża</Label>
                  <Input value={companyIndustry} onChange={(e) => setCompanyIndustry(e.target.value)} placeholder="np. IT, Medycyna" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Opis roli w firmie</Label>
                <Textarea value={companyContext} onChange={(e) => setCompanyContext(e.target.value)} placeholder="np. szef logistyki, ktoś z zarządu, dyrektor finansowy..." rows={2} />
              </div>
            </TabsContent>
          </Tabs>

          {/* Dodatkowe */}
          <div className="space-y-3 border-t pt-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Kontekst poszukiwania</Label>
              <Textarea value={searchContext} onChange={(e) => setSearchContext(e.target.value)} placeholder="Dlaczego szukamy, co chcemy osiągnąć..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Pilność</Label>
                <Select value={urgency} onValueChange={setUrgency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Niska</SelectItem>
                    <SelectItem value="normal">Normalna</SelectItem>
                    <SelectItem value="high">Wysoka</SelectItem>
                    <SelectItem value="critical">Krytyczna</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notatki wewnętrzne</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Anuluj</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || createWanted.isPending}>
            {createWanted.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            Dodaj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
