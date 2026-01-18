import { useState } from 'react';
import { Link2, Building2, Plus, Users, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDomainStats, useBulkMergeByDomain } from '@/hooks/useCompanies';

interface BulkMergeDomainsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkMergeDomainsModal({ open, onOpenChange }: BulkMergeDomainsModalProps) {
  const { data: domainStats = [], isLoading: isLoadingStats } = useDomainStats();
  const bulkMerge = useBulkMergeByDomain();

  const totalContacts = domainStats.reduce((sum, d) => sum + d.count, 0);
  const domainsWithExisting = domainStats.filter(d => d.hasExistingCompany).length;
  const domainsToCreate = domainStats.filter(d => !d.hasExistingCompany && d.count >= 2).length;

  const handleMergeAll = async () => {
    await bulkMerge.mutateAsync();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Scalanie kontaktów po domenach email
          </DialogTitle>
          <DialogDescription>
            Automatycznie przypisz kontakty do firm na podstawie domeny email
          </DialogDescription>
        </DialogHeader>

        {isLoadingStats ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : domainStats.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Brak kontaktów do scalenia. Wszystkie kontakty są już przypisane do firm.
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold">{totalContacts}</div>
                <div className="text-sm text-muted-foreground">Kontaktów do przypisania</div>
              </div>
              <div className="bg-green-500/10 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{domainsWithExisting}</div>
                <div className="text-sm text-muted-foreground">Do istniejących firm</div>
              </div>
              <div className="bg-amber-500/10 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-amber-600">{domainsToCreate}</div>
                <div className="text-sm text-muted-foreground">Nowych firm do utworzenia</div>
              </div>
            </div>

            {/* Domain List */}
            <ScrollArea className="h-[300px] border rounded-lg">
              <div className="p-2 space-y-1">
                {domainStats.map((stat) => (
                  <div
                    key={stat.domain}
                    className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {stat.hasExistingCompany ? (
                        <Building2 className="h-4 w-4 text-green-600" />
                      ) : stat.count >= 2 ? (
                        <Plus className="h-4 w-4 text-amber-600" />
                      ) : (
                        <Users className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-medium">@{stat.domain}</div>
                        <div className="text-xs text-muted-foreground">
                          {stat.sampleContacts.join(', ')}
                          {stat.count > 3 && ` +${stat.count - 3} więcej`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {stat.hasExistingCompany ? (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-700">
                          → {stat.existingCompanyName}
                        </Badge>
                      ) : stat.count >= 2 ? (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-700">
                          Nowa firma
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Pominie (1 kontakt)
                        </Badge>
                      )}
                      <Badge variant="outline">{stat.count}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Anuluj
              </Button>
              <Button
                onClick={handleMergeAll}
                disabled={bulkMerge.isPending}
                className="gap-2"
              >
                {bulkMerge.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                Scal wszystkie ({totalContacts} kontaktów)
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
