import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Plus, Target } from 'lucide-react';
import { useContactWantedContacts } from '@/hooks/useWantedContacts';
import { WantedContactCard } from '@/components/wanted/WantedContactCard';
import { WantedContactModal } from '@/components/wanted/WantedContactModal';

export function ContactWantedTab({ contactId }: { contactId: string }) {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: items, isLoading } = useContactWantedContacts(contactId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Poszukiwani przez ten kontakt</h3>
        <Button size="sm" variant="outline" onClick={() => setModalOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Dodaj
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : !items || items.length === 0 ? (
        <Card><CardContent className="py-8 text-center"><Target className="h-10 w-10 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">Brak poszukiwanych</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => <WantedContactCard key={item.id} item={item} />)}
        </div>
      )}

      <WantedContactModal open={modalOpen} onOpenChange={setModalOpen} preselectedContactId={contactId} />
    </div>
  );
}
