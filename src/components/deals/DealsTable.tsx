import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ArrowUpDown, TrendingUp } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DealStageBadge } from './DealStageBadge';
import { Deal } from '@/hooks/useDeals';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface DealsTableProps {
  deals: Deal[];
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
}

export function DealsTable({
  deals,
  totalCount,
  page,
  pageSize,
  onPageChange,
  isLoading,
}: DealsTableProps) {
  const navigate = useNavigate();
  const totalPages = Math.ceil(totalCount / pageSize);

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

  if (!isLoading && deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Brak deals</h3>
        <p className="text-muted-foreground">Dodaj pierwszą szansę sprzedaży, aby rozpocząć!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">
                <Button variant="ghost" size="sm" className="gap-1 -ml-3">
                  Tytuł
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Kontakt/Firma</TableHead>
              <TableHead className="text-right">Wartość</TableHead>
              <TableHead>Etap</TableHead>
              <TableHead className="text-center">Prawdopodobieństwo</TableHead>
              <TableHead>Utworzono</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.map((deal) => (
              <TableRow
                key={deal.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/deals/${deal.id}`)}
              >
                <TableCell className="font-medium">{deal.title}</TableCell>
                <TableCell className="text-muted-foreground">
                  {deal.contact?.full_name || deal.company?.name || '-'}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {deal.value.toLocaleString('pl-PL', {
                    style: 'currency',
                    currency: deal.currency,
                  })}
                </TableCell>
                <TableCell>
                  {deal.stage && (
                    <DealStageBadge
                      name={deal.stage.name}
                      color={deal.stage.color || '#6366f1'}
                    />
                  )}
                </TableCell>
                <TableCell className="text-center">{deal.probability}%</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDistanceToNow(new Date(deal.created_at), {
                    addSuffix: true,
                    locale: pl,
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-end">
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
        </div>
      )}
    </div>
  );
}
