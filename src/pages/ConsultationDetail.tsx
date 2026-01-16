import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConsultation } from '@/hooks/useConsultations';
import { ConsultationDetailHeader } from '@/components/consultations/ConsultationDetailHeader';
import { ConsultationPreparationSection } from '@/components/consultations/ConsultationPreparationSection';
import { ConsultationAgendaSection } from '@/components/consultations/ConsultationAgendaSection';
import { ConsultationNotesSection } from '@/components/consultations/ConsultationNotesSection';
import { ConsultationSummarySection } from '@/components/consultations/ConsultationSummarySection';
import { ConsultationTasksSection } from '@/components/consultations/ConsultationTasksSection';
import { ConsultationModal } from '@/components/consultations/ConsultationModal';

export default function ConsultationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: consultation, isLoading, error } = useConsultation(id);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !consultation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Nie znaleziono konsultacji</p>
        <Button onClick={() => navigate('/consultations')}>Powrót do listy</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConsultationDetailHeader
        consultation={consultation}
        onEdit={() => setIsEditModalOpen(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <ConsultationPreparationSection
            consultationId={consultation.id}
            preparationBrief={consultation.preparation_brief}
          />
          <ConsultationAgendaSection
            consultationId={consultation.id}
            agenda={consultation.agenda}
          />
          <ConsultationTasksSection consultation={consultation} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <ConsultationNotesSection
            consultationId={consultation.id}
            notes={consultation.notes}
          />
          <ConsultationSummarySection consultation={consultation} />
        </div>
      </div>

      <ConsultationModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        consultation={consultation}
      />
    </div>
  );
}
