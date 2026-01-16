import { useState } from 'react';
import { Plus, Target, Gift } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useContactNeeds, useContactOffers } from '@/hooks/useContacts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { generateEmbeddingInBackground } from '@/hooks/useEmbeddings';

interface ContactNeedsOffersTabProps {
  contactId: string;
}

const priorityLabels: Record<string, string> = {
  low: 'Niski',
  medium: 'Średni',
  high: 'Wysoki',
};

const priorityColors: Record<string, string> = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500',
};

const statusLabels: Record<string, string> = {
  active: 'Aktywny',
  fulfilled: 'Zrealizowany',
  cancelled: 'Anulowany',
};

export function ContactNeedsOffersTab({ contactId }: ContactNeedsOffersTabProps) {
  const { director } = useAuth();
  const queryClient = useQueryClient();
  const { data: needs = [] } = useContactNeeds(contactId);
  const { data: offers = [] } = useContactOffers(contactId);

  const [newNeedTitle, setNewNeedTitle] = useState('');
  const [newOfferTitle, setNewOfferTitle] = useState('');
  const [isAddingNeed, setIsAddingNeed] = useState(false);
  const [isAddingOffer, setIsAddingOffer] = useState(false);

  const handleAddNeed = async () => {
    if (!newNeedTitle.trim() || !director?.tenant_id) return;

    const { data: newNeed, error } = await supabase.from('needs').insert({
      title: newNeedTitle.trim(),
      contact_id: contactId,
      tenant_id: director.tenant_id,
    }).select('id').single();

    if (error) {
      toast.error('Nie udało się dodać potrzeby');
    } else {
      toast.success('Potrzeba dodana');
      setNewNeedTitle('');
      setIsAddingNeed(false);
      queryClient.invalidateQueries({ queryKey: ['contact_needs', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contact_stats', contactId] });
      
      // Generate embedding in background
      if (newNeed) {
        generateEmbeddingInBackground('need', newNeed.id);
      }
    }
  };

  const handleAddOffer = async () => {
    if (!newOfferTitle.trim() || !director?.tenant_id) return;

    const { data: newOffer, error } = await supabase.from('offers').insert({
      title: newOfferTitle.trim(),
      contact_id: contactId,
      tenant_id: director.tenant_id,
    }).select('id').single();

    if (error) {
      toast.error('Nie udało się dodać oferty');
    } else {
      toast.success('Oferta dodana');
      setNewOfferTitle('');
      setIsAddingOffer(false);
      queryClient.invalidateQueries({ queryKey: ['contact_offers', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contact_stats', contactId] });
      
      // Generate embedding in background
      if (newOffer) {
        generateEmbeddingInBackground('offer', newOffer.id);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Needs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Potrzeby
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingNeed(true)}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Dodaj
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {isAddingNeed && (
            <div className="flex gap-2">
              <Input
                placeholder="Tytuł potrzeby..."
                value={newNeedTitle}
                onChange={(e) => setNewNeedTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNeed()}
              />
              <Button size="sm" onClick={handleAddNeed}>
                Dodaj
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAddingNeed(false);
                  setNewNeedTitle('');
                }}
              >
                Anuluj
              </Button>
            </div>
          )}

          {needs.length === 0 && !isAddingNeed ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Brak potrzeb
            </p>
          ) : (
            needs.map((need) => (
              <div
                key={need.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{need.title}</p>
                  {need.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {need.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`${priorityColors[need.priority || 'medium']} text-white border-0`}
                  >
                    {priorityLabels[need.priority || 'medium']}
                  </Badge>
                  <Badge variant="secondary">
                    {statusLabels[need.status || 'active']}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Offers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Oferty
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingOffer(true)}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Dodaj
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {isAddingOffer && (
            <div className="flex gap-2">
              <Input
                placeholder="Tytuł oferty..."
                value={newOfferTitle}
                onChange={(e) => setNewOfferTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddOffer()}
              />
              <Button size="sm" onClick={handleAddOffer}>
                Dodaj
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAddingOffer(false);
                  setNewOfferTitle('');
                }}
              >
                Anuluj
              </Button>
            </div>
          )}

          {offers.length === 0 && !isAddingOffer ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Brak ofert
            </p>
          ) : (
            offers.map((offer) => (
              <div
                key={offer.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{offer.title}</p>
                  {offer.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {offer.description}
                    </p>
                  )}
                </div>
                <Badge variant="secondary">
                  {statusLabels[offer.status || 'active']}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
