import { useState, useEffect } from 'react';
import { Edit2, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateConsultation } from '@/hooks/useConsultations';
import { useToast } from '@/hooks/use-toast';

interface ConsultationAgendaSectionProps {
  consultationId: string;
  agenda: string | null;
}

export function ConsultationAgendaSection({ consultationId, agenda }: ConsultationAgendaSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(agenda || '');
  const { toast } = useToast();
  const updateConsultation = useUpdateConsultation();

  useEffect(() => {
    setEditValue(agenda || '');
  }, [agenda]);

  const handleSave = async () => {
    try {
      await updateConsultation.mutateAsync({
        id: consultationId,
        agenda: editValue || null,
      });
      setIsEditing(false);
      toast({
        title: 'Zapisano',
        description: 'Agenda została zaktualizowana.',
      });
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać agendy.',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    setEditValue(agenda || '');
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Agenda</CardTitle>
          {!isEditing && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="Co chcesz omówić na spotkaniu?"
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                Anuluj
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updateConsultation.isPending}>
                <Save className="h-4 w-4 mr-1" />
                Zapisz
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {agenda || 'Brak agendy. Kliknij edytuj, aby dodać.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
