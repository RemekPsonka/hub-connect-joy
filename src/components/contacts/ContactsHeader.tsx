import { useState, useEffect } from 'react';
import { Search, Plus, Filter, Building2, Users, Link2, GitMerge, GitBranchPlus } from 'lucide-react';
import { AIImportContactsModal } from './AIImportContactsModal';
import { ColumnConfigPopover } from './ColumnConfigPopover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useContactGroups } from '@/hooks/useContacts';
import { useCompaniesList } from '@/hooks/useCompanies';
import { useDealTeams } from '@/hooks/useDealTeams';
import type { ContactsTableColumns, ContactsTableFilters } from '@/hooks/useContactsTableSettings';

export type ViewMode = 'people' | 'companies';

const DEAL_CATEGORIES = [
  { value: 'cold', label: 'COLD' },
  { value: 'lead', label: 'LEAD' },
  { value: 'top', label: 'TOP' },
  { value: 'hot', label: 'HOT' },
  { value: 'client', label: 'CLIENT' },
];

const AI_PROFILE_OPTIONS = [
  { value: 'generated', label: 'Wygenerowano' },
  { value: 'missing', label: 'Brak profilu' },
];

interface ContactsHeaderProps {
  totalCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  filters: ContactsTableFilters;
  onFiltersChange: (filters: Partial<ContactsTableFilters>) => void;
  columns: ContactsTableColumns;
  onColumnsChange: (columns: Partial<ContactsTableColumns>) => void;
  onImportSuccess?: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onBulkMergeByDomain?: () => void;
  onFindDuplicates?: () => void;
}

export function ContactsHeader({
  totalCount,
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  columns,
  onColumnsChange,
  onImportSuccess,
  viewMode,
  onViewModeChange,
  onBulkMergeByDomain,
  onFindDuplicates,
}: ContactsHeaderProps) {
  const { data: groups = [] } = useContactGroups();
  const { data: companies = [] } = useCompaniesList();
  const { data: dealTeams = [] } = useDealTeams();
  const [searchInput, setSearchInput] = useState(search);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchInput);
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Kontakty</h1>
          <Badge variant="secondary" className="text-sm">
            {totalCount}
          </Badge>
        </div>
        <div className="flex gap-2">
          {viewMode === 'people' && (
            <>
              <ColumnConfigPopover columns={columns} onToggle={onColumnsChange} />
              {onFindDuplicates && (
                <Button variant="outline" onClick={onFindDuplicates} className="gap-2">
                  <GitMerge className="h-4 w-4" />
                  <span className="hidden sm:inline">Znajdź duplikaty</span>
                </Button>
              )}
              <Button onClick={() => setIsAddContactModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Dodaj kontakt</span>
              </Button>
            </>
          )}
          {viewMode === 'companies' && onBulkMergeByDomain && (
            <Button variant="outline" onClick={onBulkMergeByDomain} className="gap-2">
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">Scal po domenach</span>
            </Button>
          )}
        </div>
      </div>

      {/* View Mode Toggle */}
      <Tabs value={viewMode} onValueChange={(v) => onViewModeChange(v as ViewMode)}>
        <TabsList>
          <TabsTrigger value="people" className="gap-2">
            <Users className="h-4 w-4" />
            Osoby
          </TabsTrigger>
          <TabsTrigger value="companies" className="gap-2">
            <Building2 className="h-4 w-4" />
            Firmy
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={viewMode === 'people' ? "Szukaj po imieniu, firmie lub email..." : "Szukaj po nazwie firmy..."}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
        {viewMode === 'people' && (
          <>
            <Select value={filters.groupId || 'all'} onValueChange={(v) => onFiltersChange({ groupId: v === 'all' ? '' : v })}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Wszystkie grupy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie grupy</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: group.color || '#6366f1' }}
                      />
                      {group.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.companyId || 'all'} onValueChange={(v) => onFiltersChange({ companyId: v === 'all' ? '' : v })}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Wszystkie firmy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie firmy</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.dealTeamId || 'all'} onValueChange={(v) => onFiltersChange({ dealTeamId: v === 'all' ? '' : v })}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <GitBranchPlus className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Wszystkie lejki" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie lejki</SelectItem>
                {dealTeams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                      {team.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.dealCategory || 'all'} onValueChange={(v) => onFiltersChange({ dealCategory: v === 'all' ? '' : v })}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Kategoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie kategorie</SelectItem>
                {DEAL_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.aiProfileStatus || 'all'} onValueChange={(v) => onFiltersChange({ aiProfileStatus: v === 'all' ? '' : v })}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Profil AI" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Profil AI: Wszystkie</SelectItem>
                {AI_PROFILE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      <AIImportContactsModal
        open={isAddContactModalOpen}
        onOpenChange={setIsAddContactModalOpen}
        onSuccess={onImportSuccess}
      />
    </div>
  );
}
