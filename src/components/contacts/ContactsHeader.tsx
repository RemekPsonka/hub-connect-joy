import { useState, useEffect } from 'react';
import { Search, Plus, Filter, Camera, FileSpreadsheet, Building2, Users } from 'lucide-react';
import { ScanBusinessCardModal } from './ScanBusinessCardModal';
import { AIImportContactsModal } from './AIImportContactsModal';
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

export type ViewMode = 'people' | 'companies';

interface ContactsHeaderProps {
  totalCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  groupId: string;
  onGroupChange: (value: string) => void;
  companyId: string;
  onCompanyChange: (value: string) => void;
  onAddContact: () => void;
  onImportSuccess?: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ContactsHeader({
  totalCount,
  search,
  onSearchChange,
  groupId,
  onGroupChange,
  companyId,
  onCompanyChange,
  onAddContact,
  onImportSuccess,
  viewMode,
  onViewModeChange,
}: ContactsHeaderProps) {
  const { data: groups = [] } = useContactGroups();
  const { data: companies = [] } = useCompaniesList();
  const [searchInput, setSearchInput] = useState(search);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, onSearchChange]);

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
              <Button variant="outline" onClick={() => setIsImportModalOpen(true)} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline">Importuj listę</span>
              </Button>
              <Button variant="outline" onClick={() => setIsScanModalOpen(true)} className="gap-2">
                <Camera className="h-4 w-4" />
                <span className="hidden sm:inline">Skanuj</span>
              </Button>
              <Button onClick={onAddContact} className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Dodaj kontakt</span>
              </Button>
            </>
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
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
            <Select value={groupId} onValueChange={onGroupChange}>
              <SelectTrigger className="w-full sm:w-[200px]">
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
            <Select value={companyId} onValueChange={onCompanyChange}>
              <SelectTrigger className="w-full sm:w-[200px]">
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
          </>
        )}
      </div>

      <ScanBusinessCardModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
      />

      <AIImportContactsModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onSuccess={onImportSuccess}
      />
    </div>
  );
}
