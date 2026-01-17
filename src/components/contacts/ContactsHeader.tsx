import { useState, useEffect } from 'react';
import { Search, Plus, Filter, Camera } from 'lucide-react';
import { ScanBusinessCardModal } from './ScanBusinessCardModal';
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
import { useContactGroups } from '@/hooks/useContacts';

interface ContactsHeaderProps {
  totalCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  groupId: string;
  onGroupChange: (value: string) => void;
  onAddContact: () => void;
}

export function ContactsHeader({
  totalCount,
  search,
  onSearchChange,
  groupId,
  onGroupChange,
  onAddContact,
}: ContactsHeaderProps) {
  const { data: groups = [] } = useContactGroups();
  const [searchInput, setSearchInput] = useState(search);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

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
          <Button variant="outline" onClick={() => setIsScanModalOpen(true)} className="gap-2">
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Skanuj wizytówkę</span>
          </Button>
          <Button onClick={onAddContact} className="gap-2">
            <Plus className="h-4 w-4" />
            Dodaj kontakt
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj po imieniu, firmie lub email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
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
      </div>

      <ScanBusinessCardModal 
        isOpen={isScanModalOpen} 
        onClose={() => setIsScanModalOpen(false)} 
      />
    </div>
  );
}
