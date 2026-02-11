import { useState, useEffect, useMemo } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { useBusinessInterview, useSaveBusinessInterview, useProcessBIWithAI, validateBIForAI, useFillBIFromNote } from '@/hooks/useBusinessInterview';
import { BIActionBar } from './BIActionBar';
import { BIFillFromNoteDialog } from './BIFillFromNoteDialog';
import {
  SmartSectionContext,
  SmartSectionCompany,
  SmartSectionStrategy,
  SmartSectionValue,
  SmartSectionPersonal,
  SmartSectionFollowup,
  SectionProgressBadge,
  countFilledFields,
} from './sections';
import { CONTEXT_FIELDS } from './sections/SmartSectionContext';
import { COMPANY_FIELDS, SCALE_FIELDS } from './sections/SmartSectionCompany';
import { STRATEGY_FIELDS, NEEDS_FIELDS, INVESTMENTS_FIELDS } from './sections/SmartSectionStrategy';
import { VALUE_FIELDS, ENGAGEMENT_FIELDS } from './sections/SmartSectionValue';
import { PERSONAL_FIELDS, ORGS_FIELDS } from './sections/SmartSectionPersonal';
import { FOLLOWUP_FIELDS } from './sections/SmartSectionFollowup';
import type { BusinessInterview, SectionABasic as SectionAType, SectionCCompanyProfile as SectionCType, SectionDScale as SectionDType, SectionFStrategy as SectionFType, SectionGNeeds as SectionGType, SectionHInvestments as SectionHType, SectionJValueForCC as SectionJType, SectionKEngagement as SectionKType, SectionLPersonal as SectionLType, SectionMOrganizations as SectionMType, SectionNFollowup as SectionNType } from './types';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BITabProps {
  contactId: string;
  contactName: string;
  companyName?: string;
}

export function BITab({ contactId, contactName, companyName }: BITabProps) {
  const { data: biData, isLoading } = useBusinessInterview(contactId);
  const saveMutation = useSaveBusinessInterview();
  const processBI = useProcessBIWithAI();
  const fillFromNote = useFillBIFromNote();
  const [formData, setFormData] = useState<Partial<BusinessInterview>>({});
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [showFillFromNote, setShowFillFromNote] = useState(false);

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

  // Smart auto-open: key sections (context, strategy, followup) always open; others open if they have data
  const smartOpenSections = useMemo(() => {
    const open: string[] = ['smart-context', 'smart-strategy', 'smart-followup'];

    const companyFilled = countFilledFields(formData.section_c_company_profile as any, COMPANY_FIELDS) + countFilledFields(formData.section_d_scale as any, SCALE_FIELDS);
    if (companyFilled > 0) open.push('smart-company');

    const valueFilled = countFilledFields(formData.section_j_value_for_cc as any, VALUE_FIELDS) + countFilledFields(formData.section_k_engagement as any, ENGAGEMENT_FIELDS);
    if (valueFilled > 0) open.push('smart-value');

    const personalFilled = countFilledFields(formData.section_l_personal as any, PERSONAL_FIELDS) + countFilledFields(formData.section_m_organizations as any, ORGS_FIELDS);
    if (personalFilled > 0) open.push('smart-personal');

    return open;
  }, [formData]);

  const [openSections, setOpenSections] = useState<string[]>([]);

  // Set initial open sections once data loads
  useEffect(() => {
    setOpenSections(smartOpenSections);
  }, [smartOpenSections]);

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
      await saveMutation.mutateAsync({ contactId, data: formData, existingId: biData?.id });
      toast.success('Zapisano dane BI');
    } catch {
      toast.error('Błąd podczas zapisywania');
    }
  };

  const handleSaveAndClose = async () => {
    try {
      await saveMutation.mutateAsync({ contactId, data: formData, existingId: biData?.id });
      toast.success('Zapisano dane BI');
    } catch {
      toast.error('Błąd podczas zapisywania');
    }
  };

  const handleProcessAI = async () => {
    if (!biData?.id) { toast.error('Najpierw zapisz dane BI'); return; }
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

  const mergeBIData = (aiData: Record<string, any>) => {
    setFormData(prev => {
      const merged = { ...prev };
      for (const sectionKey of Object.keys(aiData)) {
        if (!sectionKey.startsWith('section_')) continue;
        const existing = (prev as any)[sectionKey] || {};
        const incoming = aiData[sectionKey] || {};
        const mergedSection: Record<string, any> = { ...existing };
        for (const [field, value] of Object.entries(incoming)) {
          const existingVal = existing[field];
          if (existingVal === undefined || existingVal === null || existingVal === '') {
            mergedSection[field] = value;
          } else if (Array.isArray(existingVal) && Array.isArray(value)) {
            const combined = [...existingVal, ...value.filter((v: any) => !existingVal.includes(v))];
            mergedSection[field] = combined;
          }
        }
        (merged as any)[sectionKey] = mergedSection;
      }
      return merged;
    });
    toast.success('Dane z notatki zostały zastosowane');
  };

  const handleFillFromNote = async (note: string): Promise<Record<string, any> | null> => {
    try {
      const result = await fillFromNote.mutateAsync({
        note,
        contactName,
        companyName: companyName || undefined,
        existingData: formData,
        contactId,
      });
      return result;
    } catch (error) {
      console.error('Fill from note error:', error);
      toast.error('Błąd analizy notatki');
      return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Progress counts
  const contextFilled = countFilledFields(formData.section_a_basic as any, CONTEXT_FIELDS);
  const companyFilled = countFilledFields(formData.section_c_company_profile as any, COMPANY_FIELDS) + countFilledFields(formData.section_d_scale as any, SCALE_FIELDS);
  const strategyFilled = countFilledFields(formData.section_f_strategy as any, STRATEGY_FIELDS) + countFilledFields(formData.section_g_needs as any, NEEDS_FIELDS) + countFilledFields(formData.section_h_investments as any, INVESTMENTS_FIELDS);
  const valueFilled = countFilledFields(formData.section_j_value_for_cc as any, VALUE_FIELDS) + countFilledFields(formData.section_k_engagement as any, ENGAGEMENT_FIELDS);
  const personalFilled = countFilledFields(formData.section_l_personal as any, PERSONAL_FIELDS) + countFilledFields(formData.section_m_organizations as any, ORGS_FIELDS);
  const followupFilled = countFilledFields(formData.section_n_followup as any, FOLLOWUP_FIELDS);

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
        onFillFromNote={() => setShowFillFromNote(true)}
      />

      <BIFillFromNoteDialog
        open={showFillFromNote}
        onOpenChange={setShowFillFromNote}
        onApply={mergeBIData}
        contactName={contactName}
        isProcessing={fillFromNote.isPending}
        onProcess={handleFillFromNote}
      />

      <Card>
        <CardContent className="pt-6">
          <Accordion
            type="multiple"
            value={openSections}
            onValueChange={setOpenSections}
            className="space-y-2"
          >
            {/* 1. Kontekst spotkania */}
            <AccordionItem value="smart-context" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                <span className="flex items-center">
                  1. Kontekst spotkania
                  <SectionProgressBadge filled={contextFilled} total={CONTEXT_FIELDS.length} />
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <SmartSectionContext
                  data={(formData.section_a_basic || {}) as SectionAType}
                  onChange={(data) => handleSectionChange('section_a_basic', data)}
                />
              </AccordionContent>
            </AccordionItem>

            {/* 2. Firma i skala */}
            <AccordionItem value="smart-company" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                <span className="flex items-center">
                  2. Firma i skala
                  <SectionProgressBadge filled={companyFilled} total={COMPANY_FIELDS.length + SCALE_FIELDS.length} />
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <SmartSectionCompany
                  companyData={(formData.section_c_company_profile || {}) as SectionCType}
                  scaleData={(formData.section_d_scale || {}) as SectionDType}
                  onCompanyChange={(data) => handleSectionChange('section_c_company_profile', data)}
                  onScaleChange={(data) => handleSectionChange('section_d_scale', data)}
                />
              </AccordionContent>
            </AccordionItem>

            {/* 3. Strategia i potrzeby */}
            <AccordionItem value="smart-strategy" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                <span className="flex items-center">
                  3. Strategia i potrzeby
                  <SectionProgressBadge filled={strategyFilled} total={STRATEGY_FIELDS.length + NEEDS_FIELDS.length + INVESTMENTS_FIELDS.length} />
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <SmartSectionStrategy
                  strategyData={(formData.section_f_strategy || {}) as SectionFType}
                  needsData={(formData.section_g_needs || {}) as SectionGType}
                  investmentsData={(formData.section_h_investments || {}) as SectionHType}
                  onStrategyChange={(data) => handleSectionChange('section_f_strategy', data)}
                  onNeedsChange={(data) => handleSectionChange('section_g_needs', data)}
                  onInvestmentsChange={(data) => handleSectionChange('section_h_investments', data)}
                />
              </AccordionContent>
            </AccordionItem>

            {/* 4. Wartość i zaangażowanie */}
            <AccordionItem value="smart-value" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                <span className="flex items-center">
                  4. Wartość i zaangażowanie
                  <SectionProgressBadge filled={valueFilled} total={VALUE_FIELDS.length + ENGAGEMENT_FIELDS.length} />
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <SmartSectionValue
                  valueData={(formData.section_j_value_for_cc || {}) as SectionJType}
                  engagementData={(formData.section_k_engagement || {}) as SectionKType}
                  onValueChange={(data) => handleSectionChange('section_j_value_for_cc', data)}
                  onEngagementChange={(data) => handleSectionChange('section_k_engagement', data)}
                />
              </AccordionContent>
            </AccordionItem>

            {/* 5. Sfera prywatna */}
            <AccordionItem value="smart-personal" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                <span className="flex items-center">
                  5. Sfera prywatna
                  <SectionProgressBadge filled={personalFilled} total={PERSONAL_FIELDS.length + ORGS_FIELDS.length} />
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <SmartSectionPersonal
                  personalData={(formData.section_l_personal || {}) as SectionLType}
                  orgsData={(formData.section_m_organizations || {}) as SectionMType}
                  onPersonalChange={(data) => handleSectionChange('section_l_personal', data)}
                  onOrgsChange={(data) => handleSectionChange('section_m_organizations', data)}
                />
              </AccordionContent>
            </AccordionItem>

            {/* 6. Follow-up */}
            <AccordionItem value="smart-followup" className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold">
                <span className="flex items-center">
                  6. Follow-up
                  <SectionProgressBadge filled={followupFilled} total={FOLLOWUP_FIELDS.length} />
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <SmartSectionFollowup
                  data={(formData.section_n_followup || {}) as SectionNType}
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
