import { useState, useEffect } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { useBusinessInterview, useSaveBusinessInterview, useProcessBIWithAI, validateBIForAI } from '@/hooks/useBusinessInterview';
import { BIActionBar } from './BIActionBar';
import {
  SectionABasic,
  SectionCCompanyProfile,
  SectionDScale,
  SectionFStrategy,
  SectionGNeeds,
  SectionHInvestments,
  SectionJValueForCC,
  SectionKEngagement,
  SectionLPersonal,
  SectionMOrganizations,
  SectionNFollowup,
} from './sections';
import type { BusinessInterview, SectionABasic as SectionAType, SectionCCompanyProfile as SectionCType, SectionDScale as SectionDType, SectionFStrategy as SectionFType, SectionGNeeds as SectionGType, SectionHInvestments as SectionHType, SectionJValueForCC as SectionJType, SectionKEngagement as SectionKType, SectionLPersonal as SectionLType, SectionMOrganizations as SectionMType, SectionNFollowup as SectionNType } from './types';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BITabProps {
  contactId: string;
  contactName: string;
}

export function BITab({ contactId, contactName }: BITabProps) {
  const { data: biData, isLoading } = useBusinessInterview(contactId);
  const saveMutation = useSaveBusinessInterview();
  const processBI = useProcessBIWithAI();
  const [formData, setFormData] = useState<Partial<BusinessInterview>>({});
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  // Sekcje domyślnie otwarte: A, C, G, N
  const [openSections, setOpenSections] = useState<string[]>([
    'section-a', 'section-c', 'section-g', 'section-n'
  ]);

  // Initialize form data from loaded biData
  useEffect(() => {
    if (biData) {
      setFormData({
        section_a_basic: biData.section_a_basic as SectionAType || {},
        section_c_company_profile: biData.section_c_company_profile as SectionCType || {},
        section_d_scale: biData.section_d_scale as SectionDType || {},
        section_f_strategy: biData.section_f_strategy as SectionFType || {},
        section_g_needs: biData.section_g_needs as SectionGType || {},
        section_h_investments: biData.section_h_investments as SectionHType || {},
        section_j_value_for_cc: biData.section_j_value_for_cc as SectionJType || {},
        section_k_engagement: biData.section_k_engagement as SectionKType || {},
        section_l_personal: biData.section_l_personal as SectionLType || {},
        section_m_organizations: biData.section_m_organizations as SectionMType || {},
        section_n_followup: biData.section_n_followup as SectionNType || {},
      });
    }
  }, [biData]);

  const mergedData: Partial<BusinessInterview> = {
    ...biData,
    ...formData,
  };

  const validation = validateBIForAI(mergedData);

  const handleSectionChange = <T extends keyof BusinessInterview>(section: T, data: BusinessInterview[T]) => {
    setFormData(prev => ({ ...prev, [section]: data }));
  };

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({ 
        contactId, 
        data: formData, 
        existingId: biData?.id 
      });
      toast.success('Zapisano dane BI');
    } catch (error) {
      toast.error('Błąd podczas zapisywania');
    }
  };

  const handleSaveAndClose = async () => {
    try {
      await saveMutation.mutateAsync({ 
        contactId, 
        data: formData, 
        existingId: biData?.id 
      });
      toast.success('Zapisano dane BI');
      // Could navigate back or close modal if needed
    } catch (error) {
      toast.error('Błąd podczas zapisywania');
    }
  };

  const handleProcessAI = async () => {
    if (!biData?.id) {
      toast.error('Najpierw zapisz dane BI');
      return;
    }
    
    setIsProcessingAI(true);
    try {
      await processBI.mutateAsync({ biId: biData.id });
      toast.success('AI przeanalizowało dane BI');
    } catch (error) {
      console.error('AI processing error:', error);
      toast.error('Błąd przetwarzania AI');
    } finally {
      setIsProcessingAI(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BIActionBar
        biData={mergedData as BusinessInterview}
        validation={validation}
        isSaving={saveMutation.isPending}
        isProcessingAI={isProcessingAI}
        onSave={handleSave}
        onSaveAndClose={handleSaveAndClose}
        onProcessAI={handleProcessAI}
        onShowHistory={() => toast.info('Historia wersji zostanie dodana wkrótce')}
      />

      <Card>
        <CardContent className="pt-6">
          <Accordion 
            type="multiple" 
            value={openSections} 
            onValueChange={setOpenSections}
            className="space-y-2"
          >
            {/* Sekcja A: Dane podstawowe */}
            <AccordionItem value="section-a" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                A. Dane podstawowe
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <SectionABasic 
                  data={(formData.section_a_basic || biData?.section_a_basic || {}) as SectionAType}
                  contactName={contactName}
                  onChange={(data) => handleSectionChange('section_a_basic', data)}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Sekcja C: Firma główna - profil */}
            <AccordionItem value="section-c" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                C. Firma główna – profil
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <SectionCCompanyProfile
                  data={(formData.section_c_company_profile || biData?.section_c_company_profile || {}) as SectionCType}
                  onChange={(data) => handleSectionChange('section_c_company_profile', data)}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Sekcja D: Skala działalności */}
            <AccordionItem value="section-d" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                D. Skala działalności
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <SectionDScale
                  data={(formData.section_d_scale || biData?.section_d_scale || {}) as SectionDType}
                  onChange={(data) => handleSectionChange('section_d_scale', data)}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Sekcja F: Strategia */}
            <AccordionItem value="section-f" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                F. Strategia 2-3 lata
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <SectionFStrategy
                  data={(formData.section_f_strategy || biData?.section_f_strategy || {}) as SectionFType}
                  onChange={(data) => handleSectionChange('section_f_strategy', data)}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Sekcja G: Potrzeby */}
            <AccordionItem value="section-g" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                G. Czego szuka
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <SectionGNeeds
                  data={(formData.section_g_needs || biData?.section_g_needs || {}) as SectionGType}
                  onChange={(data) => handleSectionChange('section_g_needs', data)}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Sekcja H: Inwestycje */}
            <AccordionItem value="section-h" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                H. Inwestycje
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <SectionHInvestments
                  data={(formData.section_h_investments || biData?.section_h_investments || {}) as SectionHType}
                  onChange={(data) => handleSectionChange('section_h_investments', data)}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Sekcja J: Wartość dla CC */}
            <AccordionItem value="section-j" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                J. Wartość dla CC
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <SectionJValueForCC
                  data={(formData.section_j_value_for_cc || biData?.section_j_value_for_cc || {}) as SectionJType}
                  onChange={(data) => handleSectionChange('section_j_value_for_cc', data)}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Sekcja K: Zaangażowanie */}
            <AccordionItem value="section-k" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                K. Zaangażowanie w CC
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <SectionKEngagement
                  data={(formData.section_k_engagement || biData?.section_k_engagement || {}) as SectionKType}
                  onChange={(data) => handleSectionChange('section_k_engagement', data)}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Sekcja L: Dane osobiste */}
            <AccordionItem value="section-l" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                L. Sfera osobista
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <SectionLPersonal
                  data={(formData.section_l_personal || biData?.section_l_personal || {}) as SectionLType}
                  onChange={(data) => handleSectionChange('section_l_personal', data)}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Sekcja M: Organizacje */}
            <AccordionItem value="section-m" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                M. Organizacje i członkostwa
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <SectionMOrganizations
                  data={(formData.section_m_organizations || biData?.section_m_organizations || {}) as SectionMType}
                  onChange={(data) => handleSectionChange('section_m_organizations', data)}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Sekcja N: Follow-up */}
            <AccordionItem value="section-n" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                N. Follow-up i notatki
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <SectionNFollowup
                  data={(formData.section_n_followup || biData?.section_n_followup || {}) as SectionNType}
                  onChange={(data) => handleSectionChange('section_n_followup', data)}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
