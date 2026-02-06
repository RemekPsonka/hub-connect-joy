import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useCompany } from '@/hooks/useCompanies';
import { CompanyProfileHeader } from '@/components/companies/CompanyProfileHeader';
import { CompanyFlatTabs } from '@/components/company/CompanyFlatTabs';
import { CompanyRegistryCard } from '@/components/companies/CompanyRegistryCard';
import { CompanyContactsMini } from '@/components/companies/CompanyContactsMini';
import { CompanyQuickStats } from '@/components/companies/CompanyQuickStats';
import { CompanyNotesPanel } from '@/components/companies/CompanyNotesPanel';

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: company, isLoading, error } = useCompany(id);

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
    </div>
  );
}
