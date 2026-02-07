import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, Building2, Phone, Sparkles, Loader2, User } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button } from '@/components/ui/button';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRegenerateCompanyAI, type CompanyWithTopContact } from '@/hooks/useCompanies';
import { usePreloadLogos } from '@/hooks/useCompanyLogo';

const ROW_HEIGHT = 56;
const COMPANIES_MIN_WIDTH = 960;

interface CompaniesTableProps {
  companies: CompanyWithTopContact[];
  totalCount: number;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  isLoading: boolean;
}

export function CompaniesTable({
  companies,
  totalCount,
  page,
  pageSize,
  sortBy,
  sortOrder,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  isLoading,
}: CompaniesTableProps) {
  const navigate = useNavigate();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const regenerateAI = useRegenerateCompanyAI();

  usePreloadLogos(companies);

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: companies.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      onSortChange(column, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(column, 'asc');
    }
  };

  const handleGenerateAI = async (e: React.MouseEvent, company: CompanyWithTopContact) => {
    e.stopPropagation();
    setGeneratingId(company.id);
    try {
      await regenerateAI.mutateAsync({
        id: company.id,
        companyName: company.name,
        website: company.website,
        industryHint: company.industry,
      });
    } finally {
      setGeneratingId(null);
    }
  };

  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const delta = 2;

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    pages.push(1);

    if (page > 3 + delta) {
      pages.push('ellipsis');
    }

    const start = Math.max(2, page - delta);
    const end = Math.min(totalPages - 1, page + delta);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (page < totalPages - 2 - delta) {
      pages.push('ellipsis');
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  if (!isLoading && companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Brak firm</h3>
        <p className="text-muted-foreground">Firmy są tworzone automatycznie podczas dodawania kontaktów.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: COMPANIES_MIN_WIDTH }}>
            {/* Header */}
            <div className="flex items-center border-b bg-muted/50 h-12 text-sm font-medium text-muted-foreground">
              <div className="px-4 w-[220px] flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 -ml-3"
                  onClick={() => handleSort('name')}
                >
                  Nazwa firmy
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>
              <div className="px-4 w-[120px] flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 -ml-3"
                  onClick={() => handleSort('city')}
                >
                  Miasto
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>
              <div className="px-4 w-[140px] flex-shrink-0">NIP</div>
              <div className="px-4 w-[200px] flex-shrink-0">Osoba kluczowa</div>
              <div className="px-4 w-[140px] flex-shrink-0">Telefon</div>
              <div className="px-4 w-[140px] flex-shrink-0">Profil AI</div>
            </div>

            {/* Virtualized Body */}
            <div
              ref={parentRef}
              className="overflow-y-auto"
              style={{ maxHeight: 'calc(100vh - 350px)' }}
            >
              <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const company = companies[virtualItem.index];
                  return (
                    <div
                      key={company.id}
                      className="flex items-center border-b cursor-pointer hover:bg-muted/50 absolute w-full transition-colors"
                      style={{
                        height: ROW_HEIGHT,
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                      onClick={() => {
                        if (company.top_contact?.id) {
                          navigate(`/contacts/${company.top_contact.id}`);
                        }
                      }}
                    >
                      <div className="px-4 w-[220px] flex-shrink-0">
                        <div className="flex items-center gap-3">
                          <CompanyLogo companyName={company.name} website={company.website} size="md" />
                          <span className="font-medium truncate">{company.name}</span>
                        </div>
                      </div>
                      <div className="px-4 w-[120px] flex-shrink-0 text-muted-foreground">{company.city || '-'}</div>
                      <div className="px-4 w-[140px] flex-shrink-0 text-muted-foreground font-mono text-sm">
                        {company.nip || '-'}
                      </div>
                      <div className="px-4 w-[200px] flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {company.top_contact ? (
                          <button
                            onClick={() => navigate(`/contacts/${company.top_contact!.id}`)}
                            className="text-left hover:underline"
                          >
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <div>
                                <div className="font-medium text-foreground truncate">{company.top_contact.full_name}</div>
                                {company.top_contact.position && (
                                  <div className="text-xs text-muted-foreground truncate">{company.top_contact.position}</div>
                                )}
                              </div>
                            </div>
                          </button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                      <div className="px-4 w-[140px] flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {company.phone ? (
                          <a
                            href={`tel:${company.phone}`}
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <Phone className="h-3 w-3" />
                            {company.phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                      <div className="px-4 w-[140px] flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={generatingId === company.id}
                          onClick={(e) => handleGenerateAI(e, company)}
                          className="gap-1"
                        >
                          {generatingId === company.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Sparkles className="h-3 w-3" />
                          )}
                          Generuj AI
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Na stronie:</span>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground ml-4">
            Łącznie: {totalCount} firm
          </span>
        </div>

        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => page > 1 && onPageChange(page - 1)}
                  className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {getPageNumbers().map((pageNum, index) =>
                pageNum === 'ellipsis' ? (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => onPageChange(pageNum)}
                      isActive={page === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  onClick={() => page < totalPages && onPageChange(page + 1)}
                  className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}
