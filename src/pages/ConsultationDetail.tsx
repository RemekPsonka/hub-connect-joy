import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, MessageCircle, ClipboardList, Sparkles } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useConsultation } from '@/hooks/useConsultations';
import { ConsultationDetailHeader } from '@/components/consultations/ConsultationDetailHeader';
import { ConsultationBriefChat } from '@/components/consultations/ConsultationBriefChat';
import { ConsultationQuestionnaire } from '@/components/consultations/ConsultationQuestionnaire';
import { ConsultationSummaryChat } from '@/components/consultations/ConsultationSummaryChat';
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
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/consultations">Konsultacje</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {consultation.contacts?.full_name 
                ? `Konsultacja z ${consultation.contacts.full_name}` 
                : 'Konsultacja'}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <ConsultationDetailHeader
        consultation={consultation}
        onEdit={() => setIsEditModalOpen(true)}
      />

      <Tabs defaultValue="questionnaire" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="brief" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Brief AI</span>
            <span className="sm:hidden">Brief</span>
          </TabsTrigger>
          <TabsTrigger value="questionnaire" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Arkusz KI</span>
            <span className="sm:hidden">Arkusz</span>
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Podsumowanie AI</span>
            <span className="sm:hidden">Podsum.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="brief" className="mt-6">
          <ConsultationBriefChat consultation={consultation} />
        </TabsContent>

        <TabsContent value="questionnaire" className="mt-6">
          <ConsultationQuestionnaire consultation={consultation} />
        </TabsContent>

        <TabsContent value="summary" className="mt-6">
          <ConsultationSummaryChat consultation={consultation} />
        </TabsContent>
      </Tabs>

      {/* Tasks section below tabs */}
      <ConsultationTasksSection consultation={consultation} />

      <ConsultationModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        consultation={consultation}
      />
    </div>
  );
}
