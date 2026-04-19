import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Share2 } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCompany, useCompanyContacts } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';
import { useSGUTeamId } from '@/hooks/useSGUTeamId';
import { CompanyProfileHeader } from '@/components/companies/CompanyProfileHeader';
import { CompanyFlatTabs } from '@/components/company/CompanyFlatTabs';
import { CompanyRegistryCard } from '@/components/companies/CompanyRegistryCard';
import { CompanyContactsMini } from '@/components/companies/CompanyContactsMini';
import { CompanyQuickStats } from '@/components/companies/CompanyQuickStats';
import { CompanyNotesPanel } from '@/components/companies/CompanyNotesPanel';
import { PushToSGUDialog } from '@/components/sgu/PushToSGUDialog';
import {
  PushCompanyContactDialog,
  type CompanyContactOption,
} from '@/components/sgu/PushCompanyContactDialog';

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: company, isLoading, error } = useCompany(id);
  const { director } = useAuth();
  const { sguTeamId } = useSGUTeamId();
  const { data: companyContacts = [] } = useCompanyContacts(id);

  const [isPushSingleOpen, setIsPushSingleOpen] = useState(false);
  const [isPushMultiOpen, setIsPushMultiOpen] = useState(false);

  const canPushToSGU = director !== null && !!sguTeamId;

  const contactOptions: CompanyContactOption[] = useMemo(
    () =>
      (companyContacts ?? []).map((c) => ({
        id: c.id,
        full_name: c.full_name,
        position: c.position,
        email: c.email,
      })),
    [companyContacts]
  );

  const handlePushClick = () => {
    if (contactOptions.length === 1) {
      setIsPushSingleOpen(true);
    } else if (contactOptions.length > 1) {
      setIsPushMultiOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-muted-foreground">Firma nie została znaleziona</p>
        <a href="/contacts?tab=companies" className="text-primary hover:underline">
          Powrót do listy firm
        </a>
      </div>
    );
  }

  const pushButtonDisabled = contactOptions.length === 0;
  const pushButton = (
    <Button
      variant="outline"
      size="sm"
      onClick={handlePushClick}
      disabled={pushButtonDisabled}
      className="gap-2"
    >
      <Share2 className="h-4 w-4" />
      Przekaż do SGU
    </Button>
  );

  return (
    <div className="container max-w-7xl py-6 space-y-6">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/contacts?tab=companies">Firmy</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{company.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <CompanyProfileHeader company={company} />

      {canPushToSGU && (
        <div className="flex justify-end -mt-2">
          {pushButtonDisabled ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>{pushButton}</span>
                </TooltipTrigger>
                <TooltipContent>Firma nie ma kontaktów do przekazania</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            pushButton
          )}
        </div>
      )}

      {/* SPLIT VIEW */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT COLUMN — tabs with all content */}
        <div className="flex-1 lg:w-[65%] min-w-0">
          <CompanyFlatTabs company={company} />
        </div>

        {/* RIGHT COLUMN — sticky sidebar */}
        <aside className="lg:w-[35%] space-y-4 lg:sticky lg:top-4 lg:self-start">
          <CompanyRegistryCard company={company} />
          <CompanyContactsMini companyId={company.id} />
          <CompanyQuickStats company={company} />
          <CompanyNotesPanel company={company} />
        </aside>
      </div>

      {canPushToSGU && contactOptions.length === 1 && (
        <PushToSGUDialog
          contactId={contactOptions[0].id}
          contactName={contactOptions[0].full_name}
          open={isPushSingleOpen}
          onOpenChange={setIsPushSingleOpen}
        />
      )}

      {canPushToSGU && contactOptions.length > 1 && (
        <PushCompanyContactDialog
          companyName={company.name}
          contacts={contactOptions}
          open={isPushMultiOpen}
          onOpenChange={setIsPushMultiOpen}
        />
      )}
    </div>
  );
}
