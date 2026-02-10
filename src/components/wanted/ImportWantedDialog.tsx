import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConnectionContactSelect } from '@/components/network/ConnectionContactSelect';
import { useCreateWantedContact } from '@/hooks/useWantedContacts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Sparkles, Check, X, CheckCheck, User, Building2 } from 'lucide-react';

interface ParsedItem {
  person_name: string | null;
  person_position: string | null;
  person_context: string | null;
  company_name: string | null;
  company_nip: string | null;
  company_industry: string | null;
  company_context: string | null;
  search_context: string | null;
  urgency: string;
}

interface ReviewItem extends ParsedItem {
  _id: string;
  _status: 'pending' | 'approved' | 'rejected';
}

interface ImportWantedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const urgencyLabels: Record<string, string> = {
  low: 'Niska',
  normal: 'Normalna',
  high: 'Wysoka',
  critical: 'Krytyczna',
};

const urgencyColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  normal: 'bg-primary/10 text-primary',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-destructive/10 text-destructive',
};

export function ImportWantedDialog({ open, onOpenChange }: ImportWantedDialogProps) {
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [requestedBy, setRequestedBy] = useState<string | null>(null);
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const createWanted = useCreateWantedContact();

  const handleParse = async () => {
    if (!rawText.trim()) return;
    setIsParsing(true);

    try {
      const { data, error } = await supabase.functions.invoke('parse-wanted-list', {
        body: { content: rawText.trim() },
      });

      if (error) throw error;

      const parsed: ParsedItem[] = data?.items || [];
      if (parsed.length === 0) {
        toast.warning('AI nie rozpoznało żadnych poszukiwanych kontaktów w tekście.');
        setIsParsing(false);
        return;
      }

      setItems(parsed.map((item, i) => ({
        ...item,
        _id: `item-${i}-${Date.now()}`,
        _status: 'pending',
      })));
      setStep('review');
      toast.success(`Rozpoznano ${parsed.length} pozycji`);
    } catch (err: any) {
      console.error('Parse error:', err);
      toast.error(err.message || 'Błąd parsowania listy');
    } finally {
      setIsParsing(false);
    }
  };

  const updateItem = (id: string, field: keyof ParsedItem, value: string | null) => {
    setItems(prev => prev.map(it =>
      it._id === id ? { ...it, [field]: value } : it
    ));
  };

  const approveItem = async (item: ReviewItem) => {
    if (!requestedBy) return;
    setItems(prev => prev.map(it =>
      it._id === item._id ? { ...it, _status: 'approved' as const } : it
    ));

    createWanted.mutate({
      requested_by_contact_id: requestedBy,
      person_name: item.person_name,
      person_position: item.person_position,
      person_context: item.person_context,
      company_name: item.company_name,
      company_nip: item.company_nip,
      company_industry: item.company_industry,
      company_context: item.company_context,
      search_context: item.search_context,
      urgency: item.urgency,
    });
  };

  const rejectItem = (id: string) => {
    setItems(prev => prev.map(it =>
      it._id === id ? { ...it, _status: 'rejected' as const } : it
    ));
  };

  const pendingItems = items.filter(it => it._status === 'pending');

  const approveAll = () => {
    pendingItems.forEach(item => approveItem(item));
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep('input');
      setRawText('');
      setItems([]);
      setRequestedBy(null);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Importuj listę poszukiwanych
          </DialogTitle>
        </DialogHeader>

        {step === 'input' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Kto szuka *</Label>
              <ConnectionContactSelect
                value={requestedBy}
                onChange={setRequestedBy}
                placeholder="Wybierz kontakt, który szuka..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Wklej listę</Label>
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Wklej dowolną listę, np.:\n\nJan Kowalski, CEO, ABC Sp. z o.o. — szukamy dostawcy IT\nAnna Nowak, dyrektor finansowy w branży medycznej\nFirma XYZ, NIP 1234567890, potrzebujemy pilnie kontaktu z zarządem`}
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Anuluj</Button>
              <Button
                onClick={handleParse}
                disabled={!requestedBy || !rawText.trim() || isParsing}
                className="gap-1.5"
              >
                {isParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Analizuj z AI
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Actions bar */}
            {pendingItems.length > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {pendingItems.length} do zatwierdzenia • {items.filter(i => i._status === 'approved').length} zatwierdzonych
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setStep('input')}>
                    ← Wróć
                  </Button>
                  <Button size="sm" onClick={approveAll} className="gap-1.5">
                    <CheckCheck className="h-4 w-4" />
                    Zatwierdź wszystkie ({pendingItems.length})
                  </Button>
                </div>
              </div>
            )}

            {pendingItems.length === 0 && (
              <div className="text-center py-6">
                <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Wszystkie pozycje zostały przetworzone</p>
                <Button variant="outline" className="mt-3" onClick={handleClose}>Zamknij</Button>
              </div>
            )}

            {/* Item cards */}
            <div className="space-y-3">
              {items.filter(it => it._status === 'pending').map((item) => (
                <Card key={item._id} className="border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {item.person_name && <User className="h-4 w-4 text-muted-foreground" />}
                        {item.company_name && <Building2 className="h-4 w-4 text-muted-foreground" />}
                        <span className="font-medium text-sm">
                          {[item.person_name, item.company_name].filter(Boolean).join(' — ')}
                        </span>
                      </div>
                      <Badge className={urgencyColors[item.urgency] || ''} variant="secondary">
                        {urgencyLabels[item.urgency] || item.urgency}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Imię i nazwisko</Label>
                        <Input
                          value={item.person_name || ''}
                          onChange={(e) => updateItem(item._id, 'person_name', e.target.value || null)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Stanowisko</Label>
                        <Input
                          value={item.person_position || ''}
                          onChange={(e) => updateItem(item._id, 'person_position', e.target.value || null)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Firma</Label>
                        <Input
                          value={item.company_name || ''}
                          onChange={(e) => updateItem(item._id, 'company_name', e.target.value || null)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Branża</Label>
                        <Input
                          value={item.company_industry || ''}
                          onChange={(e) => updateItem(item._id, 'company_industry', e.target.value || null)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>

                    {(item.person_context || item.company_context || item.search_context) && (
                      <div className="space-y-2">
                        {item.search_context && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Kontekst poszukiwania</Label>
                            <Textarea
                              value={item.search_context || ''}
                              onChange={(e) => updateItem(item._id, 'search_context', e.target.value || null)}
                              rows={1}
                              className="text-sm"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Select
                        value={item.urgency}
                        onValueChange={(v) => updateItem(item._id, 'urgency', v)}
                      >
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Niska</SelectItem>
                          <SelectItem value="normal">Normalna</SelectItem>
                          <SelectItem value="high">Wysoka</SelectItem>
                          <SelectItem value="critical">Krytyczna</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex-1" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => rejectItem(item._id)}
                        className="text-destructive hover:text-destructive gap-1"
                      >
                        <X className="h-3.5 w-3.5" /> Odrzuć
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => approveItem(item)}
                        className="gap-1"
                      >
                        <Check className="h-3.5 w-3.5" /> Zatwierdź
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Show approved/rejected summary */}
            {items.filter(it => it._status !== 'pending').length > 0 && pendingItems.length > 0 && (
              <div className="text-xs text-muted-foreground border-t pt-2">
                {items.filter(it => it._status === 'approved').length > 0 && (
                  <span className="text-green-600">✓ {items.filter(it => it._status === 'approved').length} zatwierdzonych</span>
                )}
                {items.filter(it => it._status === 'rejected').length > 0 && (
                  <span className="ml-3 text-destructive">✗ {items.filter(it => it._status === 'rejected').length} odrzuconych</span>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
